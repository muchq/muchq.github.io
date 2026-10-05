import { useCallback, useState } from 'react'
import type { ChessMoveName, ChessMovePayloads, ChessUpdate, ChessView } from '@/apps/chess/wire'

// A chess table as the wire sends it, over the lobby's stream (useLobby).
// The owner feeds handleUpdate every chess update and clears the table on
// a resume. The view is the whole truth: an ended one carries the result,
// and arrives before gameEnded. The board's own selection is the
// component's: it lives and dies with one view. A watcher's view is the
// seats' own, with no chair of its own in it.

export interface ChessTableActions {
  // Setup and seconds; absent fields use the hub's defaults.
  startTable: (clock?: ChessMovePayloads['startGame']) => void
  leaveTable: () => void
  // Another game: the table's next, on its clock, while it is open; a new
  // table once it has closed.
  playAgain: (setupId?: string) => void
  play: (uci: string) => void
  resign: () => void
  // Stockfish in the second seat, at an Elo of 1320 to 3190.
  addBot: (elo: number) => void
  // Alone at a waiting table: the terms whoever joins starts on.
  postChallenge: (terms: ChessMovePayloads['challenge']) => void
}

export interface UseChessTable extends ChessTableActions {
  createTable: () => void
  joinTable: (gameId: string) => void
  watchTable: (gameId: string) => void
  view: ChessView | null
  // At the table in no seat: watching it.
  watching: boolean
  // Another game has been asked for and not yet arrived.
  opening: boolean
  // A bot has been asked for and its seat not yet arrived.
  seating: boolean
  handleUpdate: (update: ChessUpdate) => void
  handleRejected: () => void
  clear: () => void
}

export interface UseChessTableProps {
  playerId: string
  move: <N extends ChessMoveName>(name: N, payload?: ChessMovePayloads[N]) => void
  showNotice: (message: string) => void
  onLeft?: () => void
}

export const useChessTable = ({ playerId, move, showNotice, onLeft }: UseChessTableProps): UseChessTable => {
  const [view, setView] = useState<ChessView | null>(null)
  const [opening, setOpening] = useState(false)
  const [seating, setSeating] = useState(false)

  // Held until the hub answers with a view, or refuses.
  const settle = useCallback(() => {
    setOpening(false)
    setSeating(false)
  }, [])
  const clear = useCallback(() => {
    setView(null)
    settle()
  }, [settle])

  const handleUpdate = useCallback(
    (update: ChessUpdate) => {
      if (update.gameJoined) {
        setView(update.gameJoined.view)
        settle()
        return
      }
      if (update.gameState) {
        setView(update.gameState.view)
        settle()
        return
      }
      if (update.gameCreated) {
        if (update.gameCreated.createdBy !== playerId) showNotice(`${update.gameCreated.createdBy} opened chess table ${update.gameCreated.gameId}`)
        return
      }
      if (update.gameLeft) {
        clear()
        onLeft?.()
      }
      // gameStarted, turnChanged and gameEnded: the view says it all.
    },
    [clear, onLeft, playerId, settle, showNotice]
  )

  const createTable = useCallback(() => move('createGame'), [move])
  // Either way held until the hub answers: the next game's view, or the
  // new table's.
  const playAgain = useCallback((setupId?: string) => {
    setOpening(true)
    if (view?.phase === 'ended' && view.clock !== undefined) {
      move('startGame', {
        ...(setupId === undefined ? {} : { setupId }),
        initialSeconds: view.clock.initialMs / 1000,
        incrementSeconds: view.clock.incrementMs / 1000
      })
      return
    }
    move('createGame')
  }, [move, view])
  const joinTable = useCallback((gameId: string) => move('joinGame', { gameId }), [move])
  const watchTable = useCallback((gameId: string) => move('watch', { gameId }), [move])
  const watching = view !== null && !view.players.some(player => player.playerId === playerId)
  const startTable = useCallback((clock: ChessMovePayloads['startGame'] = {}) => move('startGame', clock), [move])
  const leaveTable = useCallback(() => {
    if (view !== null && view.phase !== 'closed') {
      move('leaveGame')
      return
    }
    // A closed table is already gone from the hub: only the view lingers.
    clear()
    onLeft?.()
  }, [clear, move, onLeft, view])
  const play = useCallback((uci: string) => move('play', { uci }), [move])
  const postChallenge = useCallback((terms: ChessMovePayloads['challenge']) => move('challenge', terms), [move])
  const resign = useCallback(() => move('resign'), [move])
  const addBot = useCallback(
    (elo: number) => {
      setSeating(true)
      move('addBot', { elo })
    },
    [move]
  )

  return {
    view,
    watching,
    opening,
    seating,
    handleUpdate,
    handleRejected: settle,
    clear,
    createTable,
    joinTable,
    watchTable,
    startTable,
    leaveTable,
    playAgain,
    play,
    resign,
    addBot,
    postChallenge
  }
}
