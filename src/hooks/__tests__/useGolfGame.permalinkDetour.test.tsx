import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { useGolfGame } from '../useGolfGame'
import type { Room } from '@/types/golf'
import type { ParsedPermalinkParams } from '../../utils/golfPermalinks'

// The share-link repair (muchq.github.io#260). A returning visitor's
// resume can land them in the room they last played in while the URL
// names a different one; the hub then refuses a bare joinRoom ("room
// unavailable or already in a room"). These pin the three pieces of the
// fix: the resume must not navigate the share link away, a rejection
// must end the attempt instead of riding the 10s timeout into an
// identical retry, and the join flow must leave the resumed room first
// and chain into the target on the server's roomLeft.

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
  roomState: null as Room | null,
  _callbacks: null as {
    onConnectionChange?: (connected: boolean) => void
    onRoomJoined?: (playerId: string, roomState: Room) => void
    onRoomLeft?: (roomId: string) => void
    onGameError?: (message: string) => void
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

const targetParams: ParsedPermalinkParams = {
  roomId: 'target-room',
  gameId: null,
  isValid: true
}

describe('useGolfGame - permalink detour and rejection (#260)', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    mockNetworkAdapter._callbacks = null
    mockNetworkAdapter.roomState = null
  })

  it('a resume into a different room does not navigate the share link away', () => {
    renderHook(() => useGolfGame({ permalinkParams: targetParams }), { wrapper })

    // The resume lands in the old room before any join flow runs — the
    // race that used to rewrite the URL to the old room and silently
    // strand the visitor there.
    act(() => {
      mockNetworkAdapter._callbacks?.onRoomJoined?.('p1', makeRoom('old-room'))
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('a rejection ends the attempt with its reason instead of retrying', () => {
    const { result } = renderHook(() => useGolfGame({ permalinkParams: targetParams }), {
      wrapper
    })

    act(() => {
      mockNetworkAdapter._callbacks?.onConnectionChange?.(true)
    })
    expect(mockNetworkAdapter.joinRoom).toHaveBeenCalledWith('target-room')
    expect(result.current.permalinkJoinAttempt.isAttempting).toBe(true)

    act(() => {
      mockNetworkAdapter._callbacks?.onGameError?.('room unavailable or already in a room')
    })

    expect(result.current.permalinkJoinAttempt.isAttempting).toBe(false)
    expect(result.current.permalinkJoinAttempt.error).toBe(
      'room unavailable or already in a room'
    )
    // The failed target stays recorded, and the join effect must not
    // start the same link over — one send, not one per 10s timeout.
    expect(result.current.permalinkJoinAttempt.roomId).toBe('target-room')
    expect(mockNetworkAdapter.joinRoom).toHaveBeenCalledTimes(1)
  })

  it('leaves a resumed detour room first and joins the target on roomLeft', () => {
    const { result } = renderHook(() => useGolfGame({ permalinkParams: targetParams }), {
      wrapper
    })

    act(() => {
      mockNetworkAdapter._callbacks?.onRoomJoined?.('p1', makeRoom('old-room'))
    })
    act(() => {
      mockNetworkAdapter._callbacks?.onConnectionChange?.(true)
    })

    // In a room the link does not name: the flow must leave, not join.
    expect(mockNetworkAdapter.leaveRoom).toHaveBeenCalledWith('old-room')
    expect(mockNetworkAdapter.joinRoom).not.toHaveBeenCalled()
    expect(result.current.permalinkJoinAttempt.isAttempting).toBe(true)

    // The hub confirms the leave; the attempt chains into its target.
    act(() => {
      mockNetworkAdapter._callbacks?.onRoomLeft?.('old-room')
    })
    expect(result.current.roomState).toBeNull()
    expect(mockNetworkAdapter.joinRoom).toHaveBeenCalledWith('target-room')

    // The target lands; the attempt resolves clean.
    act(() => {
      mockNetworkAdapter._callbacks?.onRoomJoined?.('p1', makeRoom('target-room'))
    })
    expect(result.current.permalinkJoinAttempt.isAttempting).toBe(false)
    expect(result.current.permalinkJoinAttempt.error).toBeNull()
    expect(result.current.roomState?.id).toBe('target-room')
  })
})
