import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGolfGame } from '../useGolfGame'
import type { FinalScore } from '@/types/golf'

// winner/winners state from gameEnded (MoonBase#1187 phase 0): winner is the
// display string ("alice & bob" on shared wins), winners the typed list.

type GameEndedCallback = (winner: string, finalScores: FinalScore[], winners?: string[]) => void

const mockAdapter = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  leaveGame: vi.fn(),
  _callbacks: null as { onGameEnded?: GameEndedCallback } | null
}

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}))

vi.mock('../../utils/networkAdapter', () => ({
  GolfNetworkAdapter: vi.fn().mockImplementation(function (callbacks: {
    onGameEnded?: GameEndedCallback
  }) {
    mockAdapter._callbacks = callbacks
    return mockAdapter
  })
}))

const finalScores: FinalScore[] = [
  { playerName: 'alice', score: 5 },
  { playerName: 'bob', score: 5 },
  { playerName: 'carol', score: 12 }
]

describe('useGolfGame gameEnded state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdapter._callbacks = null
  })

  it('stores the display winner and the typed winners list on a shared win', () => {
    const { result } = renderHook(() => useGolfGame({}))

    act(() => {
      mockAdapter._callbacks?.onGameEnded?.('alice & bob', finalScores, ['alice', 'bob'])
    })

    expect(result.current.winner).toBe('alice & bob')
    expect(result.current.winners).toEqual(['alice', 'bob'])
    expect(result.current.finalScores).toEqual(finalScores)
  })

  it('stores null winners when a legacy server omits the list', () => {
    const { result } = renderHook(() => useGolfGame({}))

    act(() => {
      mockAdapter._callbacks?.onGameEnded?.('alice', finalScores, undefined)
    })

    expect(result.current.winner).toBe('alice')
    expect(result.current.winners).toBeNull()
    expect(result.current.finalScores).toEqual(finalScores)
  })

  it('clears winner state when leaving the game', () => {
    const { result } = renderHook(() => useGolfGame({}))

    act(() => {
      mockAdapter._callbacks?.onGameEnded?.('alice & bob', finalScores, ['alice', 'bob'])
    })
    act(() => {
      result.current.leaveGame()
    })

    expect(result.current.winner).toBeNull()
    expect(result.current.winners).toBeNull()
    expect(result.current.finalScores).toBeNull()
  })
})
