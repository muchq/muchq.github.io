import { useEffect, useId, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import type { ChessTableActions } from '@/hooks/useChessTable'
import felt from '@/apps/castle/components/CastleTable.module.css'
import type { ChessColor, ChessTerms, ChessView } from '../wire'
import { applyMove, describeMove, describeResult, describeExtras, formatClock, imbalance, lastMoveSquares, materialBalance, movesTo, nameOf, pieceImage, pieceName, readBoard, squaresFor, targetsFrom } from '../rules'
import styles from './ChessTable.module.css'
import ScoreSheet from './ScoreSheet'

// The board from the viewer's chair: their side at the bottom, the
// opponent's clock above it and their own below. A tap on a piece offers
// the moves the hub listed for it, and a tap on one of those plays it;
// the hub refuses anything else in band. A watcher, in no chair, sees it
// from White's and touches nothing. The table's chrome is castle's, as
// rummy's is.

export interface ChessTableProps {
  playerId: string
  connected: boolean
  view: ChessView
  table: ChessTableActions & { opening: boolean; seating: boolean }
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

// "5+3": minutes and increment seconds; a clock of odd seconds in seconds.
const clockLabel = (terms: ChessTerms): string =>
  `${terms.initialSeconds % 60 === 0 ? terms.initialSeconds / 60 : `${terms.initialSeconds}s`}+${terms.incrementSeconds}`

const colorOfPiece = (piece: string): ChessColor => (piece === piece.toUpperCase() ? 'white' : 'black')
const other = (color: ChessColor): ChessColor => (color === 'white' ? 'black' : 'white')

// One seat's clock. The hub stamps each view with the time left as it
// built it, so the running side counts down from the moment its view
// arrived. Its own component, so the tick repaints the clock and not the
// board.
const ClockRow = ({
  view,
  seatId,
  color,
  you,
  lead,
  extras
}: {
  view: ChessView
  seatId: string
  color: ChessColor
  you: boolean
  lead: number
  extras: string[]
}) => {
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
      {/* Beside the name, not in it: a long name truncates, the lead stays. */}
      {(extras.length > 0 || lead > 0) && (
        <span className={styles.lead}>
          {/* Drawn as the other side's pieces, as if taken. */}
          {extras.map((kind, i) => (
            <img
              key={i}
              className={styles.extra}
              src={pieceImage(color === 'white' ? kind : kind.toUpperCase())}
              alt=""
              draggable={false}
            />
          ))}
          {lead > 0 && <span aria-hidden="true">+{lead}</span>}
          <span className={felt.srOnly}>
            {extras.length > 0 && `, extra ${describeExtras(extras)}`}
            {lead > 0 && `, up ${lead} in material`}
          </span>
        </span>
      )}
      <span role="timer" aria-label={`${nameOf(seatId)}’s clock`} className={`${styles.clock} ${ms < 10_000 ? styles.low : ''}`}>
        {formatClock(ms)}
      </span>
    </div>
  )
}

// The queued premove as an arrow over the board, in squares as the viewer
// sees them: from the piece's centre to just short of the target's, so the
// head sits on the square it points at.
const PremoveArrow = ({ from, to, squares }: { from: string; to: string; squares: string[] }) => {
  const centre = (square: string) => {
    const index = squares.indexOf(square)
    return [(index % 8) + 0.5, Math.floor(index / 8) + 0.5]
  }
  const [x1, y1] = centre(from)
  const [tx, ty] = centre(to)
  const length = Math.hypot(tx - x1, ty - y1)
  const x2 = tx - ((tx - x1) / length) * 0.3
  const y2 = ty - ((ty - y1) / length) * 0.3
  return (
    <svg className={styles.arrows} viewBox="0 0 8 8" aria-hidden="true">
      <defs>
        <marker id="premove-head" viewBox="0 0 4 4" refX="2" refY="2" markerWidth="3" markerHeight="3" orient="auto">
          <path d="M0,0 L4,2 L0,4 z" className={styles.arrowHead} />
        </marker>
      </defs>
      <line data-testid="premove-arrow" x1={x1} y1={y1} x2={x2} y2={y2} className={styles.arrow} markerEnd="url(#premove-head)" />
    </svg>
  )
}

const ChessTable = ({ playerId, connected, view, table }: ChessTableProps) => {
  const { opening, play, sent } = table
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
  const [premove, setPremove] = useState<{ gameId: string; from: string; to: string } | null>(null)
  const [premoveDispatch, setPremoveDispatch] = useState<{ to: string; move?: string } | null>(null)
  const [confirmResign, setConfirmResign] = useState<ChessView | null>(null)
  const [clockChoice, setClockChoice] = useState<string | null>(null)
  const [setupChoice, setSetupChoice] = useState('')
  const [botElo, setBotElo] = useState(BOT_STRENGTHS[1].elo)
  const press = useRef<{ id: number; square: string; x: number; y: number; moving: boolean } | null>(null)
  const dragged = useRef(false)
  const [ghost, setGhost] = useState<{ piece: string; x: number; y: number; size: number } | null>(null)

  const me = view.players.find(player => player.playerId === playerId)
  const watching = me === undefined
  const myColor: ChessColor = me?.color ?? 'white'
  // The clock above the board and the one below it.
  const above = watching ? view.players.find(player => player.color === 'black') : view.players.find(player => player.playerId !== playerId)
  const below = watching ? view.players.find(player => player.color === 'white') : me
  const selectedSetup = view.availableSetups.some(setup => setup.setupId === setupChoice)
    ? setupChoice
    : (view.terms?.setupId ?? view.setupId ?? view.defaultSetupId ?? view.availableSetups[0]?.setupId ?? '')
  // The offered clocks, and a posted challenge's among them even when it
  // is none of those, so updating the challenge never quietly changes it.
  const clocks =
    view.terms === undefined
      ? CLOCKS
      : { ...CLOCKS, [clockLabel(view.terms)]: { initialSeconds: view.terms.initialSeconds, incrementSeconds: view.terms.incrementSeconds } }
  // A choice no longer offered (its terms gone) falls back, as the setup does.
  const selectedClock =
    clockChoice !== null && clockChoice in clocks ? clockChoice : view.terms === undefined ? '3+2' : clockLabel(view.terms)
  const alone = view.players.length < 2
  const myTurn = view.phase === 'playing' && view.currentPlayerId === playerId
  // No board input from a watcher, offline, outside play, or while a move
  // sent waits on the hub.
  const inert = watching || !connected || view.phase !== 'playing' || sent !== null
  const from = picked?.view === view ? picked.square : null
  const queuedPremove = premove?.gameId === view.gameId ? premove : null
  const pendingPromotion = promoting?.view === view ? promoting : null
  const targets = !myTurn || from === null ? [] : targetsFrom(view.legalMoves, from)
  const board = readBoard(view.fen)
  // A move sent shows where it landed until the hub's answer replaces the
  // board; a promotion asking shows its pawn already on the last rank,
  // under the picker.
  const shown =
    sent !== null
      ? applyMove(board, sent)
      : pendingPromotion !== null
        ? applyMove(board, `${pendingPromotion.from}${pendingPromotion.to}`)
        : board
  // The material lead of each side, as drawn: positive only for the side ahead.
  const balance = materialBalance(shown)
  const leadOf = (color: ChessColor) => (color === 'white' ? balance : -balance)
  const extras = imbalance(shown)
  const last = lastMoveSquares(view.moves)
  // The king of the side to move — or, once mated, of the side that was.
  const checkedKing = view.inCheck ? (view.fen?.split(' ')[1] === 'b' ? 'k' : 'K') : null

  // A premove is only a from/to intention. On the first on-turn view,
  // adjust the queued state during render and let the effect below send
  // the hub's exact UCI spelling. A promotion defaults to a queen.
  if (premove !== null && (premove.gameId !== view.gameId || view.phase !== 'playing')) {
    setPremove(null)
  } else if (premove !== null && myTurn && connected) {
    const moves = movesTo(view.legalMoves, premove.from, premove.to)
    const move = moves.length === 1 ? moves[0] : moves.find(candidate => candidate.endsWith('q'))
    setPicked(null)
    setGhost(null)
    setPremove(null)
    setPremoveDispatch({ to: premove.to, ...(move === undefined ? {} : { move }) })
  }
  useEffect(() => {
    if (premoveDispatch === null) return
    press.current = null
    boardRef.current?.querySelector<HTMLElement>(`[data-square="${premoveDispatch.to}"]`)?.focus()
    if (premoveDispatch.move !== undefined) play(premoveDispatch.move)
  }, [play, premoveDispatch])

  // The move from `start` to `square`: played, or the promotion asked.
  const land = (start: string, square: string) => {
    setPicked(null)
    if (!myTurn) {
      setPremove({ gameId: view.gameId, from: start, to: square })
      return
    }
    const moves = movesTo(view.legalMoves, start, square)
    if (moves.length === 1) table.play(moves[0])
    else setPromoting({ view, from: start, to: square, moves })
  }

  const tap = (square: string) => {
    // The click a release fires after a drag is the drag's, already done.
    if (dragged.current) {
      dragged.current = false
      return
    }
    if (inert) return
    // A tap on the board is a new gesture: a promotion still asking is
    // abandoned, never left up to send a second move for this turn.
    setPromoting(null)
    const piece = board.get(square)
    const movable =
      piece !== undefined && colorOfPiece(piece) === myColor && (!myTurn || targetsFrom(view.legalMoves, square).length > 0)
    // Off turn, another own piece changes the intended mover instead of
    // queueing a self-capture that the hub could never accept.
    if (from !== null && !myTurn && movable) {
      setPicked(square === from ? null : { view, square })
      return
    }
    if (from !== null && square !== from && (!myTurn || targets.includes(square))) {
      land(from, square)
      return
    }
    // Another of the viewer's pieces with a move picks it up; anything
    // else lets go.
    setPicked(movable && square !== from ? { view, square } : null)
  }

  // A drag: a press on a piece with moves that travels past the slop. The
  // piece follows the pointer and its squares show; the release lands it on
  // the square under the pointer — not the event's target, which for a
  // touch stays the square the press began on. A drop anywhere else leaves
  // the piece picked up, for a tap to finish.
  const squareAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-square]')?.dataset.square ?? null

  const onPointerDown = (event: ReactPointerEvent, square: string) => {
    dragged.current = false
    if (inert || event.button !== 0) return
    const piece = board.get(square)
    if (piece === undefined || colorOfPiece(piece) !== myColor) return
    if (myTurn && targetsFrom(view.legalMoves, square).length === 0) return
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
    // A size up from the board's own pieces, which fill a square: an eighth
    // of its width.
    const width = boardRef.current?.getBoundingClientRect().width ?? 0
    setGhost({ piece: board.get(held.square) ?? '', x: event.clientX, y: event.clientY, size: width * 0.15 })
  }
  const onPointerUp = (event: ReactPointerEvent) => {
    const held = press.current
    if (held === null || held.id !== event.pointerId) return
    press.current = null
    setGhost(null)
    if (!held.moving) return
    dragged.current = true
    const square = squareAt(event.clientX, event.clientY)
    const piece = square === null ? undefined : board.get(square)
    if (!myTurn && square !== null && piece !== undefined && colorOfPiece(piece) === myColor) {
      setPicked({ view, square })
      return
    }
    if (square !== null && square !== held.square && (!myTurn || targetsFrom(view.legalMoves, held.square).includes(square))) {
      land(held.square, square)
    }
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
    if (view.phase === 'waiting') {
      if (view.terms !== undefined) {
        const posted = `Challenge posted: ${view.terms.setupName}, ${clockLabel(view.terms)}.`
        return watching || !alone ? posted : `${posted} Whoever joins starts the game.`
      }
      return alone ? 'Waiting for a second seat.' : 'Pick a starting position and clock, then start.'
    }
    if (view.phase === 'ended') return view.result === undefined ? '' : describeResult(view.result, playerId)
    if (view.phase === 'closed') {
      // A leave mid-game is that game's result; between games, the news.
      if (view.result?.ending === 'abandoned') return describeResult(view.result, playerId)
      if (watching) return 'The table closed.'
      const left = view.players.find(player => player.playerId !== playerId)
      return `${left === undefined ? 'Your opponent' : nameOf(left.playerId)} left the table.`
    }
    if (pendingPromotion !== null) return 'Choose a piece to promote to.'
    if (!myTurn && from !== null) return 'Choose a premove destination.'
    if (queuedPremove !== null) return `Premove queued: ${describeMove(`${queuedPremove.from}${queuedPremove.to}`)}.`
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
      {/* The title spans the table instead of sharing the score sheet's
          row, so a long server-owned position name can wrap in full. */}
      <h1 ref={headingRef} tabIndex={-1} className={`${felt.title} ${styles.heading}`}>
        {watching ? 'Watching chess' : 'Chess'} {view.gameId}
        {view.setupName !== undefined && (
          <span className={styles.setupName} title={view.setupName}>
            {' '}
            · {view.setupName}
          </span>
        )}
      </h1>
      <div className={styles.top}>
        <div className={felt.tableHeader}>
          <p className={`${felt.hint} ${styles.statusSlot}`} role="status" data-testid="chess-status">
            {status}
          </p>
          {/* Leaving a game in play forfeits it: Resign is that, and it asks
              first. Before the start, leaving costs nothing. */}
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
          {!watching && view.players.length === 1 && (
            <div className={styles.clockPick}>
              <select aria-label="Bot strength" value={botElo} onChange={event => setBotElo(Number(event.target.value))}>
                {BOT_STRENGTHS.map(({ elo, name }) => (
                  <option key={elo} value={elo}>
                    {name} ({elo})
                  </option>
                ))}
              </select>
              <button type="button" className={felt.secondary} onClick={() => table.addBot(botElo)} disabled={!connected || table.seating}>
                Add a bot
              </button>
            </div>
          )}
          {!watching && (
            <>
              <label className={styles.clockPick}>
                Starting position
                <select value={selectedSetup} onChange={event => setSetupChoice(event.target.value)}>
                  {view.availableSetups.map(setup => (
                    <option key={setup.setupId} value={setup.setupId}>
                      {setup.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.clockPick}>
                Clock
                <select value={selectedClock} onChange={event => setClockChoice(event.target.value)}>
                  {Object.keys(clocks).map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              {/* Alone, the choice is posted as a challenge that whoever
                  joins starts on; with two seats, it starts the game. */}
              <button
                type="button"
                className={felt.primary}
                onClick={() =>
                  (alone ? table.postChallenge : table.startTable)({
                    ...(selectedSetup === '' ? {} : { setupId: selectedSetup }),
                    ...clocks[selectedClock]
                  })
                }
                disabled={!connected}
              >
                {!alone ? 'Start' : view.terms === undefined ? 'Post challenge' : 'Update challenge'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={styles.play}>
          {above?.color !== undefined && <ClockRow view={view} seatId={above.playerId} color={above.color} you={false} lead={leadOf(above.color)} extras={extras[above.color]} />}
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
                const mine = !watching && piece !== undefined && colorOfPiece(piece) === myColor
                // a1 dark: a square is dark where its file and rank index sum even.
                const light = (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 0
                const target = targets.includes(square)
                const grab = mine && connected && view.phase === 'playing' && (!myTurn || targetsFrom(view.legalMoves, square).length > 0)
                const interactive = !inert && (myTurn || mine || from !== null)
                const premoveMark = queuedPremove?.from === square ? 'from' : queuedPremove?.to === square ? 'to' : undefined
                return (
                  <button
                    key={square}
                    type="button"
                    data-square={square}
                    className={`${styles.square} ${light ? styles.light : styles.dark} ${target ? styles.target : ''}`}
                    aria-label={piece === undefined ? square : `${square}, ${pieceName(piece)}`}
                    aria-pressed={mine ? from === square : undefined}
                    aria-disabled={!interactive ? true : undefined}
                    data-shade={light ? 'light' : 'dark'}
                    aria-describedby={target ? targetNote : undefined}
                    data-last={last.includes(square) ? 'true' : undefined}
                    data-check={piece !== undefined && piece === checkedKing ? 'true' : undefined}
                    data-grab={grab ? 'true' : undefined}
                    data-premove={premoveMark}
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
                      <img
                        className={styles.piece}
                        src={pieceImage(piece)}
                        alt=""
                        draggable={false}
                        data-lifted={ghost !== null && from === square ? 'true' : undefined}
                      />
                    )}
                  </button>
                )
              })}
              {queuedPremove !== null && <PremoveArrow from={queuedPremove.from} to={queuedPremove.to} squares={squares} />}
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
                            className={styles.promotionPiece}
                            aria-label={name}
                            autoFocus={i === 0}
                            onClick={() => {
                              refocus.current = { square: uci.slice(2, 4) }
                              setPromoting(null)
                              table.play(uci)
                            }}
                          >
                            <img className={styles.piece} src={pieceImage(myColor === 'white' ? letter.toUpperCase() : letter)} alt="" draggable={false} />
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
          {below?.color !== undefined && <ClockRow view={view} seatId={below.playerId} color={below.color} you={!watching} lead={leadOf(below.color)} extras={extras[below.color]} />}
          {/* On the page, not the board: the board clips its overflow, and a
              captured drag may stray past its edge. */}
          {ghost !== null &&
            createPortal(
              <img
                className={styles.ghost}
                src={pieceImage(ghost.piece)}
                style={{ left: ghost.x, top: ghost.y, width: ghost.size, height: ghost.size }}
                alt=""
                data-testid="drag-ghost"
              />,
              document.body
            )}

          {/* One ending-block tall whether Resign alone or the result plus
              next-game buttons sit here, so that swap does not resize the
              board. */}
          <div className={styles.foot} data-testid="chess-foot">
            {view.phase === 'playing' && me !== undefined && (
              <div className={styles.actions}>
                {queuedPremove !== null && (
                  <button
                    type="button"
                    className={felt.secondary}
                    onClick={() => {
                      refocus.current = { square: queuedPremove.from }
                      setPremove(null)
                    }}
                  >
                    Cancel premove
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

            {(view.phase === 'ended' || view.phase === 'closed') && (
              <div className={styles.ending}>
                <p className={styles.result} aria-hidden="true">
                  {status}
                </p>
                {/* The game just played is the score sheet's last line. */}
                {(view.scoreSheet?.length ?? 0) > 0 && (
                  <button type="button" className={felt.link} onClick={() => table.reviewGame(view.gameId, view.scoreSheet?.length ?? 0)} disabled={!connected}>
                    Review game
                  </button>
                )}
                {/* Between games the table is still both seats': the next game
                    is played here. Once a seat has left, another table. A
                    watcher has neither. */}
                {!watching && (
                  <div className={styles.actions}>
                    {view.phase === 'ended' && (
                      <select
                        className={styles.setupPick}
                        aria-label="Next starting position"
                        value={selectedSetup}
                        onChange={event => setSetupChoice(event.target.value)}
                      >
                        {view.availableSetups.map(setup => (
                          <option key={setup.setupId} value={setup.setupId}>
                            {setup.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      ref={playAgainRef}
                      type="button"
                      className={felt.primary}
                      onClick={() => table.playAgain(selectedSetup === '' ? undefined : selectedSetup)}
                      disabled={!connected || opening}
                    >
                      {opening ? 'Opening…' : view.phase === 'ended' ? 'Next game' : 'Play again'}
                    </button>
                    <button type="button" className={felt.secondary} onClick={table.leaveTable}>
                      {view.phase === 'ended' ? 'Leave table' : 'Back to the room'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ChessTable
