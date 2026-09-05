import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mergeChatMessages } from '@/types/golfChat'
import { HubStream, hubPlayUrl } from '@/utils/hubStream'
import type { HubGameSummary, HubRoom, HubSessionReady } from '@/utils/hubStream'
import { HubWorldLink } from '@/utils/hubWorldLink'
import { GOLF_RESUME_TOKEN_KEY } from '@/utils/networkAdapter'
import type { CastleMoveName, CastleUpdate } from '@/apps/castle/wire'
import type { CastleChat } from './useCastleGame'
import { useCastleTable } from './useCastleTable'
import type { UseCastleTable } from './useCastleTable'

// The lobby (MoonBase#1490 phase 4): one stream carrying the room, its
// chat, the world, and the tables. The world is always up — the hub puts
// this session in its room's world, or the plaza's — and a castle table
// swaps the main view while the world keeps ticking. A golf table is a
// hand-off to golf's own page: it dials with the identity this hook
// holds (the same resume token), so the seat parks here and resumes
// there, at the table.

export const lobbyRoomPath = (roomId: string) => `/games/room/${encodeURIComponent(roomId)}`
export const lobbyTablePath = (roomId: string, gameId: string) =>
  `${lobbyRoomPath(roomId)}/table/${encodeURIComponent(gameId)}`
export const golfTablePath = (roomId: string, gameId?: string) =>
  gameId === undefined
    ? `/golf/room/${encodeURIComponent(roomId)}`
    : `/golf/room/${encodeURIComponent(roomId)}/game/${encodeURIComponent(gameId)}`

const NOTICE_MS = 3000

export interface UseLobbyProps {
  // The share link's room, joined once the session is ready, and the
  // table in it to sit at once the room is in hand.
  permalinkRoomId?: string | null
  permalinkGameId?: string | null
  onConnectionChange?: (connected: boolean) => void
  onPlayerIdChange?: (id: string | null) => void
}

export interface UseLobby {
  playerId: string
  connected: boolean
  lost: string | null
  room: HubRoom | null
  chat: CastleChat
  notice: string
  roomCode: string
  setRoomCode: (code: string) => void
  createRoom: () => void
  joinRoom: () => void
  leaveRoom: () => void
  sendChat: (text: string) => void
  reconnect: () => void
  world: HubWorldLink
  castle: UseCastleTable
  // Golf tables live on golf's page: open one there, or go to one.
  createGolfTable: () => void
  openGolfTable: (gameId: string) => void
}

export const useLobby = ({
  permalinkRoomId = null,
  permalinkGameId = null,
  onConnectionChange,
  onPlayerIdChange
}: UseLobbyProps = {}): UseLobby => {
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
  const roomIdRef = useRef<string | null>(null)
  const permalinkRef = useRef({ roomId: permalinkRoomId, gameId: permalinkGameId })
  // One join per share link: a later roomState must not re-trigger it.
  const permalinkPendingRef = useRef(false)
  // The table the share link named, sat at once its room arrives.
  const tablePendingRef = useRef<string | null>(null)
  const chatSeqRef = useRef(0)
  const navigate = useNavigate()

  useEffect(() => {
    permalinkRef.current = { roomId: permalinkRoomId, gameId: permalinkGameId }
  }, [permalinkRoomId, permalinkGameId])

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

  const redial = useCallback(() => {
    streamRef.current?.disconnect()
    streamRef.current?.connect()
  }, [])
  // One link for the life of the hook; the renderer attaches to it when
  // its canvas mounts.
  const worldRef = useRef<HubWorldLink | null>(null)
  if (worldRef.current === null) worldRef.current = new HubWorldLink(() => streamRef.current, redial)
  const world = worldRef.current

  const move = useCallback((name: CastleMoveName, payload: unknown = {}) => {
    streamRef.current?.move('castle', name, payload)
  }, [])
  const onTableLeft = useCallback(() => {
    if (roomIdRef.current !== null) navigate(lobbyRoomPath(roomIdRef.current), { replace: true })
  }, [navigate])
  const castle = useCastleTable({ playerId, move, showNotice, onLeft: onTableLeft })
  const castleRef = useRef(castle)
  castleRef.current = castle

  // The share link's table, once its room is in hand: a castle table
  // still waiting is joined here; a golf table is golf's page's; anything
  // else is reported, and the room stays.
  const sitAtPendingTable = useCallback(
    (next: HubRoom) => {
      const gameId = tablePendingRef.current
      if (gameId === null) return
      tablePendingRef.current = null
      const table = next.games.find(summary => summary.gameId === gameId)
      if (table === undefined) {
        showNotice(`Table ${gameId} is gone`)
        return
      }
      if (table.game === 'golf') {
        navigate(golfTablePath(next.roomId, gameId), { replace: true })
        return
      }
      if (table.status !== 'waiting') {
        showNotice(`Table ${gameId} is in play`)
        return
      }
      castleRef.current.joinTable(gameId)
    },
    [navigate, showNotice]
  )

  const handleSessionReady = useCallback(
    (ready: HubSessionReady) => {
      setPlayerId(ready.playerId)
      onPlayerIdChange?.(ready.playerId)
      // A seat that survived the disconnect comes back as a gameJoined
      // after this; one that did not sends nothing, and the old table
      // must not linger.
      castleRef.current.clear()
      const wanted = permalinkRef.current
      if (wanted.roomId && wanted.roomId !== ready.roomId) {
        // The link names another room: leave the resumed one first, and
        // join on the roomLeft; or join outright when there is none.
        permalinkPendingRef.current = true
        tablePendingRef.current = wanted.gameId
        if (ready.roomId) {
          streamRef.current?.leaveRoom()
        } else {
          streamRef.current?.joinRoom(wanted.roomId)
        }
        return
      }
      if (wanted.roomId && wanted.gameId) tablePendingRef.current = wanted.gameId
      // The world is the session's — its room's, or the plaza's. A room
      // the seat resumed into is already this session's: the roomState
      // that follows is not a room change, and the world is joined once.
      if (ready.roomId) {
        roomIdRef.current = ready.roomId
        navigate(lobbyRoomPath(ready.roomId), { replace: true })
      }
      world.sessionReady(ready.playerId)
    },
    [navigate, onPlayerIdChange, world]
  )

  const handleRoom = useCallback(
    (next: HubRoom) => {
      if (roomIdRef.current !== next.roomId) {
        roomIdRef.current = next.roomId
        resetChat()
        navigate(lobbyRoomPath(next.roomId), { replace: true })
        // A new room is a new world: the hub left the old one for us.
        if (permalinkPendingRef.current) {
          permalinkPendingRef.current = false
          world.sessionReady(streamRef.current?.playerId ?? '')
        } else {
          world.rejoin()
        }
      }
      setRoom(next)
      sitAtPendingTable(next)
    },
    [navigate, resetChat, sitAtPendingTable, world]
  )

  const handleRoomLeft = useCallback(() => {
    roomIdRef.current = null
    setRoom(null)
    castleRef.current.clear()
    resetChat()
    const wanted = permalinkRef.current
    if (permalinkPendingRef.current && wanted.roomId) {
      streamRef.current?.joinRoom(wanted.roomId)
      return
    }
    navigate('/games', { replace: true })
    world.rejoin()
  }, [navigate, resetChat, world])

  const handleGame = useCallback(
    (game: string, update: Record<string, unknown>) => {
      if (game === 'castle') {
        const castleUpdate = update as CastleUpdate
        castleRef.current.handleUpdate(castleUpdate)
        if (castleUpdate.gameJoined && roomIdRef.current !== null) {
          navigate(lobbyTablePath(roomIdRef.current, castleUpdate.gameJoined.view.gameId), { replace: true })
        }
        return
      }
      // A golf table this session just sat at — opened from here — is
      // golf's page's from now on; it resumes this seat there.
      const joined = update.gameJoined as { view?: { gameId?: string } } | undefined
      if (joined?.view?.gameId !== undefined && roomIdRef.current !== null) {
        navigate(golfTablePath(roomIdRef.current, joined.view.gameId))
      }
    },
    [navigate]
  )

  useEffect(() => {
    const stream = new HubStream({
      playUrl: hubPlayUrl(),
      resumeTokenKey: GOLF_RESUME_TOKEN_KEY,
      callbacks: {
        onConnection: up => {
          setConnected(up)
          if (up) setLost(null)
          else world.dropped()
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
        onGame: handleGame,
        onLobby: update => world.apply(update),
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

  const createGolfTable = useCallback(() => streamRef.current?.move('golf', 'createGame'), [])
  const openGolfTable = useCallback(
    (gameId: string) => {
      if (roomIdRef.current !== null) navigate(golfTablePath(roomIdRef.current, gameId))
    },
    [navigate]
  )

  return {
    playerId,
    connected,
    lost,
    room,
    chat,
    notice,
    roomCode,
    setRoomCode,
    createRoom,
    joinRoom,
    leaveRoom,
    sendChat,
    reconnect: redial,
    world,
    castle,
    createGolfTable,
    openGolfTable
  }
}

// How a table reads in the panel: open to join, or why not. Both games
// seat four.
export const TABLE_SEATS = 4
export function tableOffer(table: HubGameSummary): { label: string; open: boolean } {
  if (table.status !== 'waiting') return { label: 'In play', open: false }
  if (table.playerCount >= TABLE_SEATS) return { label: 'Full', open: false }
  return { label: 'Join', open: true }
}
