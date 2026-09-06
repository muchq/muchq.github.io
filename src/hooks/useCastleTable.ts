import { useCallback, useState } from 'react'
import type { CastleGameEnded, CastleMoveName, CastleUpdate, CastleView } from '@/apps/castle/wire'
import { cardsOf, rowInPlay, seatOf, toggleSelection } from '@/apps/castle/rules'

// A castle table as the wire sends it, plus the viewer's selection on
// top, over the lobby's stream (useLobby). The owner feeds handleUpdate
// every castle update and clears the table on a resume.

// What the table's chrome calls; the lobby panel adds create and join.
export interface CastleTableActions {
  startTable: () => void
  leaveTable: () => void
  swapForSetup: (handIndex: number, faceUpIndex: number) => void
  ready: () => void
  toggleCard: (index: number) => void
  playSelected: () => void
  playFaceDown: (index: number) => void
  pickUp: () => void
}

export interface UseCastleTable extends CastleTableActions {
  createTable: () => void
  joinTable: (gameId: string) => void
  view: CastleView | null
  ended: CastleGameEnded | null
  selected: number[]
  handleUpdate: (update: CastleUpdate) => void
  clear: () => void
}

export interface UseCastleTableProps {
  playerId: string
  move: (name: CastleMoveName, payload?: unknown) => void
  showNotice: (message: string) => void
  // The table is gone from the hub: gameLeft, or a "Back" from an ended
  // table. The owner may steer the URL.
  onLeft?: () => void
}

export const useCastleTable = ({ playerId, move, showNotice, onLeft }: UseCastleTableProps): UseCastleTable => {
  const [view, setView] = useState<CastleView | null>(null)
  const [ended, setEnded] = useState<CastleGameEnded | null>(null)
  const [selected, setSelected] = useState<number[]>([])

  const clear = useCallback(() => {
    setView(null)
    setEnded(null)
    setSelected([])
  }, [])

  const handleUpdate = useCallback(
    (update: CastleUpdate) => {
      if (update.gameJoined) {
        setView(update.gameJoined.view)
        setEnded(null)
        setSelected([])
        return
      }
      if (update.gameState) {
        setView(update.gameState.view)
        setSelected([])
        return
      }
      if (update.gameCreated) {
        if (update.gameCreated.createdBy !== playerId) showNotice(`${update.gameCreated.createdBy} opened table ${update.gameCreated.gameId}`)
        return
      }
      if (update.gameStarted) {
        showNotice('Dealt. Arrange your face-up row, then ready up.')
        return
      }
      if (update.turnChanged) {
        showNotice(update.turnChanged.playerId === playerId ? 'Your turn' : `${update.turnChanged.playerId} to play`)
        return
      }
      if (update.gameEnded) {
        setEnded(update.gameEnded)
        return
      }
      if (update.gameLeft) {
        clear()
        onLeft?.()
      }
    },
    [clear, onLeft, playerId, showNotice]
  )

  const createTable = useCallback(() => move('createGame'), [move])
  const joinTable = useCallback((gameId: string) => move('joinGame', { gameId }), [move])
  const startTable = useCallback(() => move('startGame'), [move])
  const leaveTable = useCallback(() => {
    if (view !== null && view.phase !== 'ended') {
      move('leaveGame')
      return
    }
    // An ended table is already gone from the hub: only the view lingers.
    clear()
    onLeft?.()
  }, [clear, move, onLeft, view])

  const swapForSetup = useCallback(
    (handIndex: number, faceUpIndex: number) => move('swapForSetup', { handIndex, faceUpIndex }),
    [move]
  )
  const ready = useCallback(() => move('ready'), [move])

  const toggleCard = useCallback(
    (index: number) => {
      const me = view === null ? undefined : seatOf(view, playerId)
      if (me === undefined) return
      setSelected(prev => toggleSelection(prev, cardsOf(me, rowInPlay(me)), index))
    },
    [playerId, view]
  )

  const playSelected = useCallback(() => {
    const me = view === null ? undefined : seatOf(view, playerId)
    if (me === undefined || selected.length === 0) return
    move(rowInPlay(me) === 'hand' ? 'playFromHand' : 'playFaceUp', { indexes: selected })
    setSelected([])
  }, [move, playerId, selected, view])

  const playFaceDown = useCallback((index: number) => move('playFaceDown', { index }), [move])
  const pickUp = useCallback(() => move('pickUp'), [move])

  return {
    view,
    ended,
    selected,
    handleUpdate,
    clear,
    createTable,
    joinTable,
    startTable,
    leaveTable,
    swapForSetup,
    ready,
    toggleCard,
    playSelected,
    playFaceDown,
    pickUp
  }
}
