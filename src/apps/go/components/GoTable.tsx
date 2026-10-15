import { useEffect, useState } from 'react'
import type { GoTableActions } from '@/hooks/useGoTable'
import felt from '@/apps/cards/felt.module.css'
import AboutGame from '@/apps/lobby/components/AboutGame'
import { formatClock } from '@/apps/chess/rules'
import type { GoBoardSize, GoColor, GoResult, GoView } from '../wire'
import styles from './GoTable.module.css'

// The board as the hub sends it, black's side nowhere in particular: go
// has no orientation. On your turn a tap on an empty point plays it; the
// hub refuses anything illegal in band. The chrome is the felt's.

export interface GoTableProps {
  playerId: string
  connected: boolean
  view: GoView
  table: GoTableActions & { opening: boolean }
}

const SIZES: GoBoardSize[] = [9, 13, 19]

const CLOCKS: Record<string, { initialSeconds: number; incrementSeconds: number }> = {
  '10+5': { initialSeconds: 600, incrementSeconds: 5 },
  '5+3': { initialSeconds: 300, incrementSeconds: 3 },
  '20+10': { initialSeconds: 1200, incrementSeconds: 10 }
}

// Columns are lettered without I, as go boards are.
const COLUMNS = 'ABCDEFGHJKLMNOPQRST'
const pointName = (x: number, y: number, size: number) => `${COLUMNS[x]}${size - y}`

const STARS: Record<number, number[]> = { 9: [2, 4, 6], 13: [3, 6, 9], 19: [3, 9, 15] }
const starPoints = (size: number): Array<[number, number]> => {
  const lines = STARS[size] ?? []
  // A 9×9 board marks its four 3-3 points and the center, not the sides.
  return lines.flatMap(x => lines.map(y => [x, y] as [number, number])).filter(([x, y]) => size !== 9 || (x === 4) === (y === 4))
}

const TICK_MS = 100

const colorName = (color: GoColor) => (color === 'black' ? 'Black' : 'White')

function describeResult(result: GoResult, playerId: string): string {
  const scores = result.score === undefined ? '' : ` Black ${result.score.black}, White ${result.score.white}.`
  const winner = result.winner === undefined ? 'Nobody' : result.winner === playerId ? 'You' : result.winner
  const color = result.winnerColor === undefined ? '' : ` (${colorName(result.winnerColor)})`
  const how = { score: 'on points', resignation: 'by resignation', timeout: 'on time', abandoned: 'by abandonment' }[result.ending]
  return `${winner}${color} won ${how}.${scores}`
}

// One seat's clock, counting down from when its view arrived.
const Clock = ({ view, color, name }: { view: GoView; color: GoColor; name: string }) => {
  const [arrived, setArrived] = useState(() => ({ view, at: Date.now() }))
  const [now, setNow] = useState(() => Date.now())
  if (arrived.view !== view) setArrived({ view, at: Date.now() })
  const running = view.phase === 'playing' && view.sideToMove === color
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [running])
  const stamped = view.clock === undefined ? 0 : color === 'black' ? view.clock.blackMs : view.clock.whiteMs
  const ms = running ? stamped - Math.max(0, now - arrived.at) : stamped
  return (
    <div className={styles.seat} data-running={running} data-testid={`go-seat-${color}`}>
      <span className={styles.swatch} data-color={color} aria-hidden="true" />
      <span className={styles.name}>{name}</span>
      <span>captured {view.captures?.[color] ?? 0}</span>
      {view.clock !== undefined && <span className={styles.clock}>{formatClock(ms)}</span>}
    </div>
  )
}

const Board = ({ view, onPlay }: { view: GoView; onPlay?: (x: number, y: number) => void }) => {
  const size = view.size ?? 9
  const rows = view.board ?? []
  const edge = size - 1
  const last = view.lastMove
  return (
    <svg className={styles.board} viewBox={`-1 -1 ${size + 1} ${size + 1}`} role="group" aria-label="board">
      <rect x={-1} y={-1} width={size + 1} height={size + 1} className={styles.wood} />
      {Array.from({ length: size }, (_, i) => (
        <g key={i} className={styles.line}>
          <line x1={0} y1={i} x2={edge} y2={i} />
          <line x1={i} y1={0} x2={i} y2={edge} />
        </g>
      ))}
      {starPoints(size).map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={0.1} className={styles.star} />
      ))}
      {rows.flatMap((row, y) =>
        [...row].map((point, x) => {
          if (point === 'b' || point === 'w') {
            return <circle key={`${x}-${y}`} cx={x} cy={y} r={0.47} className={styles.stone} data-color={point === 'b' ? 'black' : 'white'} />
          }
          if (onPlay === undefined) return null
          return (
            <rect
              key={`${x}-${y}`}
              x={x - 0.5}
              y={y - 0.5}
              width={1}
              height={1}
              className={styles.point}
              role="button"
              tabIndex={0}
              aria-label={`Play ${pointName(x, y, size)}`}
              onClick={() => onPlay(x, y)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onPlay(x, y)
                }
              }}
            />
          )
        })
      )}
      {last?.x !== undefined && last.y !== undefined && (
        <circle cx={last.x} cy={last.y} r={0.2} className={styles.lastMove} data-color={last.color} data-testid="go-last-move" />
      )}
    </svg>
  )
}

const GoTable = ({ playerId, connected, view, table }: GoTableProps) => {
  const [size, setBoardSize] = useState<GoBoardSize>(view.size ?? 19)
  const [clock, setClock] = useState(Object.keys(CLOCKS)[0])
  // Held for one view: any move answered puts the question away.
  const [confirmResign, setConfirmResign] = useState<GoView | null>(null)
  const me = view.players.find(player => player.playerId === playerId)
  const myTurn = view.phase === 'playing' && view.currentPlayerId === playerId
  const canPlay = myTurn && connected && !table.sent
  const nameOf = (color: GoColor) => {
    const seat = view.players.find(player => player.color === color)
    return seat === undefined ? colorName(color) : seat.playerId === playerId ? `${seat.playerId} (you)` : seat.playerId
  }

  const status = (() => {
    if (view.phase === 'waiting') return view.players.length < 2 ? 'Waiting for a second seat.' : 'Pick a board and clock, then start.'
    if (view.phase === 'ended' || view.result !== undefined) return view.result === undefined ? '' : describeResult(view.result, playerId)
    if (view.phase === 'closed') return 'Your opponent left the table.'
    const passed = view.lastMove !== undefined && view.lastMove.x === undefined ? `${colorName(view.lastMove.color)} passed. ` : ''
    return myTurn ? `${passed}Your move.` : `${passed}${view.currentPlayerId ?? ''} to move.`
  })()

  const sizePicker = (label: string) => (
    <select aria-label={label} value={size} onChange={event => setBoardSize(Number(event.target.value) as GoBoardSize)}>
      {SIZES.map(size => (
        <option key={size} value={size}>
          {size}×{size}
        </option>
      ))}
    </select>
  )

  return (
    <div className={styles.table} data-phase={view.phase}>
      <h1 className={felt.title}>
        Go {view.gameId}
        {view.size !== undefined && ` · ${view.size}×${view.size}`}
        {view.komi !== undefined && ` · komi ${view.komi}`}
      </h1>
      <div className={felt.tableHeader}>
        <p className={felt.hint} role="status" data-testid="go-status">
          {status}
        </p>
        {view.phase === 'waiting' && (
          <button type="button" className={felt.link} onClick={table.leaveTable} disabled={!connected}>
            Leave table
          </button>
        )}
      </div>

      {view.phase === 'waiting' ? (
        <div className={styles.waiting}>
          <AboutGame game="go" className={felt.hint} />
          <ul>
            {view.players.map(player => (
              <li key={player.playerId}>{player.playerId === playerId ? `${player.playerId} (you)` : player.playerId}</li>
            ))}
          </ul>
          {view.players.length === 2 && (
            <div className={styles.actions}>
              {sizePicker('Board size')}
              <select aria-label="Clock" value={clock} onChange={event => setClock(event.target.value)}>
                {Object.keys(CLOCKS).map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button type="button" className={felt.primary} onClick={() => table.startTable({ size, ...CLOCKS[clock] })} disabled={!connected}>
                Start
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.play}>
          <Clock view={view} color="white" name={nameOf('white')} />
          <div className={styles.boardSlot}>
            <Board view={view} onPlay={canPlay ? table.play : undefined} />
          </div>
          <Clock view={view} color="black" name={nameOf('black')} />
          <div className={styles.foot}>
            {view.phase === 'playing' && me !== undefined && (
              <div className={styles.actions}>
                <button type="button" className={felt.secondary} onClick={table.pass} disabled={!canPlay}>
                  Pass
                </button>
                {confirmResign === view ? (
                  <>
                    <button type="button" className={styles.danger} onClick={table.resign} disabled={!connected}>
                      Confirm resign
                    </button>
                    <button type="button" className={felt.link} onClick={() => setConfirmResign(null)}>
                      Keep playing
                    </button>
                  </>
                ) : (
                  <button type="button" className={felt.secondary} onClick={() => setConfirmResign(view)} disabled={!connected}>
                    Resign
                  </button>
                )}
              </div>
            )}
            {(view.phase === 'ended' || view.phase === 'closed') && me !== undefined && (
              <div className={styles.actions}>
                {view.phase === 'ended' && sizePicker('Next board size')}
                <button
                  type="button"
                  className={felt.primary}
                  onClick={() => table.playAgain(view.phase === 'ended' ? size : undefined)}
                  disabled={!connected || table.opening}
                >
                  {table.opening ? 'Opening…' : view.phase === 'ended' ? 'Next game' : 'Play again'}
                </button>
                <button type="button" className={felt.secondary} onClick={table.leaveTable}>
                  {view.phase === 'ended' ? 'Leave table' : 'Back to the room'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GoTable
