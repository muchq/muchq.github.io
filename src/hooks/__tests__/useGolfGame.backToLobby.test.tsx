import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGolfGame } from '../useGolfGame'
import type { GameState, Room } from '@/types/golf'

// The lobby is this room too (MoonBase#1490): a golf table opened there
// hands off to this page, and the way back is the lobby's room path. A
// table still held would pull the lobby straight back here, so it is
// left first.

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

type Callbacks = {
  onRoomJoined?: (playerId: string, room: Room) => void
  onGameJoined?: (playerId: string, game: GameState) => void
  onConnectionChange?: (connected: boolean) => void
}
const mockAdapter = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  leaveGame: vi.fn(),
  _callbacks: null as Callbacks | null
}

vi.mock('../../utils/networkAdapter', () => ({
  GolfNetworkAdapter: vi.fn().mockImplementation(function (callbacks: Callbacks) {
    mockAdapter._callbacks = callbacks
    return mockAdapter
  })
}))

const room = { id: 'R1', players: [], games: {}, gameHistory: [] } as unknown as Room
const game = {
  id: 'G1',
  players: [],
  currentPlayerIndex: 0,
  drawPile: 40,
  discardPile: [],
  gamePhase: 'playing',
  knockedPlayerId: null,
  drawnCard: null,
  allPlayersPeeked: true
} as unknown as GameState

describe('useGolfGame backToLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdapter._callbacks = null
  })

  it("goes to the lobby's room, out of a held table first", () => {
    const { result } = renderHook(() => useGolfGame({}))
    act(() => result.current.backToLobby())
    expect(mockNavigate).not.toHaveBeenCalled()

    act(() => mockAdapter._callbacks?.onRoomJoined?.('alice', room))
    act(() => result.current.backToLobby())
    expect(mockAdapter.leaveGame).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenLastCalledWith('/games/room/R1')

    act(() => mockAdapter._callbacks?.onGameJoined?.('alice', game))
    act(() => mockAdapter._callbacks?.onConnectionChange?.(true))
    act(() => result.current.backToLobby())
    expect(mockAdapter.leaveGame).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenLastCalledWith('/games/room/R1')
  })

  it('stays at a held table while the socket is down: a leave it cannot carry is not a leave', () => {
    const { result } = renderHook(() => useGolfGame({}))
    act(() => mockAdapter._callbacks?.onRoomJoined?.('alice', room))
    act(() => mockAdapter._callbacks?.onGameJoined?.('alice', game))
    act(() => mockAdapter._callbacks?.onConnectionChange?.(false))
    mockNavigate.mockClear()
    act(() => result.current.backToLobby())
    expect(mockAdapter.leaveGame).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(result.current.notification).toContain('Reconnecting')
  })
})
