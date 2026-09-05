import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ChatMessage } from '@/types/golfChat'
import { mergeChatMessages } from '@/types/golfChat'
import { HubStream, hubPlayUrl } from '@/utils/hubStream'
import type { HubRoom, HubSessionReady } from '@/utils/hubStream'
import type { CastleGameEnded, CastleMoveName, CastleUpdate, CastleView } from '@/apps/castle/wire'
import { useCastleTable } from './useCastleTable'
import type { CastleTableActions } from './useCastleTable'

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

export interface UseCastleGame extends CastleTableActions {
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
  const [notice, setNotice] = useState('')
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

  const move = useCallback((name: CastleMoveName, payload: unknown = {}) => {
    streamRef.current?.move('castle', name, payload)
  }, [])
  const table = useCastleTable({ playerId, move, showNotice })
  // The stream's callbacks are created once; the table's handlers ride
  // a ref so they never go stale either.
  const tableRef = useRef(table)
  tableRef.current = table

  const handleSessionReady = useCallback(
    (ready: HubSessionReady) => {
      playerIdRef.current = ready.playerId
      setPlayerId(ready.playerId)
      onPlayerIdChange?.(ready.playerId)
      // A seat that survived the disconnect comes back as a gameJoined
      // after this; one that did not (grace expired, identity gone)
      // sends nothing, and the old table must not linger.
      tableRef.current.clear()
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
    tableRef.current.clear()
    resetChat()
    const wanted = permalinkRef.current
    if (permalinkPendingRef.current && wanted) {
      permalinkPendingRef.current = false
      streamRef.current?.joinRoom(wanted)
      return
    }
    navigate('/castle', { replace: true })
  }, [navigate, resetChat])

  useEffect(() => {
    const stream = new HubStream({
      playUrl: hubPlayUrl(),
      resumeTokenKey: CASTLE_RESUME_TOKEN_KEY,
      callbacks: {
        onConnection: up => {
          setConnected(up)
          if (up) setLost(null)
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
          if (game === 'castle') tableRef.current.handleUpdate(update as CastleUpdate)
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

  const sendChat = useCallback((text: string) => streamRef.current?.chat(text), [])

  const { view, ended, selected, handleUpdate: _handleUpdate, clear: _clear, ...actions } = table
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
    ...actions,
    sendChat
  }
}
