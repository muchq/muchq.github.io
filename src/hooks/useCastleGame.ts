import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ChatMessage } from '@/types/golfChat'
import { mergeChatMessages } from '@/types/golfChat'
import { HubStream, hubPlayUrl } from '@/utils/hubStream'
import type { HubRoom, HubSessionReady } from '@/utils/hubStream'
import type { CastleGameEnded, CastleMoveName, CastleUpdate, CastleView } from '@/apps/castle/wire'
import { cardsOf, rowInPlay, seatOf, toggleSelection } from '@/apps/castle/rules'

// The castle app's one hook: the hub stream in castle's envelope, the
// room and the table as the wire sends them, and the viewer's selection
// on top. Components see this surface, never the wire.

export const CASTLE_RESUME_TOKEN_KEY = 'castle_v2_resume_token'
const NOTICE_MS = 3000

export const castleRoomPath = (roomId: string) => `/castle/room/${encodeURIComponent(roomId)}`

export interface CastleChat {
  messages: ChatMessage[]
  // True once the room's wire has delivered chat (the join replay or a
  // live message); a UI ahead of its server renders no composer.
  available: boolean
  replayUpTo: number
  rejection: { seq: number; reason: string } | null
}

export interface UseCastleGameProps {
  // The share link's room, joined once the session is ready.
  permalinkRoomId?: string | null
  onConnectionChange?: (connected: boolean) => void
  onPlayerIdChange?: (id: string | null) => void
}

export interface UseCastleGame {
  playerId: string
  connected: boolean
  lost: string | null
  room: HubRoom | null
  view: CastleView | null
  ended: CastleGameEnded | null
  notice: string
  chat: CastleChat
  selected: number[]
  roomCode: string
  setRoomCode: (code: string) => void
  createRoom: () => void
  joinRoom: () => void
  leaveRoom: () => void
  createTable: () => void
  joinTable: (gameId: string) => void
  startTable: () => void
  leaveTable: () => void
  swapForSetup: (handIndex: number, faceUpIndex: number) => void
  ready: () => void
  toggleCard: (index: number) => void
  playSelected: () => void
  playFaceDown: (index: number) => void
  pickUp: () => void
  sendChat: (text: string) => void
}

export const useCastleGame = ({
  permalinkRoomId = null,
  onConnectionChange,
  onPlayerIdChange
}: UseCastleGameProps = {}): UseCastleGame => {
  const [playerId, setPlayerId] = useState('')
  const [connected, setConnected] = useState(false)
  const [lost, setLost] = useState<string | null>(null)
  const [room, setRoom] = useState<HubRoom | null>(null)
  const [view, setView] = useState<CastleView | null>(null)
  const [ended, setEnded] = useState<CastleGameEnded | null>(null)
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [roomCode, setRoomCode] = useState('')
  const [chat, setChat] = useState<CastleChat>({ messages: [], available: false, replayUpTo: 0, rejection: null })

  const streamRef = useRef<HubStream | null>(null)
  const noticeTimeoutRef = useRef<number | null>(null)
  // The stream's callbacks are created once; anything they consult
  // rides a ref so the closure never goes stale.
  const playerIdRef = useRef('')
  const roomIdRef = useRef<string | null>(null)
  const permalinkRef = useRef(permalinkRoomId)
  // One join per share link: a later roomState must not re-trigger it.
  const permalinkPendingRef = useRef(false)
  const chatSeqRef = useRef(0)
  const navigate = useNavigate()

  useEffect(() => {
    permalinkRef.current = permalinkRoomId
  }, [permalinkRoomId])

  const showNotice = useCallback((message: string) => {
    setNotice(message)
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current)
    noticeTimeoutRef.current = window.setTimeout(() => {
      setNotice('')
      noticeTimeoutRef.current = null
    }, NOTICE_MS)
  }, [])

  const resetChat = useCallback(() => {
    setChat({ messages: [], available: false, replayUpTo: 0, rejection: null })
  }, [])

  const handleSessionReady = useCallback(
    (ready: HubSessionReady) => {
      playerIdRef.current = ready.playerId
      setPlayerId(ready.playerId)
      onPlayerIdChange?.(ready.playerId)
      const wanted = permalinkRef.current
      if (!wanted || wanted === ready.roomId) return
      // The link names another room: leave the resumed one first, and
      // join on the roomLeft; or join outright when there is none.
      permalinkPendingRef.current = true
      if (ready.roomId) {
        streamRef.current?.leaveRoom()
      } else {
        streamRef.current?.joinRoom(wanted)
      }
    },
    [onPlayerIdChange]
  )

  const handleRoom = useCallback(
    (next: HubRoom) => {
      if (roomIdRef.current !== next.roomId) {
        roomIdRef.current = next.roomId
        resetChat()
        navigate(castleRoomPath(next.roomId), { replace: true })
      }
      setRoom(next)
    },
    [navigate, resetChat]
  )

  const handleRoomLeft = useCallback(() => {
    roomIdRef.current = null
    setRoom(null)
    setView(null)
    setEnded(null)
    setSelected([])
    resetChat()
    const wanted = permalinkRef.current
    if (permalinkPendingRef.current && wanted) {
      permalinkPendingRef.current = false
      streamRef.current?.joinRoom(wanted)
      return
    }
    navigate('/castle', { replace: true })
  }, [navigate, resetChat])

  const handleUpdate = useCallback(
    (update: CastleUpdate) => {
      const me = playerIdRef.current
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
        if (update.gameCreated.createdBy !== me) showNotice(`${update.gameCreated.createdBy} opened table ${update.gameCreated.gameId}`)
        return
      }
      if (update.gameStarted) {
        showNotice('Dealt. Arrange your face-up row, then ready up.')
        return
      }
      if (update.turnChanged) {
        showNotice(update.turnChanged.playerId === me ? 'Your turn' : `${update.turnChanged.playerId} to play`)
        return
      }
      if (update.gameEnded) {
        setEnded(update.gameEnded)
        return
      }
      if (update.gameLeft) {
        setView(null)
        setEnded(null)
        setSelected([])
      }
    },
    [showNotice]
  )

  useEffect(() => {
    const stream = new HubStream({
      playUrl: hubPlayUrl(),
      resumeTokenKey: CASTLE_RESUME_TOKEN_KEY,
      callbacks: {
        onConnection: up => {
          setConnected(up)
          onConnectionChange?.(up)
        },
        onSessionReady: handleSessionReady,
        onRoom: handleRoom,
        onRoomLeft: handleRoomLeft,
        onChat: message =>
          setChat(prev => ({ ...prev, available: true, messages: mergeChatMessages(prev.messages, [message]) })),
        onChatHistory: messages =>
          setChat(prev => ({
            ...prev,
            available: true,
            messages: mergeChatMessages(prev.messages, messages),
            replayUpTo: Math.max(prev.replayUpTo, ...messages.map(m => m.messageId))
          })),
        onRejected: reason => {
          permalinkPendingRef.current = false
          chatSeqRef.current += 1
          setChat(prev => ({ ...prev, rejection: { seq: chatSeqRef.current, reason } }))
          showNotice(reason)
        },
        onGame: (game, update) => {
          if (game === 'castle') handleUpdate(update as CastleUpdate)
        },
        onLost: reason => setLost(reason)
      }
    })
    streamRef.current = stream
    stream.connect()
    return () => {
      stream.disconnect()
      streamRef.current = null
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current)
    }
    // The stream lives as long as the app; its callbacks read refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const move = useCallback((name: CastleMoveName, payload: unknown = {}) => {
    streamRef.current?.move('castle', name, payload)
  }, [])

  const createRoom = useCallback(() => streamRef.current?.createRoom(), [])
  const joinRoom = useCallback(() => {
    const code = roomCode.trim()
    if (!code) {
      showNotice('Enter a room code')
      return
    }
    streamRef.current?.joinRoom(code)
  }, [roomCode, showNotice])
  const leaveRoom = useCallback(() => streamRef.current?.leaveRoom(), [])

  const createTable = useCallback(() => move('createGame'), [move])
  const joinTable = useCallback((gameId: string) => move('joinGame', { gameId }), [move])
  const startTable = useCallback(() => move('startGame'), [move])
  const leaveTable = useCallback(() => {
    if (view !== null && view.phase !== 'ended') {
      move('leaveGame')
      return
    }
    // An ended table is already gone from the hub: only the view lingers.
    setView(null)
    setEnded(null)
    setSelected([])
  }, [move, view])

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
  const sendChat = useCallback((text: string) => streamRef.current?.chat(text), [])

  return {
    playerId,
    connected,
    lost,
    room,
    view,
    ended,
    notice,
    chat,
    selected,
    roomCode,
    setRoomCode,
    createRoom,
    joinRoom,
    leaveRoom,
    createTable,
    joinTable,
    startTable,
    leaveTable,
    swapForSetup,
    ready,
    toggleCard,
    playSelected,
    playFaceDown,
    pickUp,
    sendChat
  }
}
