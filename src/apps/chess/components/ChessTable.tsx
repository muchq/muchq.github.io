import { useEffect, useId, useRef, useState } from 'react'
import type { ChessTableActions } from '@/hooks/useChessTable'
import type { ChessColor, ChessResult, ChessView } from '../wire'
import { describeResult, formatClock, glyph, lastMoveSquares, movesTo, pieceName, readBoard, squaresFor, targetsFrom } from '../rules'
import styles from './ChessTable.module.css'

// The board from the viewer's chair: their side at the bottom, the
// opponent's clock above it and their own below. A tap on a piece offers
// the moves the hub listed for it, and a tap on one of those plays it;
// the hub refuses anything else in band.

export interface ChessTableProps {
  playerId: string
  connected: boolean
  view: ChessView
  table: ChessTableActions & { ended: ChessResult | null; opening: boolean }
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

// The running side's time, counted down from the moment its view
// arrived. The hub stamps each view with the time left as it built it,
// so the count starts from there rather than from the turn's start.
function useRunningClock(view: ChessView): { white: number; black: number } {
  const [arrived, setArrived] = useState(() => ({ view, at: Date.now() }))
  const [now, setNow] = useState(() => Date.now())
  if (arrived.view !== view) setArrived({ view, at: Date.now() })
  const running = view.phase === 'playing' ? view.sideToMove : undefined
  useEffect(() => {
    if (running === undefined) return
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [running, view])
  const clock = view.clock
  if (clock === undefined) return { white: 0, black: 0 }
  const elapsed = Math.max(0, now - arrived.at)
  return {
    white: running === 'white' ? clock.whiteMs - elapsed : clock.whiteMs,
    black: running === 'black' ? clock.blackMs - elapsed : clock.blackMs
  }
}

const ChessTable = ({ playerId, connected, view, table }: ChessTableProps) => {
  const { ended, opening } = table
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  const targetNote = useId()
  // The square picked up, and the promotion waiting on a piece — both
  // keyed to the view they were made against, so a new position drops
  // them rather than moving a piece that is no longer there.
  const [picked, setPicked] = useState<{ view: ChessView; square: string } | null>(null)
  const [promoting, setPromoting] = useState<{ view: ChessView; moves: string[] } | null>(null)
  const [confirmResign, setConfirmResign] = useState<ChessView | null>(null)
  const [clockChoice, setClockChoice] = useState('3+2')
  const clocks = useRunningClock(view)

  const me = view.players.find(player => player.playerId === playerId)
  const myColor: ChessColor = me?.color ?? 'white'
  const opponent = view.players.find(player => player.playerId !== playerId)
  const myTurn = view.phase === 'playing' && view.currentPlayerId === playerId
  const from = picked?.view === view ? picked.square : null
  const pendingPromotion = promoting?.view === view ? promoting.moves : null
  const targets = from === null ? [] : targetsFrom(view.legalMoves, from)
  const board = readBoard(view.fen)
  const last = lastMoveSquares(view.moves)
  // The king of the side to move — or, once mated, of the side that was.
  const checkedKing = view.inCheck ? (view.fen?.split(' ')[1] === 'b' ? 'k' : 'K') : null

  const tap = (square: string) => {
    if (!myTurn || !connected) return
    if (from !== null && targets.includes(square)) {
      const moves = movesTo(view.legalMoves, from, square)
      setPicked(null)
      if (moves.length === 1) table.play(moves[0])
      else setPromoting({ view, moves })
      return
    }
    // Another of the viewer's pieces with a move picks it up; anything
    // else lets go.
    const movable = targetsFrom(view.legalMoves, square).length > 0
    setPicked(movable && square !== from ? { view, square } : null)
  }

  const status = (() => {
    if (view.phase === 'waiting') return view.players.length < 2 ? 'Waiting for a second seat.' : 'Pick a clock and start.'
    if (view.phase === 'ended') return ''
    if (myTurn) return view.inCheck ? 'Check. Your move.' : 'Your move.'
    return `${view.currentPlayerId ?? ''} to move.`
  })()

  const renderClock = (seatId: string | undefined, color: ChessColor | undefined) => {
    if (seatId === undefined || color === undefined || view.clock === undefined) return null
    const ms = color === 'white' ? clocks.white : clocks.black
    const running = view.phase === 'playing' && view.sideToMove === color
    return (
      <div className={`${styles.clockRow} ${running ? styles.running : ''}`}>
        <span className={styles.clockName}>
          {seatId === playerId ? `${seatId} (you)` : seatId} · {color}
        </span>
        <span role="timer" aria-label={`${seatId}’s clock`} className={`${styles.clock} ${ms < 10_000 ? styles.low : ''}`}>
          {formatClock(ms)}
        </span>
      </div>
    )
  }

  return (
    <div className={styles.table} data-phase={view.phase}>
      <div className={styles.tableHeader}>
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          Chess {view.gameId}
          {view.variant === 'kpk' && <span className={styles.muted}> · king and pawn</span>}
        </h1>
        <p className={styles.hint} role="status">
          {status}
        </p>
        {view.phase !== 'ended' && (
          <button type="button" className={styles.link} onClick={table.leaveTable} disabled={!connected}>
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
            className={styles.primary}
            onClick={() => table.startTable(CLOCKS[clockChoice])}
            disabled={view.players.length < 2 || !connected}
          >
            Start
          </button>
        </div>
      ) : (
        <div className={styles.play}>
          {renderClock(opponent?.playerId, opponent?.color)}
          <span id={targetNote} className={styles.srOnly}>
            a move
          </span>
          <div className={styles.board} role="group" aria-label="board">
            {squaresFor(myColor).map(square => {
              const piece = board.get(square)
              const light = (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 1
              const target = targets.includes(square)
              return (
                <button
                  key={square}
                  type="button"
                  className={`${styles.square} ${light ? styles.light : styles.dark} ${target ? styles.target : ''}`}
                  aria-label={piece === undefined ? square : `${square}, ${pieceName(piece)}`}
                  aria-pressed={from === square}
                  aria-describedby={target ? targetNote : undefined}
                  data-last={last.includes(square) ? 'true' : undefined}
                  data-check={piece !== undefined && piece === checkedKing ? 'true' : undefined}
                  onClick={() => tap(square)}
                >
                  {piece !== undefined && (
                    <span className={piece === piece.toUpperCase() ? styles.whitePiece : styles.blackPiece} aria-hidden="true">
                      {glyph(piece)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {renderClock(me?.playerId, me?.color)}

          {pendingPromotion !== null && (
            <div className={styles.promotion} role="group" aria-label="promote to">
              {PROMOTIONS.map(({ letter, name }) => {
                const uci = pendingPromotion.find(move => move.endsWith(letter))
                if (uci === undefined) return null
                return (
                  <button
                    key={letter}
                    type="button"
                    className={styles.secondary}
                    aria-label={name}
                    onClick={() => {
                      setPromoting(null)
                      table.play(uci)
                    }}
                  >
                    <span aria-hidden="true">{glyph(myColor === 'white' ? letter.toUpperCase() : letter)}</span> {name}
                  </button>
                )
              })}
              <button type="button" className={styles.link} onClick={() => setPromoting(null)}>
                Cancel
              </button>
            </div>
          )}

          {view.phase === 'playing' && me !== undefined && (
            <div className={styles.actions}>
              {confirmResign === view ? (
                <>
                  <button type="button" className={styles.danger} onClick={table.resign} disabled={!connected}>
                    Confirm resign
                  </button>
                  <button type="button" className={styles.link} onClick={() => setConfirmResign(null)}>
                    Keep playing
                  </button>
                </>
              ) : (
                <button type="button" className={styles.secondary} onClick={() => setConfirmResign(view)} disabled={!connected}>
                  Resign
                </button>
              )}
            </div>
          )}

          {view.phase === 'ended' && (
            <div className={styles.ending}>
              <p role="status" className={styles.result}>
                {view.result !== undefined ? describeResult(view.result, playerId) : ''}
              </p>
              <div className={styles.actions}>
                {ended !== null && (
                  <button type="button" className={styles.primary} onClick={table.playAgain} disabled={!connected || opening}>
                    {opening ? 'Opening…' : 'Play again'}
                  </button>
                )}
                <button type="button" className={styles.secondary} onClick={table.leaveTable}>
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
