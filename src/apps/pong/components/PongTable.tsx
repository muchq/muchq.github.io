import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import felt from '@/apps/castle/components/CastleTable.module.css'
import AboutGame from '@/apps/lobby/components/AboutGame'
import type { UsePongTable } from '@/hooks/usePongTable'
import { aimFor, canvasPoint, extrapolate, flatSize, pongName, tunnelSize, viewSeat, type Seat } from '../court'
import { drawFlat, drawTunnel, type Scene } from '../draw'
import { BOT_LEVELS, VARIANTS, variantLabel, type PongCourt, type PongVariant, type PongView } from '../wire'
import styles from './PongTable.module.css'

// The table from the viewer's seat: the court drawn each animation frame
// from the newest frame the hub sent, the ball moved on by its velocity
// between them. A seat steers its paddle with the pointer over the court
// or the arrow keys; the hub chases where it asks at the court's speed.
// A watcher sees it from the second seat's side and touches nothing.

export interface PongTableProps {
  playerId: string
  connected: boolean
  view: PongView
  table: Pick<UsePongTable, 'opening' | 'seating' | 'latestFrame' | 'startTable' | 'playAgain' | 'leaveTable' | 'addBot' | 'aim' | 'aimNow'>
}

// Where each arrow key runs the paddle: the court's edge on its axis,
// seen from the seat (from behind end 1, x runs right to left).
const keyTarget = (court: PongCourt, seat: Seat, key: string, paddle: { x: number; y: number }): { x: number; y: number } | null => {
  const left = seat === 0 ? 0 : court.width
  const right = court.width - left
  if (key === 'ArrowUp') return { x: paddle.x, y: 0 }
  if (key === 'ArrowDown') return { x: paddle.x, y: court.height }
  if (court.width > 0 && key === 'ArrowLeft') return { x: left, y: paddle.y }
  if (court.width > 0 && key === 'ArrowRight') return { x: right, y: paddle.y }
  return null
}

// From `from` toward `to`, no further than `reach` on each axis.
const toward = (from: number, to: number, reach: number): number => from + Math.sign(to - from) * Math.min(reach, Math.abs(to - from))

const lifeLine = (lives: number | undefined): string => (lives === undefined ? '' : ` · ${lives} ${lives === 1 ? 'life' : 'lives'}`)

// Before the first frame, and between games: the ball waiting at the
// centre, both paddles centred.
const restingScene = (court: PongCourt, view: PongView): Scene => ({
  ball: { x: court.width / 2, y: court.height / 2, z: court.depth / 2 },
  paddles: [0, 1].map(() => ({ x: court.width / 2, y: court.height / 2 })),
  serveIn: 0,
  lives: view.players.map(player => player.lives ?? 0)
})

const PongTable = ({ playerId, connected, view, table }: PongTableProps) => {
  const ids = view.players.map(player => player.playerId)
  const watching = !ids.includes(playerId)
  const seat: Seat = viewSeat(ids, playerId)
  const court = view.court
  const pairing = view.roundRobinId !== undefined
  const alone = view.players.length < 2
  const [variant, setVariant] = useState<PongVariant>(view.variant ?? 'smallcat')
  const [botLevel, setBotLevel] = useState(2)
  // Leaving mid-game forfeits it, so it asks first; the question is about
  // one game, named by its table and how many games came before it.
  const thisGame = `${view.gameId}#${view.scoreSheet.length}`
  const [forfeitAsked, setForfeitAsked] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const againRef = useRef<HTMLButtonElement>(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const { latestFrame, aim, aimNow } = table
  // The arrow key held and where it runs the paddle.
  const heldKey = useRef<{ key: string; target: { x: number; y: number } } | null>(null)

  // Drawn every animation frame while the court is up; the frames
  // themselves never re-render this.
  useEffect(() => {
    if (court === undefined) return
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx === null || ctx === undefined) return
    const draw = court.width === 0 ? drawFlat : drawTunnel
    let handle = 0
    const paint = () => {
      const held = latestFrame()
      const lives = viewRef.current.players.map(player => player.lives ?? 0)
      const scene: Scene =
        held === null
          ? restingScene(court, viewRef.current)
          : {
              ball: extrapolate(held.frame, court, performance.now() - held.receivedAt),
              paddles: held.frame.paddles,
              serveIn: held.frame.serveIn,
              lives
            }
      draw(ctx, court, seat, scene)
      handle = requestAnimationFrame(paint)
    }
    paint()
    return () => cancelAnimationFrame(handle)
  }, [court, seat, latestFrame])

  // A seat in play takes the keyboard on its court.
  const playing = view.phase === 'playing' && !watching
  useEffect(() => {
    if (playing) canvasRef.current?.focus()
  }, [playing])
  const confirming = playing && forfeitAsked === thisGame
  const setConfirming = (asked: boolean) => setForfeitAsked(asked ? thisGame : null)
  // Once the game is over the court no longer answers: the keyboard lands
  // on the next game instead.
  const over = view.phase === 'ended' || view.phase === 'closed'
  useEffect(() => {
    if (over) againRef.current?.focus()
  }, [over])

  // A pressed key runs the paddle for its edge at full speed, so holding it
  // needs no help from the keyboard's repeat.
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (!playing || court === undefined) return
    const paddle = latestFrame()?.frame.paddles[seat]
    if (paddle === undefined) return
    const target = keyTarget(court, seat, event.key, paddle)
    if (target === null) return
    event.preventDefault()
    if (event.repeat) return
    heldKey.current = { key: event.key, target }
    aimNow(target.x, target.y)
  }
  // Letting go stops it where it has got to: the last frame's paddle, run
  // on toward the key's edge at the court's speed since that frame.
  const onKeyUp = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const held = heldKey.current
    if (held === null || held.key !== event.key) return
    heldKey.current = null
    const last = latestFrame()
    const paddle = last?.frame.paddles[seat]
    if (!playing || court === undefined || last === null || paddle === undefined) return
    const reach = (court.playerSpeed * (performance.now() - last.receivedAt) * court.ticksPerSecond) / 1000
    aimNow(toward(paddle.x, held.target.x, reach), toward(paddle.y, held.target.y, reach))
  }
  // On touch a pointer moves only while it drags, so a tap aims too.
  const onPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!playing || court === undefined) return
    const box = event.currentTarget.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return
    const size = court.width === 0 ? flatSize(court) : tunnelSize(court)
    const target = aimFor(court, seat, canvasPoint(box, size, { x: event.clientX, y: event.clientY }))
    aim(target.x, target.y)
  }

  const status = (() => {
    if (view.phase === 'waiting') {
      if (pairing) return watching ? 'Round robin pairing: it starts when both players sit.' : 'Round robin pairing: it starts when your opponent sits.'
      if (watching) return 'Waiting for the players to start.'
      return alone ? 'Waiting for a second seat.' : 'Pick a court, then start.'
    }
    const result = view.result
    if (view.phase === 'closed') {
      if (result?.ending === 'abandoned') {
        if (result.winner === playerId) return 'You won: your opponent left.'
        return `${pongName(result.winner)} won: the other seat left.`
      }
      if (watching) return 'The table closed.'
      const left = view.players.find(player => player.playerId !== playerId)
      return `${left === undefined ? 'Your opponent' : pongName(left.playerId)} left the table.`
    }
    if (view.phase === 'ended' && result !== undefined) return result.winner === playerId ? 'You won.' : `${pongName(result.winner)} won.`
    if (watching) return ids.map(pongName).join(' – ')
    return court?.width === 0
      ? 'You’re red, on the right. Steer with the pointer or the arrow keys.'
      : 'You’re red, nearest you. Steer with the pointer or the arrow keys.'
  })()

  const courtPick = (
    <select aria-label="Court" value={variant} onChange={event => setVariant(event.target.value as PongVariant)} disabled={!connected}>
      {VARIANTS.map(option => (
        <option key={option.variant} value={option.variant}>
          {option.label}
        </option>
      ))}
    </select>
  )
  const size = court === undefined ? null : court.width === 0 ? flatSize(court) : tunnelSize(court)

  return (
    <div className={styles.table} data-phase={view.phase}>
      <h1 className={felt.title}>
        {watching ? 'Watching pong' : 'Pong'} {view.gameId}
        {view.variant === undefined ? '' : ` · ${variantLabel(view.variant)}`}
      </h1>
      <div className={felt.tableHeader}>
        <p className={felt.hint} role="status">
          {status}
        </p>
        {watching ? (
          <button type="button" className={felt.link} onClick={table.leaveTable}>
            Stop watching
          </button>
        ) : confirming ? (
          <span className={styles.controls}>
            Forfeit this game?
            <button type="button" className={felt.link} onClick={table.leaveTable} disabled={!connected}>
              Forfeit
            </button>
            <button
              type="button"
              className={felt.link}
              onClick={() => {
                setConfirming(false)
                canvasRef.current?.focus()
              }}
            >
              Keep playing
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={felt.link}
            onClick={view.phase === 'playing' ? () => setConfirming(true) : table.leaveTable}
            disabled={!connected && view.phase !== 'closed'}
          >
            {view.phase === 'playing' ? 'Leave (forfeits)' : 'Leave table'}
          </button>
        )}
      </div>
      <ul className={styles.seats} aria-label="Players">
        {view.players.map((player, index) => (
          <li key={player.playerId}>
            {player.playerId === playerId ? `${player.playerId} (you)` : pongName(player.playerId)}
            {court === undefined ? '' : ` · ${index === seat ? 'red' : 'green'}`}
            {lifeLine(player.lives)}
          </li>
        ))}
      </ul>

      {court !== undefined && size !== null && view.variant !== undefined && (
        <canvas
          ref={canvasRef}
          className={styles.court}
          width={size.width}
          height={size.height}
          role="img"
          aria-label={`pong court, ${variantLabel(view.variant)}`}
          tabIndex={watching ? undefined : 0}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
        />
      )}

      {view.phase === 'waiting' && <AboutGame game="pong" className={felt.hint} />}
      {!watching && !pairing && (
        <div className={styles.controls}>
          {view.phase === 'waiting' && alone && (
            <>
              <select aria-label="Bot level" value={botLevel} onChange={event => setBotLevel(Number(event.target.value))} disabled={!connected}>
                {BOT_LEVELS.map(({ level, label }) => (
                  <option key={level} value={level}>
                    {label}
                  </option>
                ))}
              </select>
              <button type="button" className={felt.secondary} onClick={() => table.addBot(botLevel)} disabled={!connected || table.seating}>
                Add a bot
              </button>
            </>
          )}
          {view.phase === 'waiting' && !alone && (
            <>
              {courtPick}
              <button type="button" className={felt.primary} onClick={() => table.startTable(variant)} disabled={!connected}>
                Start
              </button>
            </>
          )}
          {(view.phase === 'ended' || view.phase === 'closed') && (
            <>
              {view.phase === 'ended' && courtPick}
              <button ref={againRef} type="button" className={felt.primary} onClick={() => table.playAgain(variant)} disabled={!connected || table.opening}>
                Play again
              </button>
            </>
          )}
        </div>
      )}

      {view.scoreSheet.length > 0 && (
        <ol className={styles.sheet} aria-label="Score sheet">
          {view.scoreSheet.map((line, i) => (
            <li key={i}>
              Game {i + 1}: {pongName(line.winner)}
              {line.ending === 'abandoned' ? ' (abandoned)' : ''}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default PongTable
