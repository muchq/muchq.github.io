import { useCallback, useState } from 'react'
import { useRoundRobinList } from './useRoundRobinList'
import type { GoBoardSize, GoGameSummary, GoMoveName, GoMovePayloads, GoRoundRobin, GoUpdate, GoView } from '@/apps/go/wire'

// A go table as the wire sends it, over the lobby's stream (useLobby).
// The owner feeds handleUpdate every go update and clears the table on a
// resume. The view is the whole truth: an ended one carries the result.

export interface GoTableActions {
  // Board size, komi and clock; absent fields use the hub's defaults.
  startTable: (terms?: GoMovePayloads['startGame']) => void
  // Alone at the table: the terms whoever joins starts on.
  postChallenge: (terms: GoMovePayloads['challenge']) => void
  leaveTable: () => void
  // Another game: the table's next, on its clock and komi, while it is
  // open; a new table once it has closed.
  playAgain: (size?: GoBoardSize) => void
  play: (x: number, y: number) => void
  pass: () => void
  // In the scoring: toggle the group at a point dead, and accept the marks.
  markDead: (x: number, y: number) => void
  accept: () => void
  // A move sent and not yet answered: the next view, or a refusal, lets it go.
  sent: boolean
  resign: () => void
  // GNU Go to the other chair, at a level; held as `seating` until the hub
  // answers.
  addBot: (level: number) => void
  seating: boolean
}

export interface UseGoTable extends GoTableActions {
  createTable: () => void
  joinTable: (gameId: string) => void
  // Go hides nothing: anyone may watch a table, from no seat.
  watchTable: (gameId: string) => void
  view: GoView | null
  // Another game has been asked for and not yet arrived.
  opening: boolean
  handleUpdate: (update: GoUpdate) => void
  handleRejected: () => void
  clear: () => void
  // The room's go round robins: unknown until asked for, then kept
  // current by each one heard.
  roundRobins: GoRoundRobin[] | null
  loadRoundRobins: () => void
  createRoundRobin: (entrants: string[], terms: GoMovePayloads['startGame']) => void
  playRoundRobin: (roundRobinId: string, opponent: string) => void
  forfeit: (roundRobinId: string, winner: string, loser: string) => void
  withdraw: (roundRobinId: string, playerId: string) => void
  // The room's finished go games, newest first: unknown until asked for,
  // then the latest answer.
  history: GoGameSummary[] | null
  loadHistory: () => void
}

export interface UseGoTableProps {
  playerId: string
  move: <N extends GoMoveName>(name: N, payload?: GoMovePayloads[N]) => void
  showNotice: (message: string) => void
  onLeft?: () => void
}

export const useGoTable = ({ playerId, move, showNotice, onLeft }: UseGoTableProps): UseGoTable => {
  const [view, setView] = useState<GoView | null>(null)
  const [opening, setOpening] = useState(false)
  const [sent, setSent] = useState(false)
  const [seating, setSeating] = useState(false)
  const [history, setHistory] = useState<GoGameSummary[] | null>(null)
  const loadHistory = useCallback(() => move('history'), [move])
  const askList = useCallback(() => move('roundRobins'), [move])
  const { roundRobins, load: loadRoundRobins, heardList, heardOne, reset: resetRoundRobins } = useRoundRobinList<GoRoundRobin>(askList)

  const settle = useCallback(() => {
    setOpening(false)
    setSent(false)
    setSeating(false)
  }, [])
  const clearTable = useCallback(() => {
    setView(null)
    settle()
  }, [settle])
  const clear = useCallback(() => {
    clearTable()
    resetRoundRobins()
    setHistory(null)
  }, [clearTable, resetRoundRobins])

  const handleUpdate = useCallback(
    (update: GoUpdate) => {
      const next = update.gameJoined?.view ?? update.gameState?.view
      if (next !== undefined) {
        setView(next)
        settle()
        return
      }
      if (update.gameCreated) {
        if (update.gameCreated.createdBy !== playerId) showNotice(`${update.gameCreated.createdBy} opened go table ${update.gameCreated.gameId}`)
        return
      }
      if (update.gameLeft) {
        clearTable()
        onLeft?.()
        return
      }
      if (update.roundRobins) {
        heardList(update.roundRobins.roundRobins)
        return
      }
      if (update.history) {
        setHistory(update.history.games)
        return
      }
      // A finished game is the history's newest.
      if (update.gameEnded) {
        loadHistory()
        return
      }
      if (update.roundRobin) heardOne(update.roundRobin)
      // gameStarted and turnChanged: the view says it all.
    },
    [clearTable, heardList, heardOne, loadHistory, onLeft, playerId, settle, showNotice]
  )

  const createRoundRobin = useCallback(
    (entrants: string[], terms: GoMovePayloads['startGame']) => move('createRoundRobin', { entrants, terms }),
    [move]
  )
  const playRoundRobin = useCallback(
    (roundRobinId: string, opponent: string) => {
      setOpening(true)
      move('playRoundRobin', { roundRobinId, opponent })
    },
    [move]
  )
  const forfeit = useCallback((roundRobinId: string, winner: string, loser: string) => move('forfeit', { roundRobinId, winner, loser }), [move])
  const withdraw = useCallback((roundRobinId: string, playerId: string) => move('withdraw', { roundRobinId, playerId }), [move])

  const createTable = useCallback(() => move('createGame'), [move])
  const joinTable = useCallback(
    (gameId: string) => {
      setOpening(true)
      move('joinGame', { gameId })
    },
    [move]
  )
  const watchTable = useCallback((gameId: string) => move('watch', { gameId }), [move])
  const startTable = useCallback((terms: GoMovePayloads['startGame'] = {}) => move('startGame', terms), [move])
  const postChallenge = useCallback((terms: GoMovePayloads['challenge']) => move('challenge', terms), [move])
  const playAgain = useCallback(
    (size?: GoBoardSize) => {
      setOpening(true)
      if (view?.phase === 'ended' && view.clock !== undefined) {
        move('startGame', {
          size: size ?? view.size,
          ...(view.komi === undefined ? {} : { komi: view.komi }),
          initialSeconds: view.clock.initialMs / 1000,
          incrementSeconds: view.clock.incrementMs / 1000
        })
        return
      }
      move('createGame')
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
  const play = useCallback(
    (x: number, y: number) => {
      setSent(true)
      move('play', { x, y })
    },
    [move]
  )
  const pass = useCallback(() => {
    setSent(true)
    move('pass')
  }, [move])
  const markDead = useCallback(
    (x: number, y: number) => {
      setSent(true)
      move('markDead', { x, y })
    },
    [move]
  )
  const accept = useCallback(() => {
    setSent(true)
    move('accept')
  }, [move])
  const resign = useCallback(() => move('resign'), [move])
  const addBot = useCallback(
    (level: number) => {
      setSeating(true)
      move('addBot', { level })
    },
    [move]
  )

  return {
    view,
    opening,
    sent,
    handleUpdate,
    handleRejected: settle,
    clear,
    createTable,
    joinTable,
    watchTable,
    startTable,
    postChallenge,
    leaveTable,
    playAgain,
    play,
    pass,
    markDead,
    accept,
    resign,
    addBot,
    seating,
    history,
    loadHistory,
    roundRobins,
    loadRoundRobins,
    createRoundRobin,
    playRoundRobin,
    forfeit,
    withdraw
  }
}
