import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGolfGame } from '../useGolfGame'
import type { GameState } from '@/types/golf'

// The peek phase's close on golf's page: once every seat has peeked the
// countdown runs, and this client asks the hub to hide the cards.

type Callbacks = { onGameStateUpdate?: (state: GameState) => void }

const mockAdapter = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  hideCards: vi.fn(),
  _callbacks: null as Callbacks | null
}

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}))

vi.mock('../../utils/networkAdapter', () => ({
  GolfNetworkAdapter: vi.fn().mockImplementation(function (callbacks: Callbacks) {
    mockAdapter._callbacks = callbacks
    return mockAdapter
  })
}))

const peeking = (allPlayersPeeked: boolean): GameState => ({
  id: 'G1',
  players: [],
  currentPlayerIndex: 0,
  drawPile: 40,
  discardPile: [],
  gamePhase: 'peeking',
  knockedPlayerId: null,
  drawnCard: null,
  allPlayersPeeked
})

describe('useGolfGame peek countdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('counts down once every seat has peeked, then hides the cards through the adapter', () => {
    const { result } = renderHook(() => useGolfGame({}))
    act(() => mockAdapter._callbacks?.onGameStateUpdate?.(peeking(false)))
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.peekCountdown).toBeNull()
    expect(mockAdapter.hideCards).not.toHaveBeenCalled()

    act(() => mockAdapter._callbacks?.onGameStateUpdate?.(peeking(true)))
    act(() => vi.advanceTimersByTime(100))
    expect(result.current.peekCountdown).toBe(3)
    act(() => vi.advanceTimersByTime(4000))
    expect(result.current.peekCountdown).toBeNull()
    expect(mockAdapter.hideCards).toHaveBeenCalledTimes(1)
  })
})
