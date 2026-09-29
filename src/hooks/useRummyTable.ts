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

const ORDERS: HandOrder[] = ['suit', 'rank']

const storedOrder = (): HandOrder => ORDERS.find(order => order === safeLocalStorage.get(ORDER_KEY)) ?? 'suit'

// What the table's chrome calls; the lobby panel adds create and join.
export interface RummyTableActions {
  // Seats the table; the dealer's pick deals.
  startTable: () => void
  chooseVariant: (variant: string) => void
  leaveTable: () => void
  // Another table, from the one that just ended: a create, since the
  // finished one is already gone from the hub.
  playAgain: () => void
  drawStock: () => void
  // The top of the discard pile.
  drawDiscard: () => void
  // A card deeper in the discard pile to take it down to, picked or put
  // back; the take-down is sent by one of the two below.
  pickDownTo: (card: Card) => void
  // The pile down to the picked card, melded with the selected cards.
  takeDownMeld: () => void
  // The pile down to the picked card, laid off onto this table meld.
  takeDownLayOff: (meldIndex: number) => void
  // Gin: turn the upcard down.
  pass: () => void
  // Selection is by card, not by slot: the hand is shown sorted, and a
  // view that lands between two taps can move a card but not rename it.
  toggleCard: (card: Card) => void
  meldSelected: () => void
  // The one selected card, onto the meld at this place on the table.
  layOffSelected: (meldIndex: number) => void
  discardSelected: () => void
  // Gin: end the deal throwing the one selected card.
  knockSelected: () => void
  setOrder: (order: HandOrder) => void
}

export interface UseRummyTable extends RummyTableActions {
  createTable: () => void
  joinTable: (gameId: string) => void
  view: RummyView | null
  ended: RummyGameEnded | null
  // Faces of the selected cards, in the order they were picked. Kept until
  // the hub answers: the next view clears them, and a refusal leaves them
  // picked so the move can be fixed rather than rebuilt.
  selected: string[]
  // The face of the discard pile card picked to take the pile down to;
  // cleared like the selection.
  downTo: string | null
  order: HandOrder
  // A table has been asked for and not yet arrived.
  opening: boolean
  // A deal has been asked for and the hub has not answered: a second ask
  // would be refused and read as the first having failed.
  dealing: boolean
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
  const [downTo, setDownTo] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [dealing, setDealing] = useState(false)
  const [order, setOrderState] = useState<HandOrder>(storedOrder)

  const clear = useCallback(() => {
    setView(null)
    setEnded(null)
    setSelected([])
    setDownTo(null)
    setOpening(false)
    setDealing(false)
  }, [])
  const handleRejected = useCallback(() => {
    setOpening(false)
    setDealing(false)
  }, [])

  const handleUpdate = useCallback(
    (update: RummyUpdate) => {
      if (update.gameJoined) {
        setView(update.gameJoined.view)
        setEnded(null)
        setSelected([])
        setDownTo(null)
        setOpening(false)
        setDealing(false)
        return
      }
      if (update.gameState) {
        setView(update.gameState.view)
        setSelected([])
        setDownTo(null)
        setDealing(false)
        return
      }
      if (update.gameCreated) {
        if (update.gameCreated.createdBy !== playerId) showNotice(`${update.gameCreated.createdBy} opened table ${update.gameCreated.gameId}`)
        return
      }
      if (update.gameStarted || update.turnChanged) {
        // The felt says both: who deals between deals, and the seat on turn
        // with its piles lit. A toast at the foot of the screen would sit
        // on the hand.
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
  const chooseVariant = useCallback(
    (variant: string) => {
      setDealing(true)
      move('chooseVariant', { variant })
    },
    [move]
  )
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
  // The hand cards picked were for the pile card: they go when it is put
  // back or another is picked.
  const pickDownTo = useCallback(
    (card: Card) => {
      const picked = face(card)
      setSelected([])
      setDownTo(downTo === picked ? null : picked)
    },
    [downTo]
  )
  // The picked pile card, read out of the pile now on screen.
  const downToCard = useCallback((): Card | null => view?.discardPile?.find(card => face(card) === downTo) ?? null, [downTo, view])
  const pass = useCallback(() => move('pass'), [move])

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
  }, [move, selectedCards])

  const layOffSelected = useCallback(
    (meldIndex: number) => {
      const cards = selectedCards()
      if (cards === null || cards.length !== 1) return
      move('layOff', { card: cards[0], meldIndex })
    },
    [move, selectedCards]
  )

  const takeDownMeld = useCallback(() => {
    const card = downToCard()
    const cards = selectedCards()
    if (card === null || cards === null) return
    move('takeDown', { card, cards })
  }, [downToCard, move, selectedCards])

  const takeDownLayOff = useCallback(
    (meldIndex: number) => {
      const card = downToCard()
      if (card === null) return
      move('takeDown', { card, meldIndex })
    },
    [downToCard, move]
  )

  const discardSelected = useCallback(() => {
    const cards = selectedCards()
    if (cards === null || cards.length !== 1) return
    move('discard', { card: cards[0] })
  }, [move, selectedCards])

  const knockSelected = useCallback(() => {
    const cards = selectedCards()
    if (cards === null || cards.length !== 1) return
    move('knock', { card: cards[0] })
  }, [move, selectedCards])

  const setOrder = useCallback((next: HandOrder) => {
    setOrderState(next)
    safeLocalStorage.set(ORDER_KEY, next)
  }, [])

  return {
    view,
    ended,
    selected,
    downTo,
    order,
    opening,
    dealing,
    handleUpdate,
    handleRejected,
    clear,
    createTable,
    joinTable,
    startTable,
    chooseVariant,
    leaveTable,
    playAgain,
    drawStock,
    drawDiscard,
    pickDownTo,
    takeDownMeld,
    takeDownLayOff,
    pass,
    toggleCard,
    meldSelected,
    layOffSelected,
    discardSelected,
    knockSelected,
    setOrder
  }
}
