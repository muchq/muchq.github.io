import { useCallback, useState } from 'react'
import type { ChessHistory, ChessMoveName, ChessMovePayloads, ChessReview, ChessUpdate, ChessView } from '@/apps/chess/wire'

// A chess table as the wire sends it, over the lobby's stream (useLobby).
// The owner feeds handleUpdate every chess update and clears the table on
// a resume. The view is the whole truth: an ended one carries the result,
// and arrives before gameEnded. The board's own selection is the
// component's: it lives and dies with one view. A watcher's view is the
// seats' own, with no chair of its own in it.
//
// The room's finished games (MoonBase#1637) ride beside the table: the
// history as last asked for, the published flag as last heard, and the
// game under review, which outlives the table it came from.

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
  publish: (published: boolean) => void
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
  }, [clearTable])

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
        return
      }
      if (update.review) {
        setReview(update.review)
        return
      }
      if (update.published) {
        const { published, by } = update.published
        setHistory(held => (held === null ? held : { ...held, published }))
        if (by === playerId) {
          showNotice(
            published
              ? 'You published this room’s chess games: games that end from now on are public'
              : 'You stopped publishing this room’s chess games: games already public stay up for 30 days'
          )
          return
        }
        if (by === undefined) showNotice(`this room’s chess games are ${published ? 'now published' : 'no longer published'}`)
        else showNotice(`${by} ${published ? 'published' : 'stopped publishing'} this room’s chess games`)
      }
      // gameStarted, turnChanged and gameEnded: the view says it all.
    },
    [clearTable, onLeft, playerId, settle, showNotice]
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
  const publish = useCallback((published: boolean) => move('publish', { published }), [move])

  return {
    view,
    history,
    review,
    loadHistory,
    reviewGame,
    reviewArchived,
    closeReview,
    publish,
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
