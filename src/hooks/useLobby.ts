import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mergeChatMessages } from '@/types/golfChat'
import { HUB_RESUME_TOKEN_KEY } from '@/utils/hubSession'
import { HubStream, hubPlayUrl } from '@/utils/hubStream'
import type { HubRoom, HubSessionReady } from '@/utils/hubStream'
import { HubWorldLink } from '@/utils/hubWorldLink'
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
//
// The world follows the hub's room. The hub leaves a world for this
// session on every room change and at every close, and refuses a second
// join to one it already stands in — so the join goes out once per room
// the session settles in, and a roomState that only re-projects the same
// room is not a change.

export const lobbyRoomPath = (roomId: string) => `/games/room/${encodeURIComponent(roomId)}`
const lobbyTablePath = (roomId: string, gameId: string) =>
  `${lobbyRoomPath(roomId)}/table/${encodeURIComponent(gameId)}`
const golfTablePath = (roomId: string, gameId: string) =>
  `/golf/room/${encodeURIComponent(roomId)}/game/${encodeURIComponent(gameId)}`

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
  world: HubWorldLink
  castle: UseCastleTable
  // Golf tables live on golf's page: open one there, or go to one.
  createGolfTable: () => void
  openGolfTable: (gameId: string) => void
}

// A share link's room the session is on its way to: left the resumed
// one, or asked for this one, and waiting on the hub.
interface RoomSwitch {
  roomId: string
  gameId: string | null
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
  // The room the hub has this session in; null is the plaza.
  const roomIdRef = useRef<string | null>(null)
  // The room whose world this session joined; undefined is no world.
  const worldRoomRef = useRef<string | null | undefined>(undefined)
  const permalinkRef = useRef({ roomId: permalinkRoomId, gameId: permalinkGameId })
  const switchRef = useRef<RoomSwitch | null>(null)
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

  // One link for the life of the hook; the renderer attaches to it when
  // its canvas mounts.
  const worldRef = useRef<HubWorldLink | null>(null)
  if (worldRef.current === null) {
    worldRef.current = new HubWorldLink(
      () => streamRef.current,
      () => {
        streamRef.current?.disconnect()
        streamRef.current?.connect()
      }
    )
  }
  const world = worldRef.current

  const enterWorld = useCallback(
    (roomId: string | null) => {
      if (worldRoomRef.current === roomId) return
      worldRoomRef.current = roomId
      world.join()
    },
    [world]
  )
  const dropWorld = useCallback(() => {
    worldRoomRef.current = undefined
    world.dropped()
  }, [world])

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
      // A seat the hub still holds at a table comes back on its own, as
      // the gameJoined that follows this roomState.
      const me = next.players.find(player => player.playerId === streamRef.current?.playerId)
      if (me?.table !== undefined) return
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
      world.sessionReady(ready.playerId)
      // A fresh seat, or one whose close left the world: in none yet.
      worldRoomRef.current = undefined
      switchRef.current = null
      tablePendingRef.current = null
      const here = ready.roomId ?? null
      roomIdRef.current = here
      const wanted = permalinkRef.current
      if (wanted.roomId && wanted.roomId !== here) {
        // The link names another room: leave the resumed one first and
        // join on the roomLeft, or join outright when there is none. The
        // world waits for the room to settle.
        switchRef.current = { roomId: wanted.roomId, gameId: wanted.gameId ?? null }
        if (here !== null) streamRef.current?.leaveRoom()
        else streamRef.current?.joinRoom(wanted.roomId)
        return
      }
      if (wanted.gameId) tablePendingRef.current = wanted.gameId
      if (here !== null && !wanted.roomId) navigate(lobbyRoomPath(here), { replace: true })
      enterWorld(here)
    },
    [enterWorld, navigate, onPlayerIdChange, world]
  )

  const handleRoom = useCallback(
    (next: HubRoom) => {
      const pending = switchRef.current
      if (pending !== null && next.roomId !== pending.roomId) {
        // The resumed room's own state, on the way out of it.
        roomIdRef.current = next.roomId
        setRoom(next)
        return
      }
      const changed = roomIdRef.current !== next.roomId
      roomIdRef.current = next.roomId
      if (pending !== null) {
        switchRef.current = null
        tablePendingRef.current = pending.gameId
      }
      if (changed) {
        resetChat()
        navigate(lobbyRoomPath(next.roomId), { replace: true })
      }
      setRoom(next)
      enterWorld(next.roomId)
      sitAtPendingTable(next)
    },
    [enterWorld, navigate, resetChat, sitAtPendingTable]
  )

  const handleRoomLeft = useCallback(() => {
    roomIdRef.current = null
    setRoom(null)
    castleRef.current.clear()
    resetChat()
    const pending = switchRef.current
    if (pending !== null) {
      streamRef.current?.joinRoom(pending.roomId)
      return
    }
    navigate('/games', { replace: true })
    enterWorld(null)
  }, [enterWorld, navigate, resetChat])

  const handleRejected = useCallback(
    (reason: string) => {
      if (switchRef.current !== null) {
        // The switch failed; the hub has this session where it is.
        switchRef.current = null
        const here = roomIdRef.current
        navigate(here === null ? '/games' : lobbyRoomPath(here), { replace: true })
        enterWorld(here)
      }
      chatSeqRef.current += 1
      setChat(prev => ({ ...prev, rejection: { seq: chatSeqRef.current, reason } }))
      showNotice(reason)
    },
    [enterWorld, navigate, showNotice]
  )

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
      // A golf seat — sat at from here, or one the resume found still
      // held — is golf's page's from now on; it resumes this seat there.
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
      resumeTokenKey: HUB_RESUME_TOKEN_KEY,
      callbacks: {
        onConnection: up => {
          setConnected(up)
          if (up) setLost(null)
          else dropWorld()
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
        onRejected: handleRejected,
        onGame: handleGame,
        onLobby: update => world.apply(update),
        onLost: reason => {
          dropWorld()
          setLost(reason)
        }
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
    world,
    castle,
    createGolfTable,
    openGolfTable
  }
}
