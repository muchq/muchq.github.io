import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from 'react'
import type { Standing } from '../rules'
import type { CastleTableActions } from '@/hooks/useCastleTable'
import type { Card, CastleGameEnded, CastleLastPlay, CastlePlayer, CastleView } from '../wire'
import { cardsOf, describeEnding, describeLastPlay, describePile, face, headlineOf, isRed, rowInPlay, seatOf, standingOf } from '../rules'
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
  style?: CSSProperties
}

const CardFace = ({ card, onClick, toggle, label, className = '', style }: CardFaceProps) => {
  const classes = `${styles.card} ${isRed(card) ? styles.red : ''} ${toggle ? styles.selected : ''} ${className}`
  if (onClick === undefined) {
    return (
      <span className={classes} style={style} role="img" aria-label={label ?? face(card)}>
        <span className={styles.rank}>{card.rank}</span>
        <span className={styles.suit}>{card.suit}</span>
      </span>
    )
  }
  return (
    <button type="button" className={classes} style={style} onClick={onClick} aria-pressed={toggle} aria-label={label ?? face(card)}>
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
  table: CastleTableActions & { ended: CastleGameEnded | null; selected: number[]; opening: boolean }
  // The owner's chrome, rendered beside the table: chat, the notice bar.
  children?: ReactNode
}

// Another seat's hand is backs: past this many, the count says the rest.
const SHOWN_BACKS = 6

// The viewer's own hand fans up to this many. Past it the fan tightens
// until nothing shows or taps, so a bigger hand is a strip instead:
// every card whole, scrolled by finger or by dragging.
const FAN_MAX = 7

// A mouse drag that moved this far was a scroll, not a tap on a card.
const DRAG_SLOP = 6

// The play as a string, to notice when a new one lands: a view repeats
// the last play until the next replaces it.
const playSignature = (play: CastleLastPlay | undefined): string =>
  play === undefined ? '' : `${play.playerId}:${play.cards.map(face).join(',')}:${play.burned}:${play.pickedUp}`

// Which cards of the hand were not in it last time: the draw-back, or
// the pile just picked up. Matched as a multiset by face, so a second
// K♣ is new only if there was not one already.
const enteredSince = (previous: string[], hand: Card[]): number[] => {
  const left = [...previous]
  const entered: number[] = []
  hand.forEach((card, i) => {
    const at = left.indexOf(face(card))
    if (at < 0) entered.push(i)
    else left.splice(at, 1)
  })
  return entered
}

const ENDING_EMOJI: Record<Standing, string> = { won: '🏆', lost: '😤', other: '🤝' }

const CastleTable = ({ playerId, connected, view, table, children }: CastleTableProps) => {
  const { ended, opening, selected } = table
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
  // The table whose ending has been read and waved away, so the final
  // hands can be looked over. Keyed by table, so the next one's ending
  // arrives in front again.
  const [endingRead, setEndingRead] = useState<string | null>(null)
  const playAgainRef = useRef<HTMLButtonElement>(null)
  const endingRef = useRef<HTMLDivElement>(null)

  // The last play shows for a moment when it lands, then goes: the table
  // itself says the rest. Keyed so a new play restarts the moment even
  // when it reads the same as the last.
  const playSig = playSignature(view.lastPlay)
  const [strip, setStrip] = useState({ sig: playSig, key: 0 })
  if (strip.sig !== playSig) setStrip({ sig: playSig, key: strip.key + 1 })

  // Cards that just entered the viewer's hand slide in, so a pick-up
  // reads as the pile arriving rather than the hand having changed.
  // Held until the hand changes again, so a re-render mid-slide does
  // not cut it short.
  const myHand = seatOf(view, playerId)?.hand ?? []
  const handSig = `${view.gameId}:${myHand.map(face).join(',')}`
  const [handMark, setHandMark] = useState<{ sig: string; faces: string[]; entered: number[] }>({
    sig: '',
    faces: [],
    entered: []
  })
  if (handMark.sig !== handSig) {
    setHandMark({
      sig: handSig,
      faces: myHand.map(face),
      entered: handMark.sig.startsWith(`${view.gameId}:`) ? enteredSince(handMark.faces, myHand) : []
    })
  }

  // A big hand scrolls. Touch scrolls it natively; a mouse drags it, and
  // a drag that went anywhere is not a tap on the card it started on.
  const stripRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const dragged = useRef(false)
  const onStripPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || stripRef.current === null) return
    drag.current = { x: event.clientX, left: stripRef.current.scrollLeft, moved: false }
    // Keeps the drag when the pointer leaves the strip. Not every DOM
    // has it (jsdom's does not).
    stripRef.current.setPointerCapture?.(event.pointerId)
  }
  const onStripPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current === null || stripRef.current === null) return
    const dx = event.clientX - drag.current.x
    if (Math.abs(dx) > DRAG_SLOP) drag.current.moved = true
    if (drag.current.moved) stripRef.current.scrollLeft = drag.current.left - dx
  }
  const onStripPointerUp = () => {
    dragged.current = drag.current?.moved ?? false
    drag.current = null
  }
  const onStripClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragged.current) return
    dragged.current = false
    event.stopPropagation()
    event.preventDefault()
  }

  // gameEnded lands right behind the final view; without it there is
  // no result to show yet.
  const showEnding = view.phase === 'ended' && ended !== null && endingRead !== view.gameId
  // aria-modal does not take the page behind out of the tab order, and
  // what is back there opens underneath the dim. Tab stays in the card.
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
    // The button that had the focus is going with the overlay; the
    // heading is where reading the table starts.
    headingRef.current?.focus()
  }
  useEffect(() => {
    if (showEnding) playAgainRef.current?.focus()
  }, [showEnding])

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
            Play {inPlay.filter((_, i) => selected.includes(i)).map(face).join(' ')}
          </button>
          {pickUp}
        </>
      )
    }
    if (view.phase === 'ended' && !showEnding) {
      // The overlay's two ways on, for once it has been waved away —
      // never behind it, where they would be tab stops nobody can see.
      // Another table waits on the result the same way the overlay does:
      // until gameEnded lands, nobody has been told who won. Back is the
      // way out in the meantime.
      return (
        <>
          {ended !== null && (
            <button type="button" className={styles.primary} onClick={table.playAgain} disabled={!connected || opening}>
              {opening ? 'Opening…' : 'Play again'}
            </button>
          )}
          <button type="button" className={styles.secondary} onClick={table.leaveTable}>
            Back to the room
          </button>
        </>
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
            {/* The hand: faces for the viewer's own (and everyone's once the
                game ends), backs for the rest. The viewer's fans until it is
                too big to fan, then scrolls. */}
            {(() => {
              const shown = seat.hand.length > 0 ? seat.hand : Array.from({ length: Math.min(seat.handCount, SHOWN_BACKS) }, () => null)
              const asStrip = mine && seat.hand.length > FAN_MAX
              const renderCard = (card: Card | null, i: number) => {
                const picking = card !== null && mine && arranging
                const playable = card !== null && mine && myTurn && myRow === 'hand'
                const entered = mine && handMark.entered.includes(i)
                return card === null ? (
                  <CardBack label="hand card" />
                ) : (
                  <CardFace
                    card={card}
                    className={entered ? styles.entered : ''}
                    style={entered ? ({ '--i': handMark.entered.indexOf(i) } as CSSProperties) : undefined}
                    toggle={picking ? swapFrom === i : playable ? selected.includes(i) : undefined}
                    onClick={
                      picking
                        ? () => setPendingSwap(swapFrom === i ? null : { gameId: view.gameId, card })
                        : playable && connected
                          ? () => table.toggleCard(i)
                          : undefined
                    }
                  />
                )
              }
              if (asStrip) {
                return (
                  <div
                    ref={stripRef}
                    className={styles.handStrip}
                    role="group"
                    aria-label={`${whose} hand`}
                    onPointerDown={onStripPointerDown}
                    onPointerMove={onStripPointerMove}
                    onPointerUp={onStripPointerUp}
                    onPointerCancel={onStripPointerUp}
                    onClickCapture={onStripClickCapture}
                  >
                    {shown.map((card, i) => (
                      <span key={i} className={styles.stripSlot}>
                        {renderCard(card, i)}
                      </span>
                    ))}
                  </div>
                )
              }
              return (
                <div
                  className={styles.hand}
                  role="group"
                  aria-label={`${whose} hand`}
                  style={{ '--overlap': `${Math.min(2.2, 1 + Math.max(0, shown.length - 6) * 0.2)}rem` } as CSSProperties}
                >
                  {shown.map((card, i, all) => {
                    const angle = (i - (all.length - 1) / 2) * 5
                    return (
                      <span key={i} className={styles.fanSlot} style={{ transform: `rotate(${angle}deg) translateY(${Math.abs(angle) * 0.35}px)` }}>
                        {renderCard(card, i)}
                      </span>
                    )
                  })}
                </div>
              )
            })()}
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
      {showEnding &&
        ended !== null &&
        createPortal(
          // Out of the lobby's own stacking context, where the panel
          // toggle would sit on top of the dim and open behind it.
          <div
            ref={endingRef}
            className={styles.endingOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="castle-ending"
            onKeyDown={event => {
              if (event.key === 'Escape') dismissEnding()
              keepFocusIn(event)
            }}
          >
            <div className={styles.endingCard}>
              <div className={styles.endingEmoji}>{ENDING_EMOJI[standingOf(ended.finished, ended.loser, playerId)]}</div>
              <h2 id="castle-ending" className={styles.endingTitle}>
                {headlineOf(ended, playerId)}
              </h2>
              <p className={styles.endingLine}>{describeEnding(ended.finished, ended.loser, playerId)}</p>
              <div className={styles.endingButtons}>
                <button
                  ref={playAgainRef}
                  type="button"
                  className={styles.primary}
                  onClick={table.playAgain}
                  disabled={!connected || opening}
                >
                  {opening ? 'Opening…' : 'Play again'}
                </button>
                <button type="button" className={styles.secondary} onClick={table.leaveTable}>
                  Back to the room
                </button>
              </div>
              <button type="button" className={styles.link} onClick={dismissEnding}>
                See the final hands
              </button>
            </div>
          </div>,
          document.body
        )}
      <div className={styles.ring}>
        {fromViewer(view.players, playerId).map((seat, i, all) => renderSeat(seat, clockOf(all.length, i)))}
        {(view.phase === 'playing' || view.phase === 'ended') && (
          <section className={styles.pile} aria-label="pile">
            <div className={styles.piles}>
              {/* The draw pile, as a thing rather than a count in prose. */}
              <div
                className={`${styles.drawPile} ${view.drawPileCount === 0 ? styles.drawn : ''}`}
                role="img"
                aria-label={`${view.drawPileCount} to draw`}
              >
                <span className={`${styles.card} ${styles.back}`} />
                <span className={styles.count}>{view.drawPileCount}</span>
              </div>
              <div className={styles.pileCards} role="img" aria-label={`${view.pileCount} on the pile`}>
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
                {view.pileCount > 0 && <span className={styles.count}>{view.pileCount}</span>}
              </div>
            </div>
            {/* The price is the mover's to read; off turn the run says enough. */}
            {myTurn && <p className={styles.price}>{describePile(view)}</p>}
            {/* The last play, for a moment: a pick-up shows the card that
                did not play and stays longer, since a handful of cards
                just arrived and this is why. */}
            {view.lastPlay !== undefined && (
              <p
                key={strip.key}
                className={`${styles.lastPlay} ${view.lastPlay.pickedUp ? styles.pickedUp : ''}`}
                role="status"
              >
                {view.lastPlay.pickedUp && view.lastPlay.cards[0] !== undefined && (
                  <CardFace card={view.lastPlay.cards[0]} className={styles.flipped} />
                )}
                <span>{describeLastPlay(view.lastPlay, playerId)}</span>
              </p>
            )}
          </section>
        )}
      </div>
      {children}
    </div>
  )
}

export default CastleTable
