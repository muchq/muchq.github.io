import { useCallback, useState } from 'react'
import type { Card, SpadesMode, SpadesMoveName, SpadesMovePayloads, SpadesUpdate, SpadesView } from '@/apps/spades/wire'

// A spades table as the wire sends it (MoonBase#1658), over the lobby's
// stream (useLobby). The view is the whole truth: the hub sends the
// viewer's legal plays and a game's result with it, so nothing here
// reckons the rules or keeps an end of its own.

export interface SpadesTableActions {
  startTable: (mode: SpadesMode) => void
  leaveTable: () => void
  // Another game at a new table, once this one has closed.
  playAgain: () => void
  bid: (tricks: number) => void
  play: (card: Card) => void
  deal: () => void
}

export interface UseSpadesTable extends SpadesTableActions {
  createTable: () => void
  joinTable: (gameId: string) => void
  view: SpadesView | null
  // A table asked for and not yet arrived.
  opening: boolean
  // A bid, a play or a deal sent and not yet answered: the next view, or
  // a refusal, lets it go.
  sending: boolean
  handleUpdate: (update: SpadesUpdate) => void
  handleRejected: () => void
  clear: () => void
}

export interface UseSpadesTableProps {
  playerId: string
  move: <N extends SpadesMoveName>(name: N, payload?: SpadesMovePayloads[N]) => void
  showNotice: (message: string) => void
  onLeft?: () => void
}

export const useSpadesTable = ({ playerId, move, showNotice, onLeft }: UseSpadesTableProps): UseSpadesTable => {
  const [view, setView] = useState<SpadesView | null>(null)
  const [opening, setOpening] = useState(false)
  const [sending, setSending] = useState(false)

  const settle = useCallback(() => {
    setOpening(false)
    setSending(false)
  }, [])
  const clear = useCallback(() => {
    setView(null)
    settle()
  }, [settle])

  const showView = useCallback(
    (next: SpadesView) => {
      setView(next)
      settle()
    },
    [settle]
  )

  const handleUpdate = useCallback(
    (update: SpadesUpdate) => {
      if (update.gameJoined) {
        showView(update.gameJoined.view)
        return
      }
      if (update.gameState) {
        showView(update.gameState.view)
        return
      }
      if (update.gameCreated) {
        if (update.gameCreated.createdBy !== playerId) showNotice(`${update.gameCreated.createdBy} opened spades table ${update.gameCreated.gameId}`)
        return
      }
      if (update.gameLeft) {
        clear()
        onLeft?.()
      }
      // gameStarted, turnChanged and gameEnded: the view says each.
    },
    [clear, onLeft, playerId, showNotice, showView]
  )

  const createTable = useCallback(() => move('createGame'), [move])
  const joinTable = useCallback(
    (gameId: string) => {
      setOpening(true)
      move('joinGame', { gameId })
    },
    [move]
  )
  const startTable = useCallback((mode: SpadesMode) => move('startGame', { mode }), [move])
  const leaveTable = useCallback(() => {
    if (view !== null && view.phase !== 'closed') {
      move('leaveGame')
      return
    }
    // A closed table is already gone from the hub: only the view lingers.
    clear()
    onLeft?.()
  }, [clear, move, onLeft, view])
  const playAgain = useCallback(() => {
    setOpening(true)
    move('createGame')
  }, [move])
  const bid = useCallback(
    (tricks: number) => {
      setSending(true)
      move('bid', { tricks })
    },
    [move]
  )
  const play = useCallback(
    (card: Card) => {
      setSending(true)
      move('play', { card })
    },
    [move]
  )
  const deal = useCallback(() => {
    setSending(true)
    move('deal')
  }, [move])

  return {
    view,
    opening,
    sending,
    handleUpdate,
    handleRejected: settle,
    clear,
    createTable,
    joinTable,
    startTable,
    leaveTable,
    playAgain,
    bid,
    play,
    deal
  }
}
