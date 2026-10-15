import { useCallback, useState } from 'react'
import type { GoBoardSize, GoMoveName, GoMovePayloads, GoUpdate, GoView } from '@/apps/go/wire'

// A go table as the wire sends it, over the lobby's stream (useLobby).
// The owner feeds handleUpdate every go update and clears the table on a
// resume. The view is the whole truth: an ended one carries the result.

export interface GoTableActions {
  // Board size, komi and clock; absent fields use the hub's defaults.
  startTable: (terms?: GoMovePayloads['startGame']) => void
  leaveTable: () => void
  // Another game: the table's next, on its clock and komi, while it is
  // open; a new table once it has closed.
  playAgain: (boardSize?: GoBoardSize) => void
  play: (x: number, y: number) => void
  pass: () => void
  // A move sent and not yet answered: the next view, or a refusal, lets it go.
  sent: boolean
  resign: () => void
}

export interface UseGoTable extends GoTableActions {
  createTable: () => void
  joinTable: (gameId: string) => void
  view: GoView | null
  // Another game has been asked for and not yet arrived.
  opening: boolean
  handleUpdate: (update: GoUpdate) => void
  handleRejected: () => void
  clear: () => void
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

  const settle = useCallback(() => {
    setOpening(false)
    setSent(false)
  }, [])
  const clear = useCallback(() => {
    setView(null)
    settle()
  }, [settle])

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
        clear()
        onLeft?.()
      }
      // gameStarted, turnChanged and gameEnded: the view says it all.
    },
    [clear, onLeft, playerId, settle, showNotice]
  )

  const createTable = useCallback(() => move('createGame'), [move])
  const joinTable = useCallback(
    (gameId: string) => {
      setOpening(true)
      move('joinGame', { gameId })
    },
    [move]
  )
  const startTable = useCallback((terms: GoMovePayloads['startGame'] = {}) => move('startGame', terms), [move])
  const playAgain = useCallback(
    (boardSize?: GoBoardSize) => {
      setOpening(true)
      if (view?.phase === 'ended' && view.clock !== undefined) {
        move('startGame', {
          boardSize: boardSize ?? view.boardSize,
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
    clear()
    onLeft?.()
  }, [clear, move, onLeft, view])
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
  const resign = useCallback(() => move('resign'), [move])

  return {
    view,
    opening,
    sent,
    handleUpdate,
    handleRejected: settle,
    clear,
    createTable,
    joinTable,
    startTable,
    leaveTable,
    playAgain,
    play,
    pass,
    resign
  }
}
