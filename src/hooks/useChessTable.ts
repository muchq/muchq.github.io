import { useCallback, useState } from 'react'
import type { ChessMoveName, ChessMovePayloads, ChessUpdate, ChessView } from '@/apps/chess/wire'

// A chess table as the wire sends it, over the lobby's stream (useLobby).
// The owner feeds handleUpdate every chess update and clears the table on
// a resume. The view is the whole truth: an ended one carries the result,
// and arrives before gameEnded. The board's own selection is the
// component's: it lives and dies with one view.

export interface ChessTableActions {
  // Seconds; absent is the hub's default.
  startTable: (clock?: ChessMovePayloads['startGame']) => void
  leaveTable: () => void
  // Another table, from the one that just ended: a create, since the
  // finished game is already gone from the hub.
  playAgain: () => void
  play: (uci: string) => void
  resign: () => void
}

export interface UseChessTable extends ChessTableActions {
  createTable: () => void
  joinTable: (gameId: string) => void
  view: ChessView | null
  // A table has been asked for and not yet arrived.
  opening: boolean
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

  const clear = useCallback(() => {
    setView(null)
    setOpening(false)
  }, [])
  const handleRejected = useCallback(() => setOpening(false), [])

  const handleUpdate = useCallback(
    (update: ChessUpdate) => {
      if (update.gameJoined) {
        setView(update.gameJoined.view)
        setOpening(false)
        return
      }
      if (update.gameState) {
        setView(update.gameState.view)
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
    [clear, onLeft, playerId, showNotice]
  )

  const createTable = useCallback(() => move('createGame'), [move])
  const playAgain = useCallback(() => {
    setOpening(true)
    move('createGame')
  }, [move])
  const joinTable = useCallback((gameId: string) => move('joinGame', { gameId }), [move])
  const startTable = useCallback((clock: ChessMovePayloads['startGame'] = {}) => move('startGame', clock), [move])
  const leaveTable = useCallback(() => {
    if (view !== null && view.phase !== 'ended') {
      move('leaveGame')
      return
    }
    // An ended table is already gone from the hub: only the view lingers.
    clear()
    onLeft?.()
  }, [clear, move, onLeft, view])
  const play = useCallback((uci: string) => move('play', { uci }), [move])
  const resign = useCallback(() => move('resign'), [move])

  return { view, opening, handleUpdate, handleRejected, clear, createTable, joinTable, startTable, leaveTable, playAgain, play, resign }
}
