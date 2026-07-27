import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { useGolfGame } from '../useGolfGame'
import type { Room } from '@/types/golf'
import type { ChatMessage } from '@/types/golfChat'
import { CHAT_HISTORY_LIMIT } from '@/types/golfChat'

// Room chat state in the hook (MoonBase#1226): merge by messageId across
// history and live, unread transitions, room scoping, and the send path.

const mockNetworkAdapter = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  createRoom: vi.fn(),
  createGame: vi.fn(),
  joinRoom: vi.fn(),
  joinGame: vi.fn(),
  leaveRoom: vi.fn(),
  startGame: vi.fn(),
  startNewGame: vi.fn(),
  leaveGame: vi.fn(),
  peekCard: vi.fn(),
  drawCard: vi.fn(),
  takeFromDiscard: vi.fn(),
  swapCard: vi.fn(),
  discardDrawn: vi.fn(),
  knock: vi.fn(),
  hideCards: vi.fn(),
  isMyTurn: vi.fn(),
  getCurrentPlayer: vi.fn(),
  // The chat capability: present on this mock the way the v2 adapter
  // provides it, so chatAvailable resolves true.
  sendChat: vi.fn(),
  roomState: null,
  _callbacks: null as {
    onRoomJoined?: (playerId: string, roomState: Room) => void
    onChatMessage?: (message: ChatMessage) => void
    onChatHistory?: (messages: ChatMessage[]) => void
  } | null
}

vi.mock('@/utils/networkAdapter', () => ({
  GolfNetworkAdapter: vi.fn().mockImplementation(function (callbacks) {
    mockNetworkAdapter._callbacks = callbacks
    return mockNetworkAdapter
  })
}))

vi.mock('@/utils/golfPermalinks', () => ({
  generateRoomPermalink: (roomId: string) => `/golf/room/${roomId}`,
  generateGamePermalink: (roomId: string, gameId: string) => `/golf/room/${roomId}/game/${gameId}`
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

const makeRoom = (id: string): Room => ({
  id,
  players: [],
  games: {},
  gameHistory: [],
  createdAt: '',
  lastActivity: ''
})

const msg = (messageId: number, text = `m${messageId}`): ChatMessage => ({
  messageId,
  playerId: 'bob',
  text,
  sentAtUnixMillis: 1_700_000_000_000 + messageId
})

describe('useGolfGame - room chat', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    mockNetworkAdapter._callbacks = null
  })

  it('starts empty with the capability reported from the adapter', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    expect(result.current.chatMessages).toEqual([])
    expect(result.current.chatUnreadCount).toBe(0)
    expect(result.current.chatAvailable).toBe(true)
  })

  it('merges history and live by id, in id order', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    act(() => {
      // Live lands first — a message committing during the join — then
      // the replay that also contains it.
      mockNetworkAdapter._callbacks?.onChatMessage?.(msg(3))
      mockNetworkAdapter._callbacks?.onChatHistory?.([msg(1), msg(2), msg(3)])
      mockNetworkAdapter._callbacks?.onChatMessage?.(msg(4))
    })
    expect(result.current.chatMessages.map(m => m.messageId)).toEqual([1, 2, 3, 4])
  })

  it('counts unread until marked seen, then counts only newer arrivals', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    act(() => {
      mockNetworkAdapter._callbacks?.onChatHistory?.([msg(1), msg(2)])
    })
    expect(result.current.chatUnreadCount).toBe(2)

    act(() => result.current.markChatSeen())
    expect(result.current.chatUnreadCount).toBe(0)

    act(() => {
      mockNetworkAdapter._callbacks?.onChatMessage?.(msg(3))
    })
    expect(result.current.chatUnreadCount).toBe(1)

    // A duplicate delivery of an already-seen id changes nothing.
    act(() => {
      mockNetworkAdapter._callbacks?.onChatMessage?.(msg(2))
    })
    expect(result.current.chatUnreadCount).toBe(1)
  })

  it('keeps chat across a resume into the same room, deduplicating the replay', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    act(() => {
      mockNetworkAdapter._callbacks?.onRoomJoined?.('alice', makeRoom('ROOM01'))
      mockNetworkAdapter._callbacks?.onChatHistory?.([msg(1), msg(2)])
    })
    // Separate act: markChatSeen reads the rendered message list, the
    // way the component invokes it after paint.
    act(() => result.current.markChatSeen())
    act(() => {
      // Reconnect: the same room announces again and replays history.
      mockNetworkAdapter._callbacks?.onRoomJoined?.('alice', makeRoom('ROOM01'))
      mockNetworkAdapter._callbacks?.onChatHistory?.([msg(1), msg(2), msg(3)])
    })
    expect(result.current.chatMessages.map(m => m.messageId)).toEqual([1, 2, 3])
    expect(result.current.chatUnreadCount).toBe(1)
  })

  it('drops the previous room chat when a different room is joined', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    act(() => {
      mockNetworkAdapter._callbacks?.onRoomJoined?.('alice', makeRoom('ROOM01'))
      mockNetworkAdapter._callbacks?.onChatHistory?.([msg(1), msg(2)])
    })
    act(() => {
      mockNetworkAdapter._callbacks?.onRoomJoined?.('alice', makeRoom('ROOM02'))
    })
    expect(result.current.chatMessages).toEqual([])
    expect(result.current.chatUnreadCount).toBe(0)
  })

  it('clears chat and unread on leaveRoom', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    act(() => {
      mockNetworkAdapter._callbacks?.onRoomJoined?.('alice', makeRoom('ROOM01'))
      mockNetworkAdapter._callbacks?.onChatHistory?.([msg(1)])
    })
    act(() => result.current.leaveRoom())
    expect(result.current.chatMessages).toEqual([])
    expect(result.current.chatUnreadCount).toBe(0)
  })

  it('caps the retained view at the server limit', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    const flood = Array.from({ length: CHAT_HISTORY_LIMIT + 10 }, (_, i) => msg(i + 1))
    act(() => {
      mockNetworkAdapter._callbacks?.onChatHistory?.(flood)
    })
    expect(result.current.chatMessages).toHaveLength(CHAT_HISTORY_LIMIT)
    expect(result.current.chatMessages[0].messageId).toBe(11)
  })

  it('trims before sending and refuses whitespace-only drafts', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    act(() => result.current.sendChat('  good luck  '))
    expect(mockNetworkAdapter.sendChat).toHaveBeenCalledWith('good luck')

    act(() => result.current.sendChat('   '))
    expect(mockNetworkAdapter.sendChat).toHaveBeenCalledTimes(1)
  })
})
