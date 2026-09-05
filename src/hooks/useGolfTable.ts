import { useCallback, useRef, useState } from 'react'
import type { FinalScore, GameState } from '@/types/golf'
import type { GolfMoveName, GolfUpdate, GolfView } from '@/apps/golf/wire'
import { mapGameView } from '@/apps/golf/wire'
import { GAME_STARTED, gameOverMessage, knockedMessage, turnMessage } from '@/utils/golfNotifications'
import { usePeekCountdown } from './usePeekCountdown'

// A golf table as the wire sends it, in the UI's model, over whatever
// stream carries the golf envelope: the lobby's (useLobby), or later
// golf's own page. The owner feeds handleUpdate every golf update and
// clears the table on a resume.
//
// The UI's take-then-place discard flow is emulated here: the discard
// top is public, so "taking" it reveals nothing, and the hub's one
// takeFromDiscard{cardIndex} goes out when the player places it.

export interface GolfTableEnded {
  winner: string
  winners: string[]
  finalScores: FinalScore[]
}

// What the table's chrome offers; the room screen adds create and join.
export interface GolfTableActions {
  startTable: () => void
  leaveTable: () => void
  // An ended table's "again": the hub seats the creator at a new one.
  playAgain: () => void
  drawCard: () => void
  takeFromDiscard: () => void
  discardDrawn: () => void
  knock: () => void
  // The viewer's own card: a peek while peeking, a swap while holding.
  tapCard: (index: number) => void
}

export interface UseGolfTable extends GolfTableActions {
  view: GameState | null
  ended: GolfTableEnded | null
  peekCountdown: number | null
  createTable: () => void
  joinTable: (gameId: string) => void
  handleUpdate: (update: GolfUpdate) => void
  clear: () => void
}

export interface UseGolfTableProps {
  playerId: string
  move: (name: GolfMoveName, payload?: unknown) => void
  showNotice: (message: string) => void
  // The table is gone from the hub: gameLeft, or a "Back" from an ended
  // table. The owner may steer the URL.
  onLeft?: () => void
}

export const useGolfTable = ({ playerId, move, showNotice, onLeft }: UseGolfTableProps): UseGolfTable => {
  const [view, setView] = useState<GameState | null>(null)
  const [ended, setEnded] = useState<GolfTableEnded | null>(null)
  // The last authoritative view, so a put-back restores it without
  // inventing state; and whether the held card is the emulated take.
  const serverViewRef = useRef<GolfView | null>(null)
  const pendingTakeRef = useRef(false)

  const accept = useCallback((next: GolfView) => {
    serverViewRef.current = next
    pendingTakeRef.current = false
    setView(mapGameView(next))
  }, [])

  const clear = useCallback(() => {
    serverViewRef.current = null
    pendingTakeRef.current = false
    setView(null)
    setEnded(null)
  }, [])

  const handleUpdate = useCallback(
    (update: GolfUpdate) => {
      if (update.gameJoined) {
        accept(update.gameJoined.view)
        setEnded(null)
        return
      }
      if (update.gameState) {
        accept(update.gameState.view)
        return
      }
      if (update.gameCreated) {
        // Our own create is followed by its gameJoined.
        if (update.gameCreated.createdBy !== playerId) showNotice(`${update.gameCreated.createdBy} opened table ${update.gameCreated.gameId}`)
        return
      }
      if (update.gameStarted) {
        showNotice(GAME_STARTED)
        return
      }
      if (update.turnChanged) {
        showNotice(update.turnChanged.playerId === playerId ? 'Your turn' : turnMessage(update.turnChanged.playerId))
        return
      }
      if (update.playerKnocked) {
        showNotice(knockedMessage(update.playerKnocked.playerId))
        return
      }
      if (update.gameEnded) {
        const over = update.gameEnded
        showNotice(gameOverMessage(over.winner))
        setEnded({
          winner: over.winner,
          winners: over.winners,
          finalScores: over.finalScores.map(score => ({ playerName: score.playerId, score: score.score }))
        })
        return
      }
      if (update.gameLeft) {
        clear()
        onLeft?.()
      }
    },
    [accept, clear, onLeft, playerId, showNotice]
  )

  const createTable = useCallback(() => move('createGame'), [move])
  const joinTable = useCallback((gameId: string) => move('joinGame', { gameId }), [move])
  const startTable = useCallback(() => move('startGame'), [move])
  const playAgain = useCallback(() => move('createGame'), [move])
  const leaveTable = useCallback(() => {
    if (view !== null && view.gamePhase !== 'ended') {
      move('leaveGame')
      return
    }
    // An ended table is already gone from the hub: only the view lingers.
    clear()
    onLeft?.()
  }, [clear, move, onLeft, view])

  const drawCard = useCallback(() => move('drawCard'), [move])
  const knock = useCallback(() => move('knock'), [move])
  const hideCards = useCallback(() => move('hideCards'), [move])

  const takeFromDiscard = useCallback(() => {
    const server = serverViewRef.current
    if (server === null || server.discardTop == null) return
    pendingTakeRef.current = true
    setView(prev => (prev === null ? prev : { ...prev, drawnCard: server.discardTop ?? null, discardPile: [] }))
  }, [])

  const discardDrawn = useCallback(() => {
    if (!pendingTakeRef.current) {
      move('discardDrawn')
      return
    }
    // Putting the discard top back: nothing ever left the browser.
    pendingTakeRef.current = false
    const server = serverViewRef.current
    if (server !== null) setView(mapGameView(server))
  }, [move])

  const peekCountdown = usePeekCountdown(view?.gamePhase === 'peeking' && view.allPlayersPeeked, hideCards)

  const tapCard = useCallback(
    (index: number) => {
      if (view === null) return
      const me = view.players.find(player => player.id === playerId)
      if (me === undefined) return
      if (!me.hasPeeked && me.revealedCards.length < 2 && !me.revealedCards.includes(index)) {
        move('peekCard', { cardIndex: index })
        return
      }
      const myTurn = view.players[view.currentPlayerIndex]?.id === playerId
      if (!myTurn || view.drawnCard === null) return
      if (pendingTakeRef.current) {
        pendingTakeRef.current = false
        move('takeFromDiscard', { cardIndex: index })
        return
      }
      move('swapCard', { cardIndex: index })
    },
    [move, playerId, view]
  )

  return {
    view,
    ended,
    peekCountdown,
    handleUpdate,
    clear,
    createTable,
    joinTable,
    startTable,
    leaveTable,
    playAgain,
    drawCard,
    takeFromDiscard,
    discardDrawn,
    knock,
    tapCard
  }
}
