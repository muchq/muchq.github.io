import { useCallback, useState } from 'react'
import type { Card, RummyGameEnded, RummyMoveName, RummyMovePayloads, RummyUpdate, RummyView } from '@/apps/rummy/wire'
import type { HandOrder } from '@/apps/rummy/rules'
import { face, seatOf } from '@/apps/rummy/rules'
import { safeLocalStorage } from '@/utils/safeLocalStorage'

// A rummy table as the wire sends it, plus the viewer's selection and
// hand order on top, over the lobby's stream (useLobby). The owner feeds
// handleUpdate every rummy update and clears the table on a resume.

// How the viewer likes the hand laid out outlives the table.
const ORDER_KEY = 'rummy.order'

const storedOrder = (): HandOrder => (safeLocalStorage.get(ORDER_KEY) === 'rank' ? 'rank' : 'suit')

// What the table's chrome calls; the lobby panel adds create and join.
export interface RummyTableActions {
  startTable: () => void
  leaveTable: () => void
  // Another table, from the one that just ended: a create, since the
  // finished one is already gone from the hub.
  playAgain: () => void
  drawStock: () => void
  drawDiscard: () => void
  // Selection is by card, not by slot: the hand is shown sorted, and a
  // view that lands between two taps can move a card but not rename it.
  toggleCard: (card: Card) => void
  meldSelected: () => void
  // The one selected card, onto the meld at this place on the table.
  layOffSelected: (meldIndex: number) => void
  discardSelected: () => void
  setOrder: (order: HandOrder) => void
}

export interface UseRummyTable extends RummyTableActions {
  createTable: () => void
  joinTable: (gameId: string) => void
  view: RummyView | null
  ended: RummyGameEnded | null
  // Faces of the selected cards, in the order they were picked.
  selected: string[]
  order: HandOrder
  // A table has been asked for and not yet arrived.
  opening: boolean
  handleUpdate: (update: RummyUpdate) => void
  // Any refusal: whatever it was for, the table asked for did not
  // happen, so the ask can be made again.
  handleRejected: () => void
  clear: () => void
}

export interface UseRummyTableProps {
  playerId: string
  // Typed per move, so a misspelled member is a compile error rather
  // than a frame the hub cannot decode.
  move: <N extends RummyMoveName>(name: N, payload?: RummyMovePayloads[N]) => void
  showNotice: (message: string) => void
  // The table is gone from the hub: gameLeft, or a "Back" from an ended
  // table. The owner may steer the URL.
  onLeft?: () => void
}

export const useRummyTable = ({ playerId, move, showNotice, onLeft }: UseRummyTableProps): UseRummyTable => {
  const [view, setView] = useState<RummyView | null>(null)
  const [ended, setEnded] = useState<RummyGameEnded | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [opening, setOpening] = useState(false)
  const [order, setOrderState] = useState<HandOrder>(storedOrder)

  const clear = useCallback(() => {
    setView(null)
    setEnded(null)
    setSelected([])
    setOpening(false)
  }, [])
  const handleRejected = useCallback(() => setOpening(false), [])

  const handleUpdate = useCallback(
    (update: RummyUpdate) => {
      if (update.gameJoined) {
        setView(update.gameJoined.view)
        setEnded(null)
        setSelected([])
        setOpening(false)
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
        showNotice('Dealt. Draw a card to open your turn.')
        return
      }
      if (update.turnChanged) {
        // The felt lights the seat on turn and the piles light up for its
        // draw; a toast at the foot of the screen would sit on the hand.
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
  // One per ending: the hub answers the first with a table and refuses a
  // second, which would read as the first having failed.
  const playAgain = useCallback(() => {
    setOpening(true)
    move('createGame')
  }, [move])
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

  const drawStock = useCallback(() => move('drawStock'), [move])
  const drawDiscard = useCallback(() => move('drawDiscard'), [move])

  const toggleCard = useCallback((card: Card) => {
    const picked = face(card)
    setSelected(prev => (prev.includes(picked) ? prev.filter(f => f !== picked) : [...prev, picked]))
  }, [])

  // The selected cards, read out of the hand now on screen. A card that
  // has left the hand since it was picked sends nothing — half a meld is
  // not the meld anyone chose — and drops the selection with it.
  const selectedCards = useCallback((): Card[] | null => {
    const hand = view === null ? [] : (seatOf(view, playerId)?.hand ?? [])
    const cards = selected.map(picked => hand.find(card => face(card) === picked)).filter(card => card !== undefined)
    if (cards.length === 0 || cards.length !== selected.length) {
      setSelected([])
      return null
    }
    return cards
  }, [playerId, selected, view])

  const meldSelected = useCallback(() => {
    const cards = selectedCards()
    if (cards === null) return
    move('meld', { cards })
    setSelected([])
  }, [move, selectedCards])

  const layOffSelected = useCallback(
    (meldIndex: number) => {
      const cards = selectedCards()
      if (cards === null || cards.length !== 1) return
      move('layOff', { card: cards[0], meldIndex })
      setSelected([])
    },
    [move, selectedCards]
  )

  const discardSelected = useCallback(() => {
    const cards = selectedCards()
    if (cards === null || cards.length !== 1) return
    move('discard', { card: cards[0] })
    setSelected([])
  }, [move, selectedCards])

  const setOrder = useCallback((next: HandOrder) => {
    setOrderState(next)
    safeLocalStorage.set(ORDER_KEY, next)
  }, [])

  return {
    view,
    ended,
    selected,
    order,
    opening,
    handleUpdate,
    handleRejected,
    clear,
    createTable,
    joinTable,
    startTable,
    leaveTable,
    playAgain,
    drawStock,
    drawDiscard,
    toggleCard,
    meldSelected,
    layOffSelected,
    discardSelected,
    setOrder
  }
}
