import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import type { RummyTableActions } from '@/hooks/useRummyTable'
import type { HandOrder } from '../rules'
import type { Card, RummyGameEnded, RummyLastMove, RummyPlayer, RummyView } from '../wire'
import {
  arrangedMeld,
  canDiscard,
  deadwood,
  describeEnding,
  describeLastMove,
  enteredSince,
  face,
  headlineOf,
  meldsFitting,
  seatOf,
  sortHand
} from '../rules'
import { CardBack, CardFace } from '@/apps/castle/components/Cards'
import { clockOf, fromViewer } from '@/apps/castle/seating'
import felt from '@/apps/castle/components/CastleTable.module.css'
import styles from './RummyTable.module.css'

// The rummy table from the viewer's chair, seen from above, on castle's
// felt: the viewer at 6 o'clock with their moves under their hand, the
// others around the ring in turn order. The middle is the stock, the
// discard pile and the melds everyone lays off onto.
//
// A turn reads as three steps, and the table only ever lights up the one
// the viewer is on: the two piles while there is a card to draw; then the
// hand, with the meld and discard buttons beneath it and every meld a
// picked card would grow lit as a place to lay it. Every rule offered is
// the engine's too — the hub refuses in band and the lobby says why.

export interface RummyTableProps {
  playerId: string
  connected: boolean
  view: RummyView
  table: RummyTableActions & { ended: RummyGameEnded | null; selected: string[]; order: HandOrder; opening: boolean }
  children?: ReactNode
}

// Another seat's hand is backs: past this many, the count says the rest.
const SHOWN_BACKS = 7
// The fan spans at most this many degrees, however many cards.
const FAN_SPREAD = 24
const FAN_STEP = 4

// The key that restarts the last-move moment when a new one lands. A view
// repeats the last move until the next replaces it.
const moveSignature = (move: RummyLastMove): string => `${move.playerId}:${move.move}:${move.cards.map(face).join(',')}:${move.meldIndex ?? ''}`

const RummyTable = ({ playerId, connected, view, table, children }: RummyTableProps) => {
  const { ended, opening, selected, order } = table
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  const [endingRead, setEndingRead] = useState<string | null>(null)
  const [faded, setFaded] = useState<string | null>(null)
  const playAgainRef = useRef<HTMLButtonElement>(null)
  const endingRef = useRef<HTMLDivElement>(null)

  const me = seatOf(view, playerId)
  const myHand = sortHand(me?.hand ?? [], order)
  const myTurn = view.phase === 'playing' && view.currentPlayerId === playerId
  const drawing = myTurn && view.stage === 'draw'
  const laying = myTurn && view.stage === 'play'

  // Cards that just entered the viewer's hand slide in, so a draw reads
  // as the card arriving. A new table's deal is not an arrival.
  const handSig = `${view.gameId}:${myHand.map(face).join(',')}`
  const [handMark, setHandMark] = useState<{ sig: string; faces: string[]; entered: number[]; gen: number }>({
    sig: '',
    faces: [],
    entered: [],
    gen: 0
  })
  if (handMark.sig !== handSig) {
    setHandMark({
      sig: handSig,
      faces: myHand.map(face),
      entered: handMark.sig.startsWith(`${view.gameId}:`) ? enteredSince(handMark.faces, myHand) : [],
      gen: handMark.gen + 1
    })
  }

  const picked = selected.map(f => myHand.find(card => face(card) === f)).filter((card): card is Card => card !== undefined)
  const meld = laying && picked.length >= 3 ? arrangedMeld(picked) : null
  const single = laying && picked.length === 1 ? picked[0] : null
  const fitting = single === null ? [] : meldsFitting(view.melds, single)
  const discardable = single !== null && canDiscard(view, myHand, single)

  // A move takes the button that made it away — the picked card, the lit
  // meld, the draw that becomes a disabled Meld — so focus goes to the hand,
  // which is where the next move is picked.
  const handRef = useRef<HTMLDivElement>(null)
  const thenHand = (move: () => void) => () => {
    move()
    handRef.current?.focus()
  }

  const showEnding = view.phase === 'ended' && ended !== null && endingRead !== view.gameId
  const keepFocusIn = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusable = endingRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')
    if (focusable === undefined || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  const dismissEnding = () => {
    setEndingRead(view.gameId)
    headingRef.current?.focus()
  }
  useEffect(() => {
    if (showEnding) playAgainRef.current?.focus()
  }, [showEnding])

  const moment = view.lastMove !== undefined && `${view.gameId}:${moveSignature(view.lastMove)}` !== faded ? view.lastMove : undefined

  const hint = (() => {
    if (view.phase === 'waiting') return view.players.length < 2 ? 'Waiting for a second seat.' : ''
    if (drawing) {
      if (view.discardTop === undefined) return 'Draw from the stock.'
      return view.canDrawStock ? `Draw from the stock, or take the ${face(view.discardTop)}.` : `The stock is out: take the ${face(view.discardTop)}.`
    }
    if (laying) {
      if (single !== null && fitting.length > 0) return `Tap a lit meld to lay off ${face(single)}, or discard it.`
      if (picked.length === 2) return 'Pick three or more to meld, or one to lay off or discard.'
      if (picked.length >= 3 && meld === null) return 'Those cards are not a set or a run.'
      if (view.takenDiscard !== undefined) return `Meld or lay off if you can, then discard — not the ${face(view.takenDiscard)} you just took.`
      return 'Meld or lay off if you can, then discard to end your turn.'
    }
    if (view.phase === 'playing' && view.currentPlayerId !== undefined) {
      return `Waiting for ${view.currentPlayerId} to ${view.stage === 'draw' ? 'draw' : 'play'}.`
    }
    return ''
  })()

  const status = (
    <div className={felt.status}>
      <p className={felt.srOnly} role="status">
        {myTurn ? 'Your turn' : ''}
      </p>
      <p className={felt.hint} role="status">
        {hint}
      </p>
      <p className={felt.lastPlaySlot} role="status">
        {moment !== undefined && (
          <span
            key={moveSignature(moment)}
            className={felt.lastPlay}
            onAnimationEnd={() => setFaded(`${view.gameId}:${moveSignature(moment)}`)}
          >
            {describeLastMove(moment, playerId)}
          </span>
        )}
      </p>
    </div>
  )

  const actions = (() => {
    if (view.phase === 'waiting') {
      return (
        <button type="button" className={felt.primary} onClick={table.startTable} disabled={view.players.length < 2 || !connected}>
          Deal
        </button>
      )
    }
    if (drawing) {
      return (
        <>
          <button type="button" className={felt.primary} onClick={thenHand(table.drawStock)} disabled={!view.canDrawStock || !connected}>
            Draw from the stock
          </button>
          <button type="button" className={felt.secondary} onClick={thenHand(table.drawDiscard)} disabled={view.discardTop === undefined || !connected}>
            {view.discardTop === undefined ? 'Discard pile empty' : `Take ${face(view.discardTop)}`}
          </button>
        </>
      )
    }
    if (laying) {
      return (
        <>
          <button type="button" className={felt.primary} onClick={thenHand(table.meldSelected)} disabled={meld === null || !connected}>
            {meld === null ? 'Meld' : `Meld ${meld.map(face).join(' ')}`}
          </button>
          <button type="button" className={felt.secondary} onClick={thenHand(table.discardSelected)} disabled={!discardable || !connected}>
            {single === null ? 'Discard' : `Discard ${face(single)}`}
          </button>
          {single !== null && !discardable && (
            <p className={felt.muted}>You just took {face(single)}: it can’t go straight back.</p>
          )}
        </>
      )
    }
    if (view.phase === 'ended' && !showEnding) {
      return (
        <>
          {ended !== null && (
            <button type="button" className={felt.primary} onClick={table.playAgain} disabled={!connected || opening}>
              {opening ? 'Opening…' : 'Play again'}
            </button>
          )}
          <button type="button" className={felt.secondary} onClick={table.leaveTable}>
            Back to the room
          </button>
        </>
      )
    }
    return null
  })()

  const renderSeat = (seat: RummyPlayer, clock: number) => {
    const mine = seat.playerId === playerId
    const onTurn = view.phase === 'playing' && view.currentPlayerId === seat.playerId
    const label = mine ? `${seat.playerId} (you)` : seat.playerId
    const whose = mine ? 'Your' : `${seat.playerId}'s`
    const hand = mine ? myHand : seat.hand
    const shown: (Card | null)[] = hand.length > 0 ? hand : Array.from({ length: Math.min(seat.handCount, SHOWN_BACKS) }, () => null)
    const step = Math.min(FAN_STEP, FAN_SPREAD / Math.max(shown.length, 1))
    return (
      <section
        key={seat.playerId}
        className={`${felt.seat} ${mine ? felt.mine : ''} ${onTurn ? felt.onTurn : ''}`}
        data-clock={clock}
        aria-label={`${label}${onTurn ? (view.stage === 'draw' ? ', to draw' : ', to play') : ''}`}
      >
        <h3 className={felt.seatName}>
          {label}
          {onTurn && <span className={felt.turn}> · {view.stage === 'draw' ? 'to draw' : 'to play'}</span>}
          {!mine && (
            <span className={`${felt.handCount} ${seat.handCount > SHOWN_BACKS ? felt.handCountShown : ''}`}> · {seat.handCount} in hand</span>
          )}
          {view.phase === 'ended' && <span className={felt.muted}> · {deadwood(seat.hand)} pts left</span>}
        </h3>
        <div className={felt.seatFrame}>
          <div className={felt.seatCards}>
            <div
              className={`${felt.hand} ${styles.hand}`}
              ref={mine ? handRef : undefined}
              tabIndex={mine ? -1 : undefined}
              role="group"
              aria-label={`${whose} hand`}
              style={{ '--overlap': `${Math.min(2, 1 + Math.max(0, shown.length - 6) * 0.15)}rem` } as CSSProperties}
            >
              <div className={felt.fan}>
                {shown.map((card, i, all) => {
                  const angle = (i - (all.length - 1) / 2) * step
                  const entered = mine && handMark.entered.includes(i)
                  const taken = card !== null && laying && mine && view.takenDiscard !== undefined && face(view.takenDiscard) === face(card)
                  // A card that would grow a meld on the table is marked
                  // before it is picked, so a lay-off is seen, not guessed.
                  const laysOff = card !== null && laying && mine && meldsFitting(view.melds, card).length > 0
                  const notes = [taken ? 'just taken' : '', laysOff ? 'fits a meld' : ''].filter(Boolean)
                  return (
                    <span
                      key={mine && card !== null ? `${face(card)}:${entered ? handMark.gen : 0}` : i}
                      className={felt.fanSlot}
                      style={{ transform: `rotate(${angle}deg) translateY(${Math.abs(angle) * 0.35}px)` }}
                    >
                      {card === null ? (
                        <CardBack label="hand card" />
                      ) : (
                        <CardFace
                          card={card}
                          className={`${entered ? felt.entered : ''} ${taken ? styles.taken : ''} ${laysOff ? styles.laysOff : ''}`}
                          style={entered ? ({ '--i': handMark.entered.indexOf(i) } as CSSProperties) : undefined}
                          label={notes.length > 0 ? [face(card), ...notes].join(', ') : undefined}
                          toggle={mine && laying ? selected.includes(face(card)) : undefined}
                          onClick={mine && laying && connected ? () => table.toggleCard(card) : undefined}
                        />
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        {mine && view.phase !== 'waiting' && (
          <div className={styles.handTools}>
            <span className={felt.muted} title="What your hand would cost you if someone went out now">
              {deadwood(myHand)} pts in hand
            </span>
            <span role="group" aria-label="Sort your hand" className={styles.sort}>
              {(['suit', 'rank'] as const).map(by => (
                <button key={by} type="button" className={styles.sortButton} aria-pressed={order === by} onClick={() => table.setOrder(by)}>
                  by {by}
                </button>
              ))}
            </span>
          </div>
        )}
        {mine && <div className={felt.actions}>{actions}</div>}
      </section>
    )
  }

  return (
    <div className={felt.table} data-phase={view.phase}>
      <div className={felt.tableHeader}>
        <h1 ref={headingRef} tabIndex={-1} className={felt.title}>
          Rummy · {view.gameId}
        </h1>
        {status}
        {view.phase !== 'ended' && (
          <button type="button" className={felt.link} onClick={table.leaveTable} disabled={!connected}>
            Leave table
          </button>
        )}
      </div>
      <p className={felt.ending} role="status">
        {view.phase === 'ended' && ended !== null ? describeEnding(ended, playerId) : ''}
      </p>
      {showEnding &&
        ended !== null &&
        createPortal(
          <div
            ref={endingRef}
            className={felt.endingOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rummy-ending"
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault()
                dismissEnding()
              }
              keepFocusIn(event)
            }}
          >
            <div className={felt.endingCard}>
              <div className={felt.endingEmoji}>{ended.winner === playerId ? '🏆' : ended.winner === undefined ? '🤝' : '🃏'}</div>
              <h2 id="rummy-ending" className={felt.endingTitle}>
                {headlineOf(ended, playerId)}
              </h2>
              <p className={felt.endingLine}>{describeEnding(ended, playerId)}</p>
              {ended.scores.length > 0 && (
                <table className={styles.scores}>
                  <caption className={felt.srOnly}>Points left in hand</caption>
                  <tbody>
                    {ended.scores.map(score => (
                      <tr key={score.playerId} className={score.playerId === ended.winner ? styles.winnerRow : ''}>
                        <th scope="row">{score.playerId === playerId ? 'You' : score.playerId}</th>
                        <td>{score.playerId === ended.winner ? `wins ${ended.points} pts` : `${score.deadwood} pts left`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className={felt.endingButtons}>
                <button ref={playAgainRef} type="button" className={felt.primary} onClick={table.playAgain} disabled={!connected || opening}>
                  {opening ? 'Opening…' : 'Play again'}
                </button>
                <button type="button" className={felt.secondary} onClick={table.leaveTable}>
                  Back to the room
                </button>
              </div>
              <button type="button" className={felt.link} onClick={dismissEnding}>
                See the final hands
              </button>
            </div>
          </div>,
          document.body
        )}
      <div className={felt.ring}>
        {fromViewer(view.players, playerId).map((seat, i, all) => renderSeat(seat, clockOf(all.length, i)))}
        {(view.phase === 'playing' || view.phase === 'ended') && (
          <section className={`${felt.pile} ${styles.middle}`} aria-label="table">
            <div className={felt.piles}>
              <div className={`${felt.drawPile} ${view.stockCount === 0 ? felt.drawn : ''}`}>
                {drawing && view.canDrawStock ? (
                  <button
                    type="button"
                    className={`${felt.card} ${felt.back} ${styles.drawable}`}
                    onClick={thenHand(table.drawStock)}
                    disabled={!connected}
                    aria-label={`draw from the stock, ${view.stockCount} left`}
                  />
                ) : (
                  <span className={`${felt.card} ${felt.back}`} role="img" aria-label={`stock, ${view.stockCount} left`} />
                )}
                <span className={felt.count}>{view.stockCount}</span>
              </div>
              <div className={felt.pileCards}>
                {view.discardTop === undefined ? (
                  <div className={felt.emptyPile}>discard</div>
                ) : (
                  <CardFace
                    card={view.discardTop}
                    className={drawing ? styles.drawable : ''}
                    label={drawing ? `take ${face(view.discardTop)} from the discard pile` : `${face(view.discardTop)} on the discard pile`}
                    onClick={drawing && connected ? thenHand(table.drawDiscard) : undefined}
                  />
                )}
                {view.discardCount > 0 && <span className={felt.count}>{view.discardCount}</span>}
              </div>
            </div>
            <div className={styles.melds} role="group" aria-label="melds">
              {view.melds.length === 0 ? (
                <p className={`${felt.muted} ${styles.noMelds}`}>No melds yet</p>
              ) : (
                view.melds.map((tableMeld, m) => {
                  const fits = fitting.includes(m)
                  const cards = (
                    <>
                      <span className={styles.meldCards}>
                        {tableMeld.cards.map((card, i) => (
                          <span key={face(card)} className={styles.meldSlot} style={{ zIndex: i }}>
                            <CardFace card={card} />
                          </span>
                        ))}
                      </span>
                      {/* Who laid it: a lay-off can go on anyone's, but at three
                          or four seats it helps to know whose run is whose. */}
                      <span className={styles.meldOwner} aria-hidden="true">
                        {tableMeld.owner === playerId ? 'you' : tableMeld.owner}
                      </span>
                    </>
                  )
                  const lastLaid = view.lastMove?.meldIndex === m && moment !== undefined
                  const classes = `${styles.meld} ${fits ? styles.fits : ''} ${lastLaid ? styles.justLaid : ''}`
                  const named = `${tableMeld.cards.map(face).join(' ')}, ${tableMeld.owner === playerId ? 'yours' : `${tableMeld.owner}'s`}`
                  return fits && single !== null ? (
                    <button
                      key={m}
                      type="button"
                      className={classes}
                      onClick={thenHand(() => table.layOffSelected(m))}
                      disabled={!connected}
                      aria-label={`lay off ${face(single)} on ${named}`}
                    >
                      {cards}
                    </button>
                  ) : (
                    <span key={m} className={classes} role="img" aria-label={named}>
                      {cards}
                    </span>
                  )
                })
              )}
            </div>
          </section>
        )}
      </div>
      {children}
    </div>
  )
}

export default RummyTable
