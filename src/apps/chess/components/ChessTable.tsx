import { useEffect, useId, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import type { ChessTableActions } from '@/hooks/useChessTable'
import felt from '@/apps/castle/components/CastleTable.module.css'
import type { ChessColor, ChessView } from '../wire'
import { describeMove, describeResult, formatClock, glyph, lastMoveSquares, movesTo, nameOf, pieceName, readBoard, squaresFor, targetsFrom } from '../rules'
import styles from './ChessTable.module.css'
import ScoreSheet from './ScoreSheet'

// The board from the viewer's chair: their side at the bottom, the
// opponent's clock above it and their own below. A tap on a piece offers
// the moves the hub listed for it, and a tap on one of those plays it;
// the hub refuses anything else in band. The table's chrome is castle's,
// as rummy's is.

export interface ChessTableProps {
  playerId: string
  connected: boolean
  view: ChessView
  table: ChessTableActions & { opening: boolean }
}

// The clocks a starter can pick, as minutes + increment seconds.
const CLOCKS: Record<string, { initialSeconds: number; incrementSeconds: number }> = {
  '1+0': { initialSeconds: 60, incrementSeconds: 0 },
  '3+2': { initialSeconds: 180, incrementSeconds: 2 },
  '5+3': { initialSeconds: 300, incrementSeconds: 3 },
  '10+5': { initialSeconds: 600, incrementSeconds: 5 }
}

// A bot's strengths, as Elo on Stockfish's scale (1320 to 3190).
const BOT_STRENGTHS: Array<{ elo: number; name: string }> = [
  { elo: 1320, name: 'Beginner' },
  { elo: 1600, name: 'Casual' },
  { elo: 1900, name: 'Club' },
  { elo: 2300, name: 'Strong' },
  { elo: 3190, name: 'Full strength' }
]

const PROMOTIONS: Array<{ letter: string; name: string }> = [
  { letter: 'q', name: 'Queen' },
  { letter: 'r', name: 'Rook' },
  { letter: 'b', name: 'Bishop' },
  { letter: 'n', name: 'Knight' }
]

// How often a running clock repaints: fine enough for its tenths.
const TICK_MS = 100

// How far a press travels before it is a drag rather than a tap.
const DRAG_SLOP_PX = 6

const colorOfPiece = (piece: string): ChessColor => (piece === piece.toUpperCase() ? 'white' : 'black')
const other = (color: ChessColor): ChessColor => (color === 'white' ? 'black' : 'white')

// One seat's clock. The hub stamps each view with the time left as it
// built it, so the running side counts down from the moment its view
// arrived. Its own component, so the tick repaints the clock and not the
// board.
const ClockRow = ({ view, seatId, color, you }: { view: ChessView; seatId: string; color: ChessColor; you: boolean }) => {
  const [arrived, setArrived] = useState(() => ({ view, at: Date.now() }))
  const [now, setNow] = useState(() => Date.now())
  if (arrived.view !== view) setArrived({ view, at: Date.now() })
  const running = view.phase === 'playing' && view.sideToMove === color
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [running])
  const stamped = view.clock === undefined ? 0 : color === 'white' ? view.clock.whiteMs : view.clock.blackMs
  const ms = running ? stamped - Math.max(0, now - arrived.at) : stamped
  return (
    <div className={`${styles.clockRow} ${running ? styles.running : ''}`}>
      <span className={styles.clockName}>
        {you ? `${nameOf(seatId)} (you)` : nameOf(seatId)} · {color}
      </span>
      <span role="timer" aria-label={`${nameOf(seatId)}’s clock`} className={`${styles.clock} ${ms < 10_000 ? styles.low : ''}`}>
        {formatClock(ms)}
      </span>
    </div>
  )
}

const ChessTable = ({ playerId, connected, view, table }: ChessTableProps) => {
  const { opening } = table
  const headingRef = useRef<HTMLHeadingElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const resignRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const playAgainRef = useRef<HTMLButtonElement>(null)
  // Where focus goes once the control that had it is gone: a square, or
  // one side of the resignation. Applied after the render that swapped it.
  const refocus = useRef<{ square: string } | 'resign' | 'confirm' | null>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  useEffect(() => {
    const target = refocus.current
    if (target === null) return
    refocus.current = null
    if (target === 'resign') resignRef.current?.focus()
    else if (target === 'confirm') confirmRef.current?.focus()
    else boardRef.current?.querySelector<HTMLElement>(`[data-square="${target.square}"]`)?.focus()
  })
  // The game's end is where the next thing to do is: another game.
  useEffect(() => {
    if (view.phase === 'ended' || view.phase === 'closed') playAgainRef.current?.focus()
  }, [view.phase])

  const targetNote = useId()
  // The square picked up, the promotion waiting on a piece, and a
  // resignation half made — each keyed to the view it was made against,
  // so a new position drops it rather than acting on one that is gone.
  const [picked, setPicked] = useState<{ view: ChessView; square: string } | null>(null)
  const [promoting, setPromoting] = useState<{ view: ChessView; from: string; to: string; moves: string[] } | null>(null)
  const [confirmResign, setConfirmResign] = useState<ChessView | null>(null)
  const [clockChoice, setClockChoice] = useState('3+2')
  const [botElo, setBotElo] = useState(BOT_STRENGTHS[1].elo)

  const me = view.players.find(player => player.playerId === playerId)
  const myColor: ChessColor = me?.color ?? 'white'
  const opponent = view.players.find(player => player.playerId !== playerId)
  const myTurn = view.phase === 'playing' && view.currentPlayerId === playerId
  const from = picked?.view === view ? picked.square : null
  const pendingPromotion = promoting?.view === view ? promoting : null
  const targets = from === null ? [] : targetsFrom(view.legalMoves, from)
  const board = readBoard(view.fen)
  // A promotion asking shows its pawn already on the last rank, under the
  // picker, as the board would once it is played.
  const shown = new Map(board)
  if (pendingPromotion !== null) {
    shown.set(pendingPromotion.to, board.get(pendingPromotion.from) ?? '')
    shown.delete(pendingPromotion.from)
  }
  const last = lastMoveSquares(view.moves)
  // The king of the side to move — or, once mated, of the side that was.
  const checkedKing = view.inCheck ? (view.fen?.split(' ')[1] === 'b' ? 'k' : 'K') : null

  // The move from `start` to `square`: played, or the promotion asked.
  const land = (start: string, square: string) => {
    const moves = movesTo(view.legalMoves, start, square)
    setPicked(null)
    if (moves.length === 1) table.play(moves[0])
    else setPromoting({ view, from: start, to: square, moves })
  }

  const tap = (square: string) => {
    // The click a release fires after a drag is the drag's, already done.
    if (dragged.current) {
      dragged.current = false
      return
    }
    if (!myTurn || !connected) return
    // A tap on the board is a new gesture: a promotion still asking is
    // abandoned, never left up to send a second move for this turn.
    setPromoting(null)
    if (from !== null && targets.includes(square)) {
      land(from, square)
      return
    }
    // Another of the viewer's pieces with a move picks it up; anything
    // else lets go.
    const movable = targetsFrom(view.legalMoves, square).length > 0
    setPicked(movable && square !== from ? { view, square } : null)
  }

  // A drag: a press on a piece with moves that travels past the slop. The
  // piece follows the pointer and its squares show; the release lands it on
  // the square under the pointer — not the event's target, which for a
  // touch stays the square the press began on. A drop anywhere else leaves
  // the piece picked up, for a tap to finish.
  const press = useRef<{ id: number; square: string; x: number; y: number; moving: boolean } | null>(null)
  const dragged = useRef(false)
  const [ghost, setGhost] = useState<{ piece: string; x: number; y: number; size: number } | null>(null)
  const squareAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-square]')?.dataset.square ?? null

  const onPointerDown = (event: ReactPointerEvent, square: string) => {
    dragged.current = false
    if (!myTurn || !connected || event.button !== 0) return
    if (targetsFrom(view.legalMoves, square).length === 0) return
    press.current = { id: event.pointerId, square, x: event.clientX, y: event.clientY, moving: false }
  }
  const onPointerMove = (event: ReactPointerEvent) => {
    const held = press.current
    if (held === null || held.id !== event.pointerId) return
    if (!held.moving && Math.hypot(event.clientX - held.x, event.clientY - held.y) < DRAG_SLOP_PX) return
    if (!held.moving) {
      held.moving = true
      setPromoting(null)
      setPicked({ view, square: held.square })
      // Past the slop, not on the press: captured at once, a tap's click
      // would land on the board rather than its square.
      boardRef.current?.setPointerCapture?.(event.pointerId)
    }
    // A size up from the board's own pieces, which are 9% of its width.
    const width = boardRef.current?.getBoundingClientRect().width ?? 0
    setGhost({ piece: board.get(held.square) ?? '', x: event.clientX, y: event.clientY, size: width * 0.11 })
  }
  const onPointerUp = (event: ReactPointerEvent) => {
    const held = press.current
    if (held === null || held.id !== event.pointerId) return
    press.current = null
    setGhost(null)
    if (!held.moving) return
    dragged.current = true
    const square = squareAt(event.clientX, event.clientY)
    if (square !== null && targetsFrom(view.legalMoves, held.square).includes(square)) land(held.square, square)
  }
  const onPointerCancel = () => {
    press.current = null
    setGhost(null)
  }

  const cancelPromotion = () => {
    if (pendingPromotion !== null) refocus.current = { square: pendingPromotion.from }
    setPromoting(null)
  }

  const status = (() => {
    if (view.phase === 'waiting') return view.players.length < 2 ? 'Waiting for a second seat.' : 'Pick a clock and start.'
    if (view.phase === 'ended') return view.result === undefined ? '' : describeResult(view.result, playerId)
    if (view.phase === 'closed') {
      // A leave mid-game is that game's result; between games, the news.
      if (view.result?.ending === 'abandoned') return describeResult(view.result, playerId)
      const left = view.players.find(player => player.playerId !== playerId)
      return `${left === undefined ? 'Your opponent' : nameOf(left.playerId)} left the table.`
    }
    if (pendingPromotion !== null) return 'Choose a piece to promote to.'
    if (!myTurn) return `${nameOf(view.currentPlayerId ?? '')} to move.`
    // The move just made is the opponent's: say it, since the board only
    // shows it.
    const lastMove = view.moves[view.moves.length - 1]
    const lastMover = view.sideToMove === undefined ? undefined : view.players.find(player => player.color === other(view.sideToMove!))
    const played = lastMove !== undefined && lastMover !== undefined ? `${nameOf(lastMover.playerId)} played ${describeMove(lastMove)}. ` : ''
    return `${played}${view.inCheck ? 'Check. ' : ''}Your move.`
  })()

  const squares = squaresFor(myColor)

  return (
    <div className={styles.table} data-phase={view.phase}>
      <div className={styles.top}>
        <div className={felt.tableHeader}>
          <h1 ref={headingRef} tabIndex={-1} className={felt.title}>
            Chess {view.gameId}
            {view.variant === 'kpk' && <span className={styles.variant}> · king and pawn</span>}
          </h1>
          <p className={felt.hint} role="status" data-testid="chess-status">
            {status}
          </p>
          {/* Leaving a game in play forfeits it: Resign is that, and it asks
              first. Before the start, leaving costs nothing. */}
          {view.phase === 'waiting' && (
            <button type="button" className={felt.link} onClick={table.leaveTable} disabled={!connected}>
              Leave table
            </button>
          )}
        </div>
        <ScoreSheet view={view} playerId={playerId} />
      </div>

      {view.phase === 'waiting' ? (
        <div className={styles.waiting}>
          <ul className={styles.seats}>
            {view.players.map(player => (
              <li key={player.playerId}>{player.playerId === playerId ? `${player.playerId} (you)` : nameOf(player.playerId)}</li>
            ))}
          </ul>
          {/* Alone at the table, a bot can take the other chair. */}
          {view.players.length === 1 && (
            <div className={styles.clockPick}>
              <select aria-label="Bot strength" value={botElo} onChange={event => setBotElo(Number(event.target.value))}>
                {BOT_STRENGTHS.map(({ elo, name }) => (
                  <option key={elo} value={elo}>
                    {name} ({elo})
                  </option>
                ))}
              </select>
              <button type="button" className={felt.secondary} onClick={() => table.addBot(botElo)} disabled={!connected}>
                Add a bot
              </button>
            </div>
          )}
          <label className={styles.clockPick}>
            Clock
            <select value={clockChoice} onChange={event => setClockChoice(event.target.value)}>
              {Object.keys(CLOCKS).map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={felt.primary}
            onClick={() => table.startTable(CLOCKS[clockChoice])}
            disabled={view.players.length < 2 || !connected}
          >
            Start
          </button>
        </div>
      ) : (
        <div className={styles.play}>
          {opponent?.color !== undefined && <ClockRow view={view} seatId={opponent.playerId} color={opponent.color} you={false} />}
          <span id={targetNote} className={felt.srOnly}>
            a move
          </span>
          <div className={styles.boardSlot}>
            <div
              ref={boardRef}
              className={styles.board}
              role="group"
              aria-label="board"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            >
              {squares.map((square, index) => {
                const piece = shown.get(square)
                const mine = piece !== undefined && colorOfPiece(piece) === myColor
                // a1 dark: a square is dark where its file and rank index sum even.
                const light = (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 0
                const target = targets.includes(square)
                const grab = mine && myTurn && connected && targetsFrom(view.legalMoves, square).length > 0
                return (
                  <button
                    key={square}
                    type="button"
                    data-square={square}
                    className={`${styles.square} ${light ? styles.light : styles.dark} ${target ? styles.target : ''}`}
                    aria-label={piece === undefined ? square : `${square}, ${pieceName(piece)}`}
                    aria-pressed={mine ? from === square : undefined}
                    aria-disabled={!myTurn || !connected ? true : undefined}
                    data-shade={light ? 'light' : 'dark'}
                    aria-describedby={target ? targetNote : undefined}
                    data-last={last.includes(square) ? 'true' : undefined}
                    data-check={piece !== undefined && piece === checkedKing ? 'true' : undefined}
                    data-grab={grab ? 'true' : undefined}
                    data-dragging={ghost !== null && from === square ? 'true' : undefined}
                    // Under the picker's scrim, out of reach of the keyboard as of the pointer.
                    inert={pendingPromotion !== null}
                    onPointerDown={event => onPointerDown(event, square)}
                    onClick={() => tap(square)}
                  >
                    {index % 8 === 0 && (
                      <span className={styles.rank} aria-hidden="true" data-testid="coordinate">
                        {square[1]}
                      </span>
                    )}
                    {index >= 56 && (
                      <span className={styles.file} aria-hidden="true" data-testid="coordinate">
                        {square[0]}
                      </span>
                    )}
                    {piece !== undefined && (
                      <span className={colorOfPiece(piece) === 'white' ? styles.whitePiece : styles.blackPiece} aria-hidden="true">
                        {glyph(piece)}
                      </span>
                    )}
                  </button>
                )
              })}
              {/* Lichess's picker: the pieces stacked down the file from the
                  promotion square, which is always on the viewer's far rank,
                  over a dimmed board a tap on which lets the pawn go back. */}
              {pendingPromotion !== null && (
                <div
                  className={styles.promotion}
                  role="group"
                  aria-label="promote to"
                  onKeyDown={event => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      cancelPromotion()
                    }
                  }}
                >
                  <ul className={styles.promotionFile} style={{ left: `${(squares.indexOf(pendingPromotion.to) % 8) * 12.5}%` }}>
                    {PROMOTIONS.map(({ letter, name }, i) => {
                      const uci = pendingPromotion.moves.find(move => move.endsWith(letter))
                      if (uci === undefined) return null
                      return (
                        <li key={letter}>
                          <button
                            type="button"
                            className={`${styles.promotionPiece} ${myColor === 'white' ? styles.whitePiece : styles.blackPiece}`}
                            aria-label={name}
                            autoFocus={i === 0}
                            onClick={() => {
                              refocus.current = { square: uci.slice(2, 4) }
                              setPromoting(null)
                              table.play(uci)
                            }}
                          >
                            <span aria-hidden="true">{glyph(myColor === 'white' ? letter.toUpperCase() : letter)}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  <button type="button" className={styles.promotionScrim} aria-label="Cancel" onClick={cancelPromotion} />
                </div>
              )}
            </div>
          </div>
          {me?.color !== undefined && <ClockRow view={view} seatId={me.playerId} color={me.color} you />}
          {/* On the page, not the board: the board clips its overflow, and a
              captured drag may stray past its edge. */}
          {ghost !== null &&
            createPortal(
              <span
                className={`${styles.ghost} ${colorOfPiece(ghost.piece) === 'white' ? styles.whitePiece : styles.blackPiece}`}
                style={{ left: ghost.x, top: ghost.y, fontSize: ghost.size }}
                aria-hidden="true"
                data-testid="drag-ghost"
              >
                {glyph(ghost.piece)}
              </span>,
              document.body
            )}

          {view.phase === 'playing' && me !== undefined && (
            <div className={styles.actions}>
              {confirmResign === view ? (
                <>
                  <button ref={confirmRef} type="button" className={styles.danger} onClick={table.resign} disabled={!connected}>
                    Confirm resign
                  </button>
                  <button
                    type="button"
                    className={felt.link}
                    onClick={() => {
                      refocus.current = 'resign'
                      setConfirmResign(null)
                    }}
                  >
                    Keep playing
                  </button>
                </>
              ) : (
                <button
                  ref={resignRef}
                  type="button"
                  className={felt.secondary}
                  onClick={() => {
                    refocus.current = 'confirm'
                    setConfirmResign(view)
                  }}
                  disabled={!connected}
                >
                  Resign
                </button>
              )}
            </div>
          )}

          {(view.phase === 'ended' || view.phase === 'closed') && (
            <div className={styles.ending}>
              <p className={styles.result} aria-hidden="true">
                {status}
              </p>
              {/* Between games the table is still both seats': the next game
                  is played here. Once a seat has left, another table. */}
              <div className={styles.actions}>
                <button ref={playAgainRef} type="button" className={felt.primary} onClick={table.playAgain} disabled={!connected || opening}>
                  {opening ? 'Opening…' : view.phase === 'ended' ? 'Next game' : 'Play again'}
                </button>
                <button type="button" className={felt.secondary} onClick={table.leaveTable}>
                  {view.phase === 'ended' ? 'Leave table' : 'Back to the room'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ChessTable
