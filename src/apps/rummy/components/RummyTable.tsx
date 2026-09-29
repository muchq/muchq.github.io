import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import type { RummyTableActions } from '@/hooks/useRummyTable'
import type { HandOrder } from '../rules'
import type { Card, RummyGameEnded, RummyLastMove, RummyPlayer, RummyView } from '../wire'
import {
  arrangedMeld,
  canDeal,
  canDiscard,
  deadwood,
  describeEnding,
  describeLastMove,
  describeTableEnd,
  enteredSince,
  face,
  headlineOf,
  meldsFitting,
  seatOf,
  sortHand,
  variantLabel
} from '../rules'
import { CardBack, CardFace } from '@/apps/castle/components/Cards'
import { clockOf, fromViewer } from '@/apps/castle/seating'
import felt from '@/apps/castle/components/CastleTable.module.css'
import styles from './RummyTable.module.css'
import ScoreSheet from './ScoreSheet'

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
//
// The table is dealer's choice (MoonBase#1609): between deals the last
// deal's cards stay on the felt, face up, under a sheet with its result,
// and the dealer's pick — one list, one Deal button — deals the next.
// Gin (#1610) plays on the same felt: an upcard to take or pass, no
// melding, and a knock where rummy would meld; the hub arranges both
// hands at the end and the sheet lays them out. The table itself ends only when
// too few seats are left, with the hands each seat won.

export interface RummyTableProps {
  playerId: string
  connected: boolean
  view: RummyView
  table: RummyTableActions & { ended: RummyGameEnded | null; selected: string[]; downTo: string | null; order: HandOrder; opening: boolean; dealing: boolean }
  // Seats the room shows as not connected: a dealer among them lets anyone
  // deal.
  away?: string[]
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

// What the seat on turn is about to do.
const stageWords = (stage?: RummyView['stage']) => (stage === 'upcard' ? 'take or pass' : stage === 'draw' ? 'draw' : 'play')

const RummyTable = ({ playerId, connected, view, table, away = [], children }: RummyTableProps) => {
  const { ended, opening, dealing, selected, downTo, order } = table
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  const [endingRead, setEndingRead] = useState<string | null>(null)
  const [dealRead, setDealRead] = useState<string | null>(null)
  const [faded, setFaded] = useState<string | null>(null)
  // The game picked in the list, for the deal it was picked for.
  const [picking, setPicking] = useState<{ deal: string; variant: string } | null>(null)
  const playAgainRef = useRef<HTMLButtonElement>(null)
  const endingRef = useRef<HTMLDivElement>(null)

  const me = seatOf(view, playerId)
  const myHand = sortHand(me?.hand ?? [], order)
  const myTurn = view.phase === 'playing' && view.currentPlayerId === playerId
  const gin = view.variant === 'gin'
  const upcard = myTurn && view.stage === 'upcard'
  const drawing = myTurn && view.stage === 'draw'
  const laying = myTurn && view.stage === 'play'
  const between = view.phase === 'choosing'
  const dealer = view.choosing?.dealer
  const mayDeal = canDeal(view, playerId, away)
  // Once a deal is over every hand is face up, and stays so between deals.
  const handsShown = view.lastDeal !== undefined && view.phase !== 'playing'
  // Before the first deal a seat is a name: there are no cards to count.
  const dealt = view.dealNumber > 0
  const wonBy = (id: string) => view.standings.find(standing => standing.playerId === id)?.handsWon ?? 0

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

  // A take-down in the making: on the draw, a card deeper in the pile
  // picked to take it down to, played at once from the hand's cards.
  const downToCard = drawing && !gin && downTo !== null ? ((view.discardPile ?? []).slice(0, -1).find(card => face(card) === downTo) ?? null) : null
  const handPickable = laying || downToCard !== null
  const picked = selected.map(f => myHand.find(card => face(card) === f)).filter((card): card is Card => card !== undefined)
  const meld = laying && picked.length >= 3 ? arrangedMeld(picked) : null
  const downMeld = downToCard !== null && picked.length >= 2 ? arrangedMeld([...picked, downToCard]) : null
  const single = laying && picked.length === 1 ? picked[0] : null
  // The card a tap on a lit meld lays off: the one picked, or the pile
  // card being taken down to.
  const layingOff = single ?? (downToCard !== null && picked.length === 0 ? downToCard : null)
  const fitting = layingOff === null ? [] : meldsFitting(view.melds, layingOff)
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
  const dealKey = `${view.gameId}:${view.dealNumber}`
  const lastDeal = view.lastDeal
  const showDealEnd = between && lastDeal !== undefined && dealRead !== dealKey
  const keepFocusIn = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusable = endingRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)')
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
    if (showDealEnd) setDealRead(dealKey)
    else setEndingRead(view.gameId)
    headingRef.current?.focus()
  }
  useEffect(() => {
    if (showEnding || showDealEnd) playAgainRef.current?.focus()
  }, [showEnding, showDealEnd])
  // The sheet follows the dealer's presence: a deal it comes to offer — the
  // dealer went away — takes focus; a button it loses — they came back —
  // leaves focus inside it, where Escape and Tab are handled.
  useEffect(() => {
    if (!showDealEnd || endingRef.current === null) return
    if (mayDeal) playAgainRef.current?.focus()
    else if (!endingRef.current.contains(document.activeElement)) {
      endingRef.current.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
    }
  }, [showDealEnd, mayDeal])
  // A deal arriving takes away whatever dealt it — the sheet, the buttons —
  // so focus goes to the hand, where the deal is played.
  const dealtBefore = useRef(view.dealNumber)
  useEffect(() => {
    if (view.dealNumber > dealtBefore.current && view.phase === 'playing') handRef.current?.focus()
    dealtBefore.current = view.dealNumber
  }, [view.dealNumber, view.phase])

  const moment = view.lastMove !== undefined && `${view.gameId}:${moveSignature(view.lastMove)}` !== faded ? view.lastMove : undefined

  // An empty stock that can still be drawn is the discard pile, turned over
  // under its top card.
  const turning = view.stockCount === 0 && view.canDrawStock
  // A hub older than gin does not say; there, the discard is drawable
  // while it has a top.
  const discardDrawable = view.canDrawDiscard ?? view.discardTop !== undefined
  const takeable = (drawing || upcard) && discardDrawable
  // Rummy lays its whole discard pile out; gin keeps it squared, top only.
  const pile = gin ? [] : (view.discardPile ?? [])
  // On the draw, any card under the top may be taken down to; which of
  // them the hand could play is the player's to see.
  const deeperPickable = drawing && pile.length > 1
  // Between deals a seat shows what the hub reckoned it held — gin's
  // deadwood after its melds — or, for a seat not in the reckoning, its cards.
  const leftIn = (seat: RummyPlayer) => lastDeal?.scores.find(score => score.playerId === seat.playerId)?.deadwood ?? deadwood(seat.hand)
  // Gin is heads-up: the defender is the seat that did not knock.
  const defenderOf = (knocker?: string) => view.players.find(seat => seat.playerId !== knocker)?.playerId

  // A pile too long for the spread scrolls; it opens on the top card, the
  // one usually taken.
  const spreadRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const spread = spreadRef.current
    if (spread !== null) spread.scrollLeft = spread.scrollWidth
  }, [pile.length])

  const hint = (() => {
    if (view.phase === 'waiting') return view.players.length < 2 ? 'Waiting for a second seat.' : ''
    if (between && dealer !== undefined) {
      if (!mayDeal) return `Waiting for ${dealer} to deal.`
      return dealer === playerId ? 'Your deal: pick the game.' : `${dealer} is away: you can deal.`
    }
    if (upcard && view.discardTop !== undefined) return `Take the ${face(view.discardTop)}, or pass.`
    if (drawing) {
      if (view.discardTop !== undefined && !discardDrawable) return 'The upcard was passed: draw from the stock.'
      if (view.discardTop === undefined) return view.canDrawStock ? 'Draw from the stock.' : 'Nothing left to draw.'
      if (downToCard !== null) {
        const bottom = face(downToCard)
        if (picked.length >= 2 && downMeld === null) return `Those cards and the ${bottom} are not a set or a run.`
        if (picked.length > 0) return `Pick cards to meld with the ${bottom}, or clear them to lay it off.`
        return `Pick cards from your hand to meld with the ${bottom}, or tap a meld to lay it off.`
      }
      const down = deeperPickable ? ', or pick a card deeper in the pile to take it down to' : ''
      if (!view.canDrawStock) return `The stock is out: take the ${face(view.discardTop)}${down}.`
      if (turning) return `The stock is out: turn the discard pile over to draw, or take the ${face(view.discardTop)}${down}.`
      if (deeperPickable) return `Draw from the stock, take the ${face(view.discardTop)}${down}.`
      return `Draw from the stock, or take the ${face(view.discardTop)}.`
    }
    if (laying && gin) {
      if (picked.length > 1) return 'Pick one card to discard or knock with.'
      return 'Discard, or knock with 10 or less deadwood left.'
    }
    if (laying) {
      if (single !== null && fitting.length > 0) return `Tap a lit meld to lay off ${face(single)}, or discard it.`
      if (picked.length >= 3 && meld === null) return 'Those cards are not a set or a run.'
      if (picked.length === 2) return 'Pick three or more to meld, or one to lay off or discard.'
      if (view.takenDiscard !== undefined) return `Meld or lay off if you can, then discard — not the ${face(view.takenDiscard)} you just took.`
      return 'Meld or lay off if you can, then discard to end your turn.'
    }
    if (view.phase === 'playing' && view.currentPlayerId !== undefined) {
      return `Waiting for ${view.currentPlayerId} to ${stageWords(view.stage)}.`
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

  // The games on offer, in the hub's order, as one list and one button:
  // the pick starts at the last deal's game, so dealing it again is a tap.
  const options = view.choosing?.options ?? []
  const choice = [picking?.deal === dealKey ? picking.variant : undefined, view.variant].find((v): v is string => v !== null && v !== undefined && options.includes(v)) ?? options[0]
  const dealButtons = (focusButton = false) =>
    choice !== undefined && (
      <>
        {options.length > 1 && (
          <select className={styles.pick} aria-label="Game" value={choice} onChange={event => setPicking({ deal: dealKey, variant: event.target.value })} disabled={dealing}>
            {options.map(variant => (
              <option key={variant} value={variant}>
                {variantLabel(variant)}
              </option>
            ))}
          </select>
        )}
        <button
          ref={focusButton ? playAgainRef : undefined}
          type="button"
          className={felt.primary}
          onClick={() => table.chooseVariant(choice)}
          disabled={!connected || dealing}
        >
          {dealing ? 'Dealing…' : `Deal ${variantLabel(choice)}`}
        </button>
      </>
    )

  const actions = (() => {
    if (view.phase === 'waiting') {
      return (
        <button type="button" className={felt.primary} onClick={table.startTable} disabled={view.players.length < 2 || !connected}>
          Start table
        </button>
      )
    }
    if (between && mayDeal && !showDealEnd) return dealButtons()
    if (upcard) {
      return (
        <>
          <button type="button" className={felt.primary} onClick={thenHand(table.drawDiscard)} disabled={!discardDrawable || !connected}>
            {view.discardTop === undefined ? 'Take the upcard' : `Take ${face(view.discardTop)}`}
          </button>
          <button type="button" className={felt.secondary} onClick={thenHand(table.pass)} disabled={!connected}>
            Pass
          </button>
        </>
      )
    }
    if (drawing && downToCard !== null) {
      return (
        <>
          <button type="button" className={felt.primary} onClick={thenHand(table.takeDownMeld)} disabled={downMeld === null || !connected}>
            {downMeld === null ? 'Take down and meld' : `Take down and meld ${downMeld.map(face).join(' ')}`}
          </button>
          <button type="button" className={felt.secondary} onClick={thenHand(() => table.pickDownTo(downToCard))} disabled={!connected}>
            {`Put the ${face(downToCard)} back`}
          </button>
        </>
      )
    }
    if (drawing) {
      return (
        <>
          <button type="button" className={felt.primary} onClick={thenHand(table.drawStock)} disabled={!view.canDrawStock || !connected}>
            {turning ? 'Turn the discard over' : 'Draw from the stock'}
          </button>
          <button type="button" className={felt.secondary} onClick={thenHand(table.drawDiscard)} disabled={!discardDrawable || !connected}>
            {view.discardTop === undefined ? 'Discard pile empty' : `Take ${face(view.discardTop)}`}
          </button>
        </>
      )
    }
    if (laying && gin) {
      return (
        <>
          <button type="button" className={felt.primary} onClick={thenHand(table.discardSelected)} disabled={!discardable || !connected}>
            {single === null ? 'Discard' : `Discard ${face(single)}`}
          </button>
          <button type="button" className={felt.secondary} onClick={thenHand(table.knockSelected)} disabled={!discardable || !connected}>
            {single === null ? 'Knock' : `Knock on ${face(single)}`}
          </button>
          {single !== null && view.takenDiscard !== undefined && face(single) === face(view.takenDiscard) && !discardable && (
            <p className={felt.muted}>You just took {face(single)}: it can’t go straight back.</p>
          )}
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
          {single !== null && view.takenDiscard !== undefined && face(single) === face(view.takenDiscard) && !discardable && (
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
        aria-label={`${label}${onTurn ? `, to ${stageWords(view.stage)}` : ''}`}
      >
        <h3 className={felt.seatName}>
          {label}
          {onTurn && <span className={felt.turn}> · to {stageWords(view.stage)}</span>}
          {!mine && dealt && !handsShown && (
            <span className={`${felt.handCount} ${seat.handCount > SHOWN_BACKS ? felt.handCountShown : ''}`}> · {seat.handCount} in hand</span>
          )}
          {dealt && <span className={felt.muted}> · {wonBy(seat.playerId)} won</span>}
          {handsShown && <span className={felt.muted}> · {leftIn(seat)} pts left</span>}
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
                  const notes = taken ? ['just taken'] : []
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
                          className={`${entered ? felt.entered : ''} ${taken ? styles.taken : ''}`}
                          style={entered ? ({ '--i': handMark.entered.indexOf(i) } as CSSProperties) : undefined}
                          label={notes.length > 0 ? [face(card), ...notes].join(', ') : undefined}
                          toggle={mine && handPickable ? selected.includes(face(card)) : undefined}
                          onClick={mine && handPickable && connected ? () => table.toggleCard(card) : undefined}
                        />
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        {mine && dealt && (
          <div className={styles.handTools}>
            <span className={felt.muted} title="What your cards count, melded or not">
              {`${deadwood(myHand)} pts in hand`}
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
    <div className={felt.table} data-phase={view.phase} data-showdown={handsShown || undefined}>
      <div className={felt.tableHeader}>
        <h1 ref={headingRef} tabIndex={-1} className={felt.title}>
          Rummy · {view.gameId}
        </h1>
        {dealt && view.variant !== undefined && (
          <p className={felt.muted}>
            Deal {view.dealNumber} · {variantLabel(view.variant)}
          </p>
        )}
        {status}
        {view.phase !== 'ended' && (
          <button type="button" className={felt.link} onClick={table.leaveTable} disabled={!connected}>
            Leave table
          </button>
        )}
      </div>
      <p className={felt.ending} role="status">
        {view.phase === 'ended' && ended !== null
          ? describeTableEnd(ended, playerId)
          : handsShown && lastDeal !== undefined && !showDealEnd
            ? describeEnding(lastDeal, playerId)
            : ''}
      </p>
      {(showDealEnd || showEnding) &&
        createPortal(
          <div
            ref={endingRef}
            className={felt.endingOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rummy-ending"
            aria-describedby={showDealEnd ? 'rummy-deal-result rummy-deal-next' : 'rummy-table-result'}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault()
                dismissEnding()
              }
              keepFocusIn(event)
            }}
          >
            {showDealEnd && lastDeal !== undefined ? (
              <div className={felt.endingCard}>
                <div className={felt.endingEmoji}>{lastDeal.winner === playerId ? '🏆' : lastDeal.winner === undefined ? '🤝' : '🃏'}</div>
                <h2 id="rummy-ending" className={felt.endingTitle}>
                  {headlineOf(lastDeal, playerId)}
                </h2>
                <p id="rummy-deal-result" className={felt.endingLine}>
                  {describeEnding(lastDeal, playerId)}
                </p>
                {lastDeal.gin !== undefined && (
                  <table className={`${styles.scores} ${styles.ginHands}`}>
                    <caption className={felt.srOnly}>Each hand, melds then deadwood</caption>
                    <tbody>
                      {lastDeal.gin.hands.map(hand => (
                        <tr key={hand.playerId} className={hand.playerId === lastDeal.winner ? styles.winnerRow : ''}>
                          <th scope="row">{hand.playerId === playerId ? 'You' : hand.playerId}</th>
                          <td>
                            {hand.melds.map(m => (
                              <Fragment key={m.map(face).join()}>
                                <span className={styles.ginMeld}>{m.map(face).join(' ')}</span>{' '}
                              </Fragment>
                            ))}
                            <span className={felt.muted}>{`${hand.deadwood.map(face).join(' ')} · ${deadwood(hand.deadwood)}`}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {lastDeal.gin !== undefined && lastDeal.gin.laidOff.length > 0 && (
                  <p className={felt.endingLine}>
                    {`${defenderOf(lastDeal.gin.knocker) === playerId ? 'You' : defenderOf(lastDeal.gin.knocker)} laid off ${lastDeal.gin.laidOff.map(face).join(' ')}.`}
                  </p>
                )}
                {lastDeal.gin === undefined && lastDeal.scores.length > 0 && (
                  <table className={styles.scores}>
                    <caption className={felt.srOnly}>Points left in hand</caption>
                    <tbody>
                      {lastDeal.scores.map(score => (
                        <tr key={score.playerId} className={score.playerId === lastDeal.winner ? styles.winnerRow : ''}>
                          <th scope="row">{score.playerId === playerId ? 'You' : score.playerId}</th>
                          <td>{score.playerId === lastDeal.winner ? `wins ${lastDeal.points} pts` : `${score.deadwood} pts left`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p id="rummy-deal-next" className={felt.endingLine} role="status">
                  {!mayDeal ? `${dealer} deals next.` : dealer === playerId ? 'Your deal next.' : `${dealer} is away: you can deal.`}
                </p>
                {mayDeal && <div className={felt.endingButtons}>{dealButtons(true)}</div>}
                <button ref={mayDeal ? undefined : playAgainRef} type="button" className={felt.link} onClick={dismissEnding}>
                  See the hands
                </button>
              </div>
            ) : (
              ended !== null && (
                <div className={felt.endingCard}>
                  <div className={felt.endingEmoji}>🃏</div>
                  <h2 id="rummy-ending" className={felt.endingTitle}>
                    The table closed
                  </h2>
                  <p id="rummy-table-result" className={felt.endingLine}>
                    {describeTableEnd(ended, playerId)}
                  </p>
                  {ended.standings.length > 0 && (
                    <table className={styles.scores}>
                      <caption className={felt.srOnly}>Hands won</caption>
                      <tbody>
                        {ended.standings.map(standing => (
                          <tr key={standing.playerId}>
                            <th scope="row">{standing.playerId === playerId ? 'You' : standing.playerId}</th>
                            <td>{standing.handsWon} won</td>
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
              )
            )}
          </div>,
          document.body
        )}
      <div className={felt.ring}>
        {dealt && <ScoreSheet view={view} playerId={playerId} />}
        {fromViewer(view.players, playerId).map((seat, i, all) => renderSeat(seat, clockOf(all.length, i)))}
        {view.phase !== 'waiting' && dealt && (
          <section className={`${felt.pile} ${styles.middle}`} aria-label="table">
            <div className={felt.piles}>
              <div className={`${felt.drawPile} ${view.stockCount === 0 ? felt.drawn : ''}`}>
                {drawing && view.canDrawStock ? (
                  <button
                    type="button"
                    className={`${felt.card} ${felt.back} ${styles.drawable}`}
                    onClick={thenHand(table.drawStock)}
                    disabled={!connected}
                    aria-label={turning ? 'turn the discard pile over and draw' : `draw from the stock, ${view.stockCount} left`}
                  />
                ) : (
                  <span className={`${felt.card} ${felt.back}`} role="img" aria-label={`stock, ${view.stockCount} left`} />
                )}
                <span className={felt.count}>{view.stockCount}</span>
              </div>
              <div className={felt.pileCards} role="group" aria-label="discard pile">
                <div ref={spreadRef} className={gin ? '' : styles.discardSpread} style={{ '--gaps': Math.max(pile.length - 1, 1) } as CSSProperties}>
                  {pile.slice(0, -1).map(card =>
                    deeperPickable ? (
                      <CardFace
                        key={face(card)}
                        card={card}
                        className={styles.pickable}
                        label={`take the pile down to ${face(card)}`}
                        toggle={downTo === face(card)}
                        onClick={connected ? thenHand(() => table.pickDownTo(card)) : undefined}
                      />
                    ) : (
                      <CardFace key={face(card)} card={card} label={`${face(card)} in the discard pile`} />
                    )
                  )}
                  {view.discardTop === undefined ? (
                    <div className={felt.emptyPile}>discard</div>
                  ) : (
                    <CardFace
                      card={view.discardTop}
                      className={takeable ? styles.drawable : ''}
                      label={takeable ? `take ${face(view.discardTop)} from the discard pile` : `${face(view.discardTop)} on the discard pile`}
                      onClick={takeable && connected ? thenHand(() => table.drawDiscard()) : undefined}
                    />
                  )}
                </div>
                {view.discardCount > 0 && <span className={felt.count}>{view.discardCount}</span>}
              </div>
            </div>
            {!gin && (
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
                    return fits && layingOff !== null ? (
                      <button
                        key={m}
                        type="button"
                        className={classes}
                        onClick={thenHand(() => (single !== null ? table.layOffSelected(m) : table.takeDownLayOff(m)))}
                        disabled={!connected}
                        aria-label={`lay off ${face(layingOff)} on ${named}`}
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
            )}
          </section>
        )}
      </div>
      {children}
    </div>
  )
}

export default RummyTable
