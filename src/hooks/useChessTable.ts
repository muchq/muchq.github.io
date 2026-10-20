import { useCallback, useState } from 'react'
import { useRoundRobinList } from './useRoundRobinList'
import type { ChessHistory, ChessMoveName, ChessMovePayloads, ChessReview, ChessRoundRobin, ChessUpdate, ChessView } from '@/apps/chess/wire'

// A chess table as the wire sends it, over the lobby's stream (useLobby).
// The owner feeds handleUpdate every chess update and clears the table on
// a resume. The view is the whole truth: an ended one carries the result,
// and arrives before gameEnded. The board's own selection is the
// component's: it lives and dies with one view. A watcher's view is the
// seats' own, with no chair of its own in it.
//
// The room's finished games (MoonBase#1637) ride beside the table: the
// history as last asked for (a room it says is unpublished gets published),
// and the game under review, which outlives the table it came from. So do the
// room's round robins (MoonBase#1647): unknown until asked for, then kept
// current by each one every member hears.

export interface ChessTableActions {
  // Setup and seconds; absent fields use the hub's defaults.
  startTable: (clock?: ChessMovePayloads['startGame']) => void
  leaveTable: () => void
  // Another game: the table's next, on its clock, while it is open; a new
  // table once it has closed.
  playAgain: (setupId?: string) => void
  play: (uci: string) => void
  // The move played and not yet answered: the next view, or a refusal,
  // lets it go.
  sent: string | null
  resign: () => void
  // Stockfish in the second seat, at an Elo of 1320 to 3190.
  addBot: (elo: number) => void
  // A finished game from the room's history, by its table and line.
  reviewGame: (gameId: string, ordinal: number) => void
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
  history: ChessHistory | null
  review: ChessReview | null
  loadHistory: () => void
  // A game from the room's history, by its archive id.
  reviewArchived: (archiveId: number) => void
  closeReview: () => void
  roundRobins: ChessRoundRobin[] | null
  loadRoundRobins: () => void
  createRoundRobin: (entrants: string[], terms: ChessMovePayloads['challenge']) => void
  // A table for the player's pairing with opponent, which only they fill.
  playRoundRobin: (roundRobinId: string, opponent: string) => void
  forfeit: (roundRobinId: string, winner: string, loser: string) => void
  withdraw: (roundRobinId: string, playerId: string) => void
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
  const [sent, setSent] = useState<string | null>(null)
  const [history, setHistory] = useState<ChessHistory | null>(null)
  const [review, setReview] = useState<ChessReview | null>(null)
  const askList = useCallback(() => move('roundRobins'), [move])
  const { roundRobins, load: loadRoundRobins, heardList, heardOne, reset: resetRoundRobins } = useRoundRobinList<ChessRoundRobin>(askList)

  // Held until the hub answers with a view, or refuses.
  const settle = useCallback(() => {
    setOpening(false)
    setSeating(false)
    setSent(null)
  }, [])
  const clearTable = useCallback(() => {
    setView(null)
    settle()
  }, [settle])
  const clear = useCallback(() => {
    clearTable()
    setHistory(null)
    setReview(null)
    resetRoundRobins()
  }, [clearTable, resetRoundRobins])

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
        clearTable()
        onLeft?.()
        return
      }
      if (update.history) {
        setHistory(update.history)
        // Every room's games are public.
        if (!update.history.published) move('publish', { published: true })
        return
      }
      if (update.review) {
        setReview(update.review)
        return
      }
      if (update.roundRobins) {
        heardList(update.roundRobins.roundRobins)
        return
      }
      if (update.roundRobin) {
        heardOne(update.roundRobin)
        return
      }
      if (update.published) {
        const { published } = update.published
        setHistory(held => (held === null ? held : { ...held, published }))
        // A withdraw (old client, or the wire) is published again.
        if (!published) move('publish', { published: true })
      }
      // gameStarted, turnChanged and gameEnded: the view says it all.
    },
    [clearTable, heardList, heardOne, move, onLeft, playerId, settle, showNotice]
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
  // Held until its view arrives, or the hub refuses.
  const joinTable = useCallback(
    (gameId: string) => {
      setOpening(true)
      move('joinGame', { gameId })
    },
    [move]
  )
  const watchTable = useCallback((gameId: string) => move('watch', { gameId }), [move])
  const watching = view !== null && !view.players.some(player => player.playerId === playerId)
  const startTable = useCallback((clock: ChessMovePayloads['startGame'] = {}) => move('startGame', clock), [move])
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
    (uci: string) => {
      setSent(uci)
      move('play', { uci })
    },
    [move]
  )
  const postChallenge = useCallback((terms: ChessMovePayloads['challenge']) => move('challenge', terms), [move])
  const resign = useCallback(() => move('resign'), [move])
  const addBot = useCallback(
    (elo: number) => {
      setSeating(true)
      move('addBot', { elo })
    },
    [move]
  )

  const loadHistory = useCallback(() => move('history'), [move])
  const reviewGame = useCallback((gameId: string, ordinal: number) => move('review', { gameId, ordinal }), [move])
  const reviewArchived = useCallback((archiveId: number) => move('review', { archiveId }), [move])
  const closeReview = useCallback(() => setReview(null), [])
  const createRoundRobin = useCallback(
    (entrants: string[], terms: ChessMovePayloads['challenge']) => move('createRoundRobin', { entrants, terms }),
    [move]
  )
  // Held until its table arrives, or the hub refuses.
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
    history,
    review,
    loadHistory,
    reviewGame,
    reviewArchived,
    closeReview,
    roundRobins,
    loadRoundRobins,
    createRoundRobin,
    playRoundRobin,
    forfeit,
    withdraw,
    watching,
    opening,
    seating,
    sent,
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
