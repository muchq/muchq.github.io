import { useEffect, useId, useRef, useState } from 'react'
import type { ChessTableActions } from '@/hooks/useChessTable'
import felt from '@/apps/castle/components/CastleTable.module.css'
import type { ChessColor, ChessView } from '../wire'
import { describeMove, describeResult, formatClock, glyph, lastMoveSquares, movesTo, pieceName, readBoard, squaresFor, targetsFrom } from '../rules'
import styles from './ChessTable.module.css'

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

const PROMOTIONS: Array<{ letter: string; name: string }> = [
  { letter: 'q', name: 'Queen' },
  { letter: 'r', name: 'Rook' },
  { letter: 'b', name: 'Bishop' },
  { letter: 'n', name: 'Knight' }
]

// How often a running clock repaints: fine enough for its tenths.
const TICK_MS = 100

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
        {you ? `${seatId} (you)` : seatId} · {color}
      </span>
      <span role="timer" aria-label={`${seatId}’s clock`} className={`${styles.clock} ${ms < 10_000 ? styles.low : ''}`}>
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
    if (view.phase === 'ended') playAgainRef.current?.focus()
  }, [view.phase])

  const targetNote = useId()
  // The square picked up, the promotion waiting on a piece, and a
  // resignation half made — each keyed to the view it was made against,
  // so a new position drops it rather than acting on one that is gone.
  const [picked, setPicked] = useState<{ view: ChessView; square: string } | null>(null)
  const [promoting, setPromoting] = useState<{ view: ChessView; from: string; moves: string[] } | null>(null)
  const [confirmResign, setConfirmResign] = useState<ChessView | null>(null)
  const [clockChoice, setClockChoice] = useState('3+2')

  const me = view.players.find(player => player.playerId === playerId)
  const myColor: ChessColor = me?.color ?? 'white'
  const opponent = view.players.find(player => player.playerId !== playerId)
  const myTurn = view.phase === 'playing' && view.currentPlayerId === playerId
  const from = picked?.view === view ? picked.square : null
  const pendingPromotion = promoting?.view === view ? promoting : null
  const targets = from === null ? [] : targetsFrom(view.legalMoves, from)
  const board = readBoard(view.fen)
  const last = lastMoveSquares(view.moves)
  // The king of the side to move — or, once mated, of the side that was.
  const checkedKing = view.inCheck ? (view.fen?.split(' ')[1] === 'b' ? 'k' : 'K') : null

  const tap = (square: string) => {
    if (!myTurn || !connected) return
    // A tap on the board is a new gesture: a promotion still asking is
    // abandoned, never left up to send a second move for this turn.
    setPromoting(null)
    if (from !== null && targets.includes(square)) {
      const moves = movesTo(view.legalMoves, from, square)
      setPicked(null)
      if (moves.length === 1) table.play(moves[0])
      else setPromoting({ view, from, moves })
      return
    }
    // Another of the viewer's pieces with a move picks it up; anything
    // else lets go.
    const movable = targetsFrom(view.legalMoves, square).length > 0
    setPicked(movable && square !== from ? { view, square } : null)
  }

  const cancelPromotion = () => {
    if (pendingPromotion !== null) refocus.current = { square: pendingPromotion.from }
    setPromoting(null)
  }

  const status = (() => {
    if (view.phase === 'waiting') return view.players.length < 2 ? 'Waiting for a second seat.' : 'Pick a clock and start.'
    if (view.phase === 'ended') return view.result === undefined ? '' : describeResult(view.result, playerId)
    if (pendingPromotion !== null) return 'Choose a piece to promote to.'
    if (!myTurn) return `${view.currentPlayerId ?? ''} to move.`
    // The move just made is the opponent's: say it, since the board only
    // shows it.
    const lastMove = view.moves[view.moves.length - 1]
    const lastMover = view.sideToMove === undefined ? undefined : view.players.find(player => player.color === other(view.sideToMove!))
    const played = lastMove !== undefined && lastMover !== undefined ? `${lastMover.playerId} played ${describeMove(lastMove)}. ` : ''
    return `${played}${view.inCheck ? 'Check. ' : ''}Your move.`
  })()

  const squares = squaresFor(myColor)

  return (
    <div className={styles.table} data-phase={view.phase}>
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

      {view.phase === 'waiting' ? (
        <div className={styles.waiting}>
          <ul className={styles.seats}>
            {view.players.map(player => (
              <li key={player.playerId}>{player.playerId === playerId ? `${player.playerId} (you)` : player.playerId}</li>
            ))}
          </ul>
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
          <div ref={boardRef} className={styles.board} role="group" aria-label="board">
            {squares.map((square, index) => {
              const piece = board.get(square)
              const mine = piece !== undefined && colorOfPiece(piece) === myColor
              // a1 dark: a square is dark where its file and rank index sum even.
              const light = (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 0
              const target = targets.includes(square)
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
          </div>
          {me?.color !== undefined && <ClockRow view={view} seatId={me.playerId} color={me.color} you />}

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
              {PROMOTIONS.map(({ letter, name }, i) => {
                const uci = pendingPromotion.moves.find(move => move.endsWith(letter))
                if (uci === undefined) return null
                return (
                  <button
                    key={letter}
                    type="button"
                    className={felt.secondary}
                    aria-label={name}
                    autoFocus={i === 0}
                    onClick={() => {
                      refocus.current = { square: uci.slice(2, 4) }
                      setPromoting(null)
                      table.play(uci)
                    }}
                  >
                    <span aria-hidden="true">{glyph(myColor === 'white' ? letter.toUpperCase() : letter)}</span> {name}
                  </button>
                )
              })}
              <button type="button" className={felt.link} onClick={cancelPromotion}>
                Cancel
              </button>
            </div>
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

          {view.phase === 'ended' && (
            <div className={styles.ending}>
              <p className={styles.result} aria-hidden="true">
                {status}
              </p>
              <div className={styles.actions}>
                <button ref={playAgainRef} type="button" className={felt.primary} onClick={table.playAgain} disabled={!connected || opening}>
                  {opening ? 'Opening…' : 'Play again'}
                </button>
                <button type="button" className={felt.secondary} onClick={table.leaveTable}>
                  Back to the room
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
