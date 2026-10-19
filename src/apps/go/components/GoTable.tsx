import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RefObject } from 'react'
import type { GoTableActions } from '@/hooks/useGoTable'
import felt from '@/apps/cards/felt.module.css'
import AboutGame from '@/apps/lobby/components/AboutGame'
import { formatClock } from '@/apps/chess/rules'
import type { GoBoardSize, GoColor, GoResult, GoView } from '../wire'
import { unlockGoSounds } from '../sounds'
import { CLOCKS, SIZES, clockLine } from '../terms'
import { useGoSounds } from '../useGoSounds'
import styles from './GoTable.module.css'

// The board as the hub sends it, black's side nowhere in particular: go
// has no orientation. On your turn a tap on an empty point plays it; the
// hub refuses anything illegal in band. Once both pass, a seated tap on a
// stone marks its group dead or alive again, and the seat on turn may
// still play on. The viewer's clock sits under the
// board; a watcher, in no seat, sees Black's there and touches nothing.
// The chrome is the felt's.

export interface GoTableProps {
  playerId: string
  connected: boolean
  view: GoView
  table: GoTableActions & { opening: boolean }
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

// A first game's worth of shape, not a curriculum.
const TIPS = [
  'Corners first, then sides, then the center: walls on two edges make territory cheapest.',
  'Count liberties. A group with one left (atari) is captured on the next move unless it runs or gets help.',
  'A group lives with two separate eyes. A group under attack needs room to make them.',
  'Keep your stones connected; cut your opponent’s apart.',
  'Don’t chase captures for their own sake. Territory and strong groups win.',
  'Reply to atari, but ask first whether the stones are worth saving.',
  'When nothing is urgent, play the biggest open area. When something is, play there.'
]

// Out of the lobby's stacking context so its chrome can't sit above the
// dim; Escape is marked handled so the command menu doesn't open too, and
// Tab stays in the card since aria-modal doesn't.
const Tips = ({ onClose }: { onClose: () => void }) => {
  const card = useRef<HTMLDivElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    close.current?.focus()
    return () => opener?.focus()
  }, [])
  return createPortal(
    <div className={styles.scrim} onClick={onClose}>
      <div
        ref={card}
        className={styles.tips}
        role="dialog"
        aria-modal="true"
        aria-labelledby="go-tips"
        onClick={event => event.stopPropagation()}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          } else if (event.key === 'Tab') {
            const focusable = card.current?.querySelectorAll<HTMLElement>('a, button')
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
        }}
      >
        <h2 id="go-tips">Tips for beginners</h2>
        <ul>
          {TIPS.map(tip => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <p>
          Learn the rules hands-on with{' '}
          <a href="https://online-go.com/learn-to-play-go" target="_blank" rel="noreferrer">
            OGS’s interactive tutorial
          </a>
          .
        </p>
        <button ref={close} type="button" className={felt.link} onClick={onClose}>
          Close
        </button>
      </div>
    </div>,
    document.body
  )
}

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
  const running = (view.phase === 'playing' || view.phase === 'scoring') && view.sideToMove === color
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

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

// One point in the tab order, the cursor; the arrows move it.
const Board = ({
  view,
  onPlay,
  onMark,
  cursor,
  boardRef
}: {
  view: GoView
  onPlay?: (x: number, y: number) => void
  // In the scoring: a tap on a stone toggles its group.
  onMark?: (x: number, y: number) => void
  cursor: [number, number]
  boardRef: RefObject<SVGSVGElement | null>
}) => {
  const size = view.size ?? 19
  const rows = view.board ?? []
  const edge = size - 1
  const last = view.lastMove
  const dead = new Set((view.dead ?? []).map(({ x, y }) => `${x}-${y}`))
  const focusPoint = (x: number, y: number) => boardRef.current?.querySelector<SVGElement>(`[data-point="${x}-${y}"]`)?.focus()
  return (
    <svg ref={boardRef} className={styles.board} viewBox={`-1 -1 ${size + 1} ${size + 1}`} role="group" aria-label="board">
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
        [...row].map((point, x) =>
          point === 'b' || point === 'w' ? (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={0.47}
              className={styles.stone}
              data-color={point === 'b' ? 'black' : 'white'}
              data-dead={dead.has(`${x}-${y}`) ? 'true' : undefined}
            />
          ) : null
        )
      )}
      {(view.dead ?? []).map(({ x, y }) => (
        // A cross as well as the fade: a faded white stone is near the wood's colour.
        <path key={`dead-${x}-${y}`} d={`M${x - 0.25} ${y - 0.25}L${x + 0.25} ${y + 0.25}M${x + 0.25} ${y - 0.25}L${x - 0.25} ${y + 0.25}`} className={styles.deadMark} data-testid={`go-dead-${x}-${y}`} />
      ))}
      {last?.x !== undefined && last.y !== undefined && (
        <circle cx={last.x} cy={last.y} r={0.2} className={styles.lastMove} data-color={last.color} data-testid="go-last-move" />
      )}
      {rows.flatMap((row, y) =>
        [...row].map((point, x) => {
          const name = pointName(x, y, size)
          const stone = point === 'b' ? 'black' : point === 'w' ? 'white' : undefined
          const isDead = dead.has(`${x}-${y}`)
          const act = stone === undefined ? onPlay : onMark
          const playable = act !== undefined
          const marking = onMark === undefined ? '' : isDead ? ': mark alive' : ': mark dead'
          const label = stone === undefined ? (playable ? `Play ${name}` : name) : `${name}, ${stone} stone${isDead ? ', dead' : ''}${marking}`
          return (
            <rect
              key={`${x}-${y}`}
              data-point={`${x}-${y}`}
              x={x - 0.5}
              y={y - 0.5}
              width={1}
              height={1}
              className={styles.point}
              data-playable={playable ? 'true' : undefined}
              role={playable ? 'button' : 'img'}
              tabIndex={cursor[0] === x && cursor[1] === y ? 0 : -1}
              aria-label={label}
              onClick={playable ? () => act(x, y) : undefined}
              onKeyDown={event => {
                const step = ARROWS[event.key]
                if (step !== undefined) {
                  event.preventDefault()
                  focusPoint(Math.min(edge, Math.max(0, x + step[0])), Math.min(edge, Math.max(0, y + step[1])))
                } else if (playable && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault()
                  act(x, y)
                }
              }}
            />
          )
        })
      )}
    </svg>
  )
}

const GoTable = ({ playerId, connected, view, table }: GoTableProps) => {
  // A size picked holds while the table's size is the one it was picked
  // against; otherwise the picker shows the table's.
  const [sizeChoice, setSizeChoice] = useState<{ against?: GoBoardSize; size: GoBoardSize } | null>(null)
  const size = sizeChoice !== null && sizeChoice.against === view.size ? sizeChoice.size : (view.size ?? view.terms?.size ?? 19)
  // The offered clocks, and a posted challenge's among them even when it
  // is none of those, so updating the challenge never quietly changes it.
  const clocks =
    view.terms === undefined
      ? CLOCKS
      : {
          ...CLOCKS,
          [clockLine(view.terms.initialSeconds, view.terms.incrementSeconds)]: {
            initialSeconds: view.terms.initialSeconds,
            incrementSeconds: view.terms.incrementSeconds
          }
        }
  // The posted challenge's clock shows until another is picked; a pick no
  // longer offered falls back.
  const [clockChoice, setClock] = useState<string | null>(null)
  const clock =
    clockChoice !== null && clockChoice in clocks
      ? clockChoice
      : view.terms === undefined
        ? Object.keys(CLOCKS)[0]
        : clockLine(view.terms.initialSeconds, view.terms.incrementSeconds)
  // Held for one view: any move answered puts the question away.
  const [confirmResign, setConfirmResign] = useState<GoView | null>(null)
  // Held for one phase: the game ending or starting puts them away.
  const [tipsPhase, setTipsPhase] = useState<GoView['phase'] | null>(null)
  const boardSize = view.size ?? 19
  const center = Math.floor(boardSize / 2)
  const [cursor, setCursor] = useState<[number, number]>([center, center])
  const boardRef = useRef<SVGSVGElement>(null)
  const { muted, toggleMuted } = useGoSounds(view)
  const resignRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const playAgainRef = useRef<HTMLButtonElement>(null)
  // Where focus goes once the resignation's control that had it is gone.
  const refocus = useRef<'resign' | 'confirm' | null>(null)
  useEffect(() => {
    const target = refocus.current
    if (target === null) return
    refocus.current = null
    if (target === 'resign') resignRef.current?.focus()
    else confirmRef.current?.focus()
  })
  // The game's end is where the next thing to do is: another game.
  useEffect(() => {
    if (view.phase === 'ended' || view.phase === 'closed') playAgainRef.current?.focus()
  }, [view.phase])
  const me = view.players.find(player => player.playerId === playerId)
  const watching = me === undefined
  const alone = view.players.length < 2
  // A round robin pairing's table plays its one game on the round robin's
  // terms: nothing to pick, post or play next.
  const pairing = view.roundRobinId !== undefined
  const mine: GoColor = me?.color ?? 'black'
  const theirs: GoColor = mine === 'black' ? 'white' : 'black'
  // A cursor off a smaller board comes back to its center.
  const shownCursor: [number, number] = cursor[0] < boardSize && cursor[1] < boardSize ? cursor : [center, center]
  const scoring = view.phase === 'scoring'
  const myTurn = (view.phase === 'playing' || scoring) && view.currentPlayerId === playerId
  const canPlay = myTurn && connected && !table.sent
  const canMark = scoring && !watching && connected && !table.sent
  const accepted = view.scoring?.acceptedBy.includes(playerId) ?? false
  const nameOf = (color: GoColor) => {
    const seat = view.players.find(player => player.color === color)
    return seat === undefined ? colorName(color) : seat.playerId === playerId ? `${seat.playerId} (you)` : seat.playerId
  }

  const status = (() => {
    if (view.phase === 'waiting') {
      const terms = view.terms
      if (pairing) {
        const said =
          terms === undefined
            ? 'Round robin pairing.'
            : `Round robin pairing: ${terms.size}×${terms.size}, komi ${terms.komi}, ${clockLine(terms.initialSeconds, terms.incrementSeconds)}.`
        // The hub starts it as the second seat fills.
        if (!alone) return said
        return watching ? `${said} It starts when both players sit.` : `${said} It starts when your opponent sits.`
      }
      if (terms !== undefined) {
        const posted = `Challenge posted: ${terms.size}×${terms.size}, komi ${terms.komi}, ${clockLine(terms.initialSeconds, terms.incrementSeconds)}.`
        return watching || view.players.length > 1 ? posted : `${posted} Whoever joins starts on it.`
      }
      if (watching) return 'Waiting for the players to start.'
      return view.players.length < 2 ? 'Post a challenge, or wait for a second seat.' : 'Pick a board and clock, then start.'
    }
    if (view.phase === 'ended' || view.result !== undefined) return view.result === undefined ? '' : describeResult(view.result, playerId)
    if (view.phase === 'closed') return watching ? 'The table closed.' : 'Your opponent left the table.'
    if (scoring) {
      const count = view.scoring === undefined ? '' : ` Black ${view.scoring.score.black}, White ${view.scoring.score.white}.`
      const accepts = (view.scoring?.acceptedBy ?? []).map(id => (id === playerId ? ' You accept.' : ` ${id} accepts.`)).join('')
      if (watching) return `Scoring: the players mark dead stones.${count}${accepts}`
      return `Mark the dead stones, then accept${myTurn ? ', or play on' : ''}.${count}${accepts}`
    }
    // The board only shows the last move; say it.
    const last = view.lastMove
    const said =
      last === undefined
        ? ''
        : last.pass
          ? `${colorName(last.color)} passed. `
          : last.x !== undefined && last.y !== undefined
            ? `${colorName(last.color)} played ${pointName(last.x, last.y, boardSize)}. `
            : ''
    return myTurn ? `${said}Your move.` : `${said}${view.currentPlayerId ?? ''} to move.`
  })()

  const sizePicker = (label: string) => (
    <select aria-label={label} value={size} onChange={event => setSizeChoice({ against: view.size, size: Number(event.target.value) as GoBoardSize })}>
      {SIZES.map(size => (
        <option key={size} value={size}>
          {size}×{size}
        </option>
      ))}
    </select>
  )

  return (
    <div className={styles.table} data-phase={view.phase} onPointerDownCapture={unlockGoSounds} onKeyDownCapture={unlockGoSounds}>
      {tipsPhase === view.phase && <Tips onClose={() => setTipsPhase(null)} />}
      <h1 className={felt.title}>
        {watching ? 'Watching go' : 'Go'} {view.gameId}
        {view.size !== undefined && ` · ${view.size}×${view.size}`}
        {view.komi !== undefined && ` · komi ${view.komi}`}
      </h1>
      <div className={felt.tableHeader}>
        <p className={felt.hint} role="status" data-testid="go-status">
          {status}
        </p>
        <button type="button" className={felt.link} onClick={toggleMuted}>
          {muted ? 'Sound off' : 'Sound on'}
        </button>
        <button type="button" className={styles.help} onClick={() => setTipsPhase(view.phase)} aria-label="Tips for beginners">
          ?
        </button>
        {watching ? (
          <button type="button" className={felt.link} onClick={table.leaveTable}>
            Stop watching
          </button>
        ) : (
          view.phase === 'waiting' && (
            <button type="button" className={felt.link} onClick={table.leaveTable} disabled={!connected}>
              Leave table
            </button>
          )
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
          {!watching && !pairing && (
            <div className={styles.actions}>
              {sizePicker('Board size')}
              <select aria-label="Clock" value={clock} onChange={event => setClock(event.target.value)}>
                {Object.keys(clocks).map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {/* Alone, the choice is posted as a challenge that whoever
                  joins starts on; with two seats, it starts the game. */}
              <button
                type="button"
                className={felt.primary}
                onClick={() => (alone ? table.postChallenge : table.startTable)({ size, ...clocks[clock] })}
                disabled={!connected}
              >
                {!alone ? 'Start' : view.terms === undefined ? 'Post challenge' : 'Update challenge'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.play}>
          <Clock view={view} color={theirs} name={nameOf(theirs)} />
          <div
            className={styles.boardSlot}
            onFocus={event => {
              const point = (event.target as Element).getAttribute('data-point')?.split('-').map(Number)
              if (point?.length === 2) setCursor([point[0], point[1]])
            }}
          >
            <Board
              view={view}
              onPlay={canPlay ? table.play : undefined}
              onMark={canMark ? table.markDead : undefined}
              cursor={shownCursor}
              boardRef={boardRef}
            />
          </div>
          <Clock view={view} color={mine} name={nameOf(mine)} />
          <div className={styles.foot}>
            {(view.phase === 'playing' || scoring) && me !== undefined && (
              <div className={styles.actions}>
                {scoring ? (
                  <button
                    type="button"
                    className={felt.primary}
                    onClick={() => {
                      // Accept is disabled until the hub answers: focus waits on the board.
                      boardRef.current?.querySelector<SVGElement>('[tabindex="0"]')?.focus()
                      table.accept()
                    }}
                    disabled={!connected || table.sent || accepted}
                  >
                    Accept
                  </button>
                ) : (
                  <button
                    type="button"
                    className={felt.secondary}
                    onClick={() => {
                      // Pass is disabled until the hub answers: focus waits on the board.
                      boardRef.current?.querySelector<SVGElement>('[tabindex="0"]')?.focus()
                      table.pass()
                    }}
                    disabled={!canPlay}
                  >
                    Pass
                  </button>
                )}
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
            {(view.phase === 'ended' || view.phase === 'closed') && me !== undefined && (
              <div className={styles.actions}>
                {view.phase === 'ended' && !pairing && sizePicker('Next board size')}
                {!pairing && (
                  <button
                    ref={playAgainRef}
                    type="button"
                    className={felt.primary}
                    onClick={() => table.playAgain(view.phase === 'ended' ? size : undefined)}
                    disabled={!connected || table.opening}
                  >
                    {table.opening ? 'Opening…' : view.phase === 'ended' ? 'Next game' : 'Play again'}
                  </button>
                )}
                {/* A pairing's table has no next game: focus lands on leaving. */}
                <button type="button" ref={pairing ? playAgainRef : undefined} className={felt.secondary} onClick={table.leaveTable}>
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
