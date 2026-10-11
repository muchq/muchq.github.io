import { useCallback, useEffect, useRef, useState } from 'react'
import type { PongFrame, PongMoveName, PongMovePayloads, PongRoundRobin, PongUpdate, PongVariant, PongView } from '@/apps/pong/wire'

// A pong table as the wire sends it, over the lobby's stream (useLobby).
// The view is the score and arrives as state; frames arrive thirty times a
// second and are kept in a ref, read by the renderer on each animation
// frame, so they never re-render the lobby. The room's pong round robins
// ride beside the table as chess's do: unknown until asked for, then kept
// current by each one heard.

// The hub refills sixty paddle moves a second; a pointer sends at most one
// per this, the newest of those it folded.
export const AIM_EVERY_MS = 33

export interface HeldFrame {
  frame: PongFrame
  // performance.now() when it arrived: the renderer moves the ball on by
  // its velocity from here.
  receivedAt: number
}

export interface UsePongTable {
  view: PongView | null
  // Another game, or a table, asked for and not yet arrived.
  opening: boolean
  // A bot asked for and its seat not yet arrived.
  seating: boolean
  latestFrame: () => HeldFrame | null
  createTable: () => void
  joinTable: (gameId: string) => void
  watchTable: (gameId: string) => void
  startTable: (variant: PongVariant) => void
  // The table's next game while it is open; a new table once it closed.
  playAgain: (variant: PongVariant) => void
  leaveTable: () => void
  addBot: (level: number) => void
  // Where the seat wants its paddle, in court units.
  aim: (x: number, y: number) => void
  // The same at once, over any aim still waiting: a key's press or release.
  aimNow: (x: number, y: number) => void
  roundRobins: PongRoundRobin[] | null
  loadRoundRobins: () => void
  createRoundRobin: (entrants: string[], variant: PongVariant) => void
  playRoundRobin: (roundRobinId: string, opponent: string) => void
  forfeit: (roundRobinId: string, winner: string, loser: string) => void
  withdraw: (roundRobinId: string, playerId: string) => void
  handleUpdate: (update: PongUpdate) => void
  handleRejected: () => void
  clear: () => void
}

export interface UsePongTableProps {
  playerId: string
  move: <N extends PongMoveName>(name: N, payload?: PongMovePayloads[N]) => void
  showNotice: (message: string) => void
  onLeft?: () => void
}

export const usePongTable = ({ playerId, move, showNotice, onLeft }: UsePongTableProps): UsePongTable => {
  const [view, setView] = useState<PongView | null>(null)
  const [opening, setOpening] = useState(false)
  const [seating, setSeating] = useState(false)
  const [roundRobins, setRoundRobins] = useState<PongRoundRobin[] | null>(null)
  const frameRef = useRef<HeldFrame | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const roundRobinsRef = useRef(roundRobins)
  roundRobinsRef.current = roundRobins
  const listAsked = useRef(false)
  const listStale = useRef(false)
  const askList = useCallback(() => {
    listAsked.current = true
    listStale.current = false
    move('roundRobins')
  }, [move])

  // The pointer's throttle: the aim folded while it waits, and its timer.
  const aimTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aimPending = useRef<{ x: number; y: number } | null>(null)
  const stopAiming = useCallback(() => {
    if (aimTimer.current !== null) clearTimeout(aimTimer.current)
    aimTimer.current = null
    aimPending.current = null
  }, [])

  const settle = useCallback(() => {
    setOpening(false)
    setSeating(false)
  }, [])
  const showView = useCallback(
    (next: PongView) => {
      if (next.phase !== 'playing' || next.gameId !== viewRef.current?.gameId) frameRef.current = null
      if (next.phase !== 'playing') stopAiming()
      viewRef.current = next
      setView(next)
      settle()
    },
    [settle, stopAiming]
  )
  const clearTable = useCallback(() => {
    stopAiming()
    frameRef.current = null
    viewRef.current = null
    setView(null)
    settle()
  }, [settle, stopAiming])
  const clear = useCallback(() => {
    clearTable()
    setRoundRobins(null)
    listAsked.current = false
    listStale.current = false
  }, [clearTable])

  const handleUpdate = useCallback(
    (update: PongUpdate) => {
      if (update.frame) {
        const heard = update.frame
        const held = frameRef.current
        // Only a game in play has a rally; one heard after its end is stale.
        if (viewRef.current?.gameId !== heard.gameId || viewRef.current.phase !== 'playing') return
        if (held !== null && held.frame.tick >= heard.tick) return
        frameRef.current = { frame: heard, receivedAt: performance.now() }
        return
      }
      if (update.gameJoined) {
        showView(update.gameJoined.view)
        return
      }
      if (update.gameState) {
        showView(update.gameState.view)
        return
      }
      if (update.gameCreated) {
        if (update.gameCreated.createdBy !== playerId) showNotice(`${update.gameCreated.createdBy} opened pong table ${update.gameCreated.gameId}`)
        return
      }
      if (update.gameLeft) {
        clearTable()
        onLeft?.()
        return
      }
      if (update.roundRobins) {
        setRoundRobins(update.roundRobins.roundRobins)
        listAsked.current = false
        if (listStale.current) askList()
        return
      }
      if (update.roundRobin) {
        const heard = update.roundRobin
        if (listAsked.current) listStale.current = true
        if (roundRobinsRef.current === null) {
          if (!listAsked.current) askList()
          return
        }
        setRoundRobins(held => {
          if (held === null) return held
          const at = held.findIndex(roundRobin => roundRobin.roundRobinId === heard.roundRobinId)
          return at === -1 ? [...held, heard] : held.map((roundRobin, i) => (i === at ? heard : roundRobin))
        })
      }
      // gameStarted and gameEnded: the view says it all.
    },
    [askList, clearTable, onLeft, playerId, showNotice, showView]
  )

  const latestFrame = useCallback(() => frameRef.current, [])
  const createTable = useCallback(() => move('createGame'), [move])
  const joinTable = useCallback(
    (gameId: string) => {
      setOpening(true)
      move('joinGame', { gameId })
    },
    [move]
  )
  const watchTable = useCallback((gameId: string) => move('watch', { gameId }), [move])
  const startTable = useCallback((variant: PongVariant) => move('startGame', { variant }), [move])
  const playAgain = useCallback(
    (variant: PongVariant) => {
      setOpening(true)
      if (view?.phase === 'ended') move('startGame', { variant })
      else move('createGame')
    },
    [move, view]
  )
  const leaveTable = useCallback(() => {
    if (view !== null && view.phase !== 'closed') {
      move('leaveGame')
      return
    }
    // A closed table is already gone from the hub: only the view lingers.
    clearTable()
    onLeft?.()
  }, [clearTable, move, onLeft, view])
  const addBot = useCallback(
    (level: number) => {
      setSeating(true)
      move('addBot', { level })
    },
    [move]
  )

  // Sends one aim and opens a wait, at whose end the newest aim folded
  // into it goes, opening the next.
  const sendAim = useCallback(
    (x: number, y: number) => {
      move('paddle', { x, y })
      aimTimer.current = setTimeout(() => {
        const pending = aimPending.current
        aimPending.current = null
        aimTimer.current = null
        if (pending !== null) sendAim(pending.x, pending.y)
      }, AIM_EVERY_MS)
    },
    [move]
  )
  // The pointer's: leading edge at once; anything inside the wait folds
  // into the newest, sent as the wait ends.
  const aim = useCallback(
    (x: number, y: number) => {
      if (aimTimer.current !== null) {
        aimPending.current = { x, y }
        return
      }
      sendAim(x, y)
    },
    [sendAim]
  )
  // A key's press or release: at once, over whatever the pointer folded,
  // which is older.
  const aimNow = useCallback(
    (x: number, y: number) => {
      stopAiming()
      sendAim(x, y)
    },
    [sendAim, stopAiming]
  )
  useEffect(() => stopAiming, [stopAiming])

  const createRoundRobin = useCallback((entrants: string[], variant: PongVariant) => move('createRoundRobin', { entrants, variant }), [move])
  const playRoundRobin = useCallback(
    (roundRobinId: string, opponent: string) => {
      setOpening(true)
      move('playRoundRobin', { roundRobinId, opponent })
    },
    [move]
  )
  const forfeit = useCallback((roundRobinId: string, winner: string, loser: string) => move('forfeit', { roundRobinId, winner, loser }), [move])
  const withdraw = useCallback((roundRobinId: string, playerId: string) => move('withdraw', { roundRobinId, playerId }), [move])

  return {
    view,
    opening,
    seating,
    latestFrame,
    createTable,
    joinTable,
    watchTable,
    startTable,
    playAgain,
    leaveTable,
    addBot,
    aim,
    aimNow,
    roundRobins,
    loadRoundRobins: askList,
    createRoundRobin,
    playRoundRobin,
    forfeit,
    withdraw,
    handleUpdate,
    handleRejected: settle,
    clear
  }
}
