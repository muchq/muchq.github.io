import { useCallback, useState } from 'react'
import type { WordchainLetters, WordchainMoveName, WordchainMovePayloads, WordchainUpdate, WordchainView } from '@/apps/wordchains/wire'

// A wordchain race table as the wire sends it (MoonBase#1719), over the
// lobby's stream (useLobby). The view is the whole truth: the hub checks
// every word, so nothing here knows the dictionary.

export interface WordchainTableActions {
  // The first race, or the next once one is over.
  startTable: (letters: WordchainLetters) => void
  leaveTable: () => void
  // A new table, once this one has closed.
  playAgain: () => void
  play: (word: string) => void
  retract: () => void
  // A quick race on these letters, or any (MoonBase#1736).
  seek: (letters?: WordchainLetters) => void
}

export interface UseWordchainTable extends WordchainTableActions {
  createTable: () => void
  joinTable: (gameId: string) => void
  view: WordchainView | null
  // A table asked for and not yet arrived.
  opening: boolean
  // A word or a retract sent and not yet answered: the next view, or a
  // refusal, lets it go.
  sending: boolean
  // The hub's refusals of a word or take-back this seat sent, counted.
  refusals: number
  handleUpdate: (update: WordchainUpdate) => void
  handleRejected: () => void
  clear: () => void
}

export interface UseWordchainTableProps {
  playerId: string
  move: <N extends WordchainMoveName>(name: N, payload?: WordchainMovePayloads[N]) => void
  showNotice: (message: string) => void
  onLeft?: () => void
  inQuickRace?: () => boolean
}

export const useWordchainTable = ({ playerId, move, showNotice, onLeft, inQuickRace }: UseWordchainTableProps): UseWordchainTable => {
  const [view, setView] = useState<WordchainView | null>(null)
  const [opening, setOpening] = useState(false)
  const [sending, setSending] = useState(false)
  const [refusals, setRefusals] = useState(0)
  // The letters the last quick race sought, for the next; any after a
  // reload.
  const [soughtLetters, setSoughtLetters] = useState<WordchainLetters | undefined>(undefined)

  const settle = useCallback(() => {
    setOpening(false)
    setSending(false)
  }, [])
  const clear = useCallback(() => {
    setView(null)
    settle()
  }, [settle])

  const handleUpdate = useCallback(
    (update: WordchainUpdate) => {
      const next = update.gameJoined?.view ?? update.gameState?.view
      if (next !== undefined) {
        setView(next)
        settle()
        return
      }
      if (update.gameCreated) {
        if (update.gameCreated.createdBy !== playerId) showNotice(`${update.gameCreated.createdBy} opened word chains table ${update.gameCreated.gameId}`)
        return
      }
      if (update.gameLeft) {
        clear()
        onLeft?.()
      }
      // gameStarted and gameEnded: the view says each.
    },
    [clear, onLeft, playerId, settle, showNotice]
  )

  const rejected = useCallback(() => {
    if (sending) setRefusals(count => count + 1)
    settle()
  }, [sending, settle])

  const createTable = useCallback(() => move('createGame'), [move])
  const joinTable = useCallback(
    (gameId: string) => {
      setOpening(true)
      move('joinGame', { gameId })
    },
    [move]
  )
  const startTable = useCallback((letters: WordchainLetters) => move('startGame', { letters }), [move])
  const leaveTable = useCallback(() => {
    if (view !== null && view.phase !== 'closed') {
      move('leaveGame')
      return
    }
    // A closed table is already gone from the hub: only the view lingers.
    clear()
    onLeft?.()
  }, [clear, move, onLeft, view])
  const seek = useCallback(
    (letters?: WordchainLetters) => {
      setSoughtLetters(letters)
      setOpening(true)
      move('seek', letters === undefined ? {} : { letters })
    },
    [move]
  )
  // The pool has no tables of one's choosing: there, another seek.
  const playAgain = useCallback(() => {
    if (inQuickRace?.()) {
      seek(soughtLetters)
      return
    }
    setOpening(true)
    move('createGame')
  }, [inQuickRace, move, seek, soughtLetters])
  const play = useCallback(
    (word: string) => {
      setSending(true)
      move('play', { word })
    },
    [move]
  )
  const retract = useCallback(() => {
    setSending(true)
    move('retract')
  }, [move])

  return { view, opening, sending, refusals, handleUpdate, handleRejected: rejected, clear, createTable, joinTable, startTable, leaveTable, playAgain, play, retract, seek }
}
