import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { CastleTableActions } from '@/hooks/useCastleTable'
import type { Card, CastleGameEnded, CastlePlayer, CastleView } from '../wire'
import { cardsOf, describeEnding, describeLastPlay, describePile, face, isRed, rowInPlay, seatOf } from '../rules'
import { clockOf, fromViewer } from '../seating'
import styles from './CastleTable.module.css'

// The table from the viewer's chair, seen from above: the viewer at 6
// o'clock with their moves under their hand, the others around the ring
// in turn order, every hand nearest its player and every castle toward
// the pile in the middle. Every rule the UI enforces is the engine's too
// — the buttons offer, the hub refuses in band, and the lobby's notice
// says why.

interface CardFaceProps {
  card: Card
  // Present only for a card the viewer can act on: those are buttons,
  // the rest are pictures. A toggle (selection) reports its state.
  onClick?: () => void
  toggle?: boolean
  label?: string
  className?: string
}

const CardFace = ({ card, onClick, toggle, label, className = '' }: CardFaceProps) => {
  const classes = `${styles.card} ${isRed(card) ? styles.red : ''} ${toggle ? styles.selected : ''} ${className}`
  if (onClick === undefined) {
    return (
      <span className={classes} role="img" aria-label={label ?? face(card)}>
        <span className={styles.rank}>{card.rank}</span>
        <span className={styles.suit}>{card.suit}</span>
      </span>
    )
  }
  return (
    <button type="button" className={classes} onClick={onClick} aria-pressed={toggle} aria-label={label ?? face(card)}>
      <span className={styles.rank}>{card.rank}</span>
      <span className={styles.suit}>{card.suit}</span>
    </button>
  )
}

interface CardBackProps {
  onClick?: () => void
  label: string
}

const CardBack = ({ onClick, label }: CardBackProps) =>
  onClick === undefined ? (
    <span className={`${styles.card} ${styles.back}`} role="img" aria-label={label} />
  ) : (
    <button type="button" className={`${styles.card} ${styles.back}`} onClick={onClick} aria-label={label} />
  )

export interface CastleTableProps {
  playerId: string
  connected: boolean
  view: CastleView
  table: CastleTableActions & { ended: CastleGameEnded | null; selected: number[] }
  // The owner's chrome, rendered beside the table: chat, the notice bar.
  children?: ReactNode
}

// Another seat's hand is backs: past this many, the count says the rest.
const SHOWN_BACKS = 6

const CastleTable = ({ playerId, connected, view, table, children }: CastleTableProps) => {
  const { ended, selected } = table
  // Joining unmounts whatever was clicked; the table announces itself.
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  // Setup: the hand card picked, waiting for the face-up card to swap
  // with. The card, not its slot: a view landing between the two clicks
  // can move it, and a slot would then point at whatever took its place.
  // Keyed to its table too, so a pick never outlives the table it was
  // made on.
  const [pendingSwap, setPendingSwap] = useState<{ gameId: string; card: Card } | null>(null)

  const me = seatOf(view, playerId)
  const myTurn = view.currentPlayerId === playerId && view.phase === 'playing'
  const myRow = me === undefined ? 'hand' : rowInPlay(me)
  const inPlay = me === undefined ? [] : cardsOf(me, myRow)
  const arranging = view.phase === 'setup' && me !== undefined && !me.ready
  // Where the picked card is now. Gone from the hand — swapped away by
  // the move this pick was the start of, most likely — and the pick goes
  // with it rather than landing on its neighbour.
  const pickedAt =
    arranging && pendingSwap !== null && pendingSwap.gameId === view.gameId
      ? me.hand.findIndex(card => face(card) === face(pendingSwap.card))
      : -1
  const swapFrom = pickedAt < 0 ? null : pickedAt

  const hint = (() => {
    if (view.phase === 'waiting' && view.players.length < 2) return 'Waiting for a second seat.'
    if (arranging) {
      return swapFrom === null
        ? 'Pick a hand card to swap into your face-up row, or ready up.'
        : 'Now pick the face-up card to swap it with.'
    }
    if (view.phase === 'setup' && me?.ready) return 'Ready. Waiting for the table.'
    if (myTurn && myRow === 'faceDown') return 'Flip a face-down card, blind, or pick up the pile.'
    return ''
  })()

  const actions = (() => {
    if (view.phase === 'waiting') {
      return (
        <button type="button" className={styles.primary} onClick={table.startTable} disabled={view.players.length < 2 || !connected}>
          Deal
        </button>
      )
    }
    if (arranging) {
      return (
        <button type="button" className={styles.primary} onClick={table.ready} disabled={!connected}>
          Ready
        </button>
      )
    }
    if (myTurn && me !== undefined) {
      // The pile is always the mover's to take, a legal play or not.
      const pickUp = (
        <button type="button" className={styles.secondary} onClick={table.pickUp} disabled={view.pileCount === 0 || !connected}>
          Pick up the pile
        </button>
      )
      if (myRow === 'faceDown') return pickUp
      return (
        <>
          <button type="button" className={styles.primary} onClick={table.playSelected} disabled={selected.length === 0 || !connected}>
            Play {selected.length > 0 ? selected.map(i => face(inPlay[i])).join(' ') : ''}
          </button>
          {pickUp}
        </>
      )
    }
    if (view.phase === 'ended') {
      return (
        <button type="button" className={styles.primary} onClick={table.leaveTable}>
          Back to the room
        </button>
      )
    }
    return null
  })()

  const renderSeat = (seat: CastlePlayer, clock: number) => {
    const mine = seat.playerId === playerId
    const onTurn = view.phase === 'playing' && view.currentPlayerId === seat.playerId
    const label = mine ? `${seat.playerId} (you)` : seat.playerId
    const whose = mine ? 'Your' : `${seat.playerId}'s`
    return (
      <section
        key={seat.playerId}
        className={`${styles.seat} ${mine ? styles.mine : ''} ${onTurn ? styles.onTurn : ''} ${seat.out ? styles.out : ''}`}
        data-clock={clock}
        aria-label={`${label}${onTurn ? ', to play' : ''}${seat.out ? ', out' : ''}`}
      >
        <h3 className={styles.seatName}>
          {label}
          {view.phase === 'setup' && <span className={styles.muted}> {seat.ready ? '· ready' : '· arranging'}</span>}
          {onTurn && <span className={styles.turn}> · to play</span>}
          {seat.out && <span className={styles.muted}> · out</span>}
          {/* Where the fan is folded away (a small screen) or capped, the count stands in. */}
          {!mine && (
            <span className={`${styles.handCount} ${seat.handCount > SHOWN_BACKS ? styles.handCountShown : ''}`}>
              {' '}· {seat.handCount} in hand
            </span>
          )}
        </h3>
        <div className={styles.seatFrame}>
          <div className={styles.seatCards}>
            {/* The castle: three stacks, each a face-down card with a face-up
                card covering it. Stacks pair the rows by index, which is how
                they were dealt; a played face-up card leaves its back bare. */}
            <div className={styles.castle} role="group" aria-label={`${whose} castle`}>
              {Array.from({ length: Math.max(seat.faceDownCount, seat.faceUp.length) }, (_, i) => {
                const card = seat.faceUp[i]
                const swappable = card !== undefined && mine && swapFrom !== null
                const playable = card !== undefined && mine && myTurn && myRow === 'faceUp'
                const blind = mine && myTurn && myRow === 'faceDown'
                return (
                  <div key={i} className={styles.stack}>
                    {i < seat.faceDownCount && (
                      <span className={styles.stackBase}>
                        <CardBack
                          label={blind ? `flip face-down card ${i + 1}` : 'face-down card'}
                          onClick={blind && connected ? () => table.playFaceDown(i) : undefined}
                        />
                      </span>
                    )}
                    {card !== undefined && (
                      <span className={styles.stackTop}>
                        {swappable ? (
                          <CardFace
                            card={card}
                            className={styles.swapTarget}
                            label={`swap for ${face(card)}`}
                            onClick={() => {
                              table.swapForSetup(swapFrom, i)
                              setPendingSwap(null)
                            }}
                          />
                        ) : (
                          <CardFace
                            card={card}
                            toggle={playable ? selected.includes(i) : undefined}
                            onClick={playable && connected ? () => table.toggleCard(i) : undefined}
                          />
                        )}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            {/* The hand, fanned: faces for the viewer's own (and everyone's
                once the game ends), backs for the rest. */}
            {/* A hand that grew on pick-ups fans tighter, so it stays a hand. */}
            <div
              className={styles.hand}
              role="group"
              aria-label={`${whose} hand`}
              style={{ '--overlap': `${Math.min(2.2, 1 + Math.max(0, seat.handCount - 6) * 0.2)}rem` } as CSSProperties}
            >
              {(seat.hand.length > 0 ? seat.hand : Array.from({ length: Math.min(seat.handCount, SHOWN_BACKS) }, () => null)).map((card, i, all) => {
                const picking = card !== null && mine && arranging
                const playable = card !== null && mine && myTurn && myRow === 'hand'
                const angle = (i - (all.length - 1) / 2) * 5
                return (
                  <span key={i} className={styles.fanSlot} style={{ transform: `rotate(${angle}deg) translateY(${Math.abs(angle) * 0.35}px)` }}>
                    {card === null ? (
                      <CardBack label="hand card" />
                    ) : (
                      <CardFace
                        card={card}
                        toggle={picking ? swapFrom === i : playable ? selected.includes(i) : undefined}
                        onClick={
                          picking
                            ? () => setPendingSwap(swapFrom === i ? null : { gameId: view.gameId, card })
                            : playable && connected
                              ? () => table.toggleCard(i)
                              : undefined
                        }
                      />
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
        {mine && <div className={styles.actions}>{actions}</div>}
      </section>
    )
  }

  return (
    <div className={styles.table} data-phase={view.phase}>
      <div className={styles.tableHeader}>
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          Table {view.gameId}
        </h1>
        {view.phase !== 'ended' && (
          <button type="button" className={styles.link} onClick={table.leaveTable} disabled={!connected}>
            Leave table
          </button>
        )}
      </div>
      <p className={styles.ending} role="status">
        {view.phase === 'ended' && ended !== null ? describeEnding(ended.finished, ended.loser, playerId) : ''}
      </p>
      <p className={styles.hint} role="status">
        {hint}
      </p>
      <div className={styles.ring}>
        {fromViewer(view.players, playerId).map((seat, i, all) => renderSeat(seat, clockOf(all.length, i)))}
        {(view.phase === 'playing' || view.phase === 'ended') && (
          <section className={styles.pile} aria-label="pile">
            <div className={styles.pileCards}>
              {view.run.length === 0 ? (
                <div className={styles.emptyPile}>empty</div>
              ) : (
                // The run on top, tightly fanned: a pair of sevens reads as a pair.
                <div className={styles.run} role="group" aria-label="run on top">
                  {view.run.map((card, i) => (
                    <span key={i} className={styles.runSlot} style={{ transform: `rotate(${(i - (view.run.length - 1) / 2) * 4}deg)` }}>
                      <CardFace card={card} />
                    </span>
                  ))}
                </div>
              )}
              <div className={styles.pileText}>
                <p>{describePile(view)}</p>
                <p className={styles.muted}>
                  {view.pileCount} on the pile · {view.drawPileCount} to draw
                </p>
                {view.lastPlay !== undefined && <p className={styles.lastPlay}>{describeLastPlay(view.lastPlay, playerId)}</p>}
              </div>
            </div>
          </section>
      )}
      </div>
      {children}
    </div>
  )
}

export default CastleTable
