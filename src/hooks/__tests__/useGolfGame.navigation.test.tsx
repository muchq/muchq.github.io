import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGolfGame } from '../useGolfGame'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

// Mock the network adapter
const mockAdapter = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  joinRoom: vi.fn(),
  joinGame: vi.fn(),
  createRoom: vi.fn(),
  createGame: vi.fn(),
  startGame: vi.fn(),
  startNewGame: vi.fn(),
  peekCard: vi.fn(),
  drawCard: vi.fn(),
  takeFromDiscard: vi.fn(),
  swapCard: vi.fn(),
  discardDrawn: vi.fn(),
  knock: vi.fn(),
  hideCards: vi.fn()
}

vi.mock('../../utils/networkAdapter', () => ({
  GolfNetworkAdapter: vi.fn().mockImplementation(function () { return mockAdapter })
}))

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/golf'
  },
  writable: true
})

describe('useGolfGame navigation functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.pathname = '/golf'
  })

  describe('navigation helper functions', () => {
    it('should provide navigateToRoom function', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      expect(result.current.navigateToRoom).toBeDefined()
      expect(typeof result.current.navigateToRoom).toBe('function')
    })

    it('should provide navigateToGame function', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      expect(result.current.navigateToGame).toBeDefined()
      expect(typeof result.current.navigateToGame).toBe('function')
    })

    it('should navigate to room URL when navigateToRoom is called', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      act(() => {
        result.current.navigateToRoom('room123')
      })

      expect(mockNavigate).toHaveBeenCalledWith('/golf/room/room123', { replace: false })
    })

    it('should navigate to game URL when navigateToGame is called', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      act(() => {
        result.current.navigateToGame('room123', 'game456')
      })

      expect(mockNavigate).toHaveBeenCalledWith('/golf/room/room123/game/game456', { replace: false })
    })

    it('should throw error for invalid room ID in navigateToRoom', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      expect(() => {
        act(() => {
          result.current.navigateToRoom('invalid-room')
        })
      }).toThrow('Invalid room ID provided for permalink generation')
    })

    it('should throw error for invalid game ID in navigateToGame', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      expect(() => {
        act(() => {
          result.current.navigateToGame('room123', 'invalid-game')
        })
      }).toThrow('Invalid game ID provided for permalink generation')
    })
  })

  describe('basic URL synchronization', () => {
    it('should have navigation helper functions in return object', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      expect(result.current).toHaveProperty('navigateToRoom')
      expect(result.current).toHaveProperty('navigateToGame')
      expect(typeof result.current.navigateToRoom).toBe('function')
      expect(typeof result.current.navigateToGame).toBe('function')
    })

    it('should call navigate with correct parameters for room', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      act(() => {
        result.current.navigateToRoom('testroom')
      })

      expect(mockNavigate).toHaveBeenCalledWith('/golf/room/testroom', { replace: false })
    })

    it('should call navigate with correct parameters for game', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      act(() => {
        result.current.navigateToGame('testroom', 'testgame')
      })

      expect(mockNavigate).toHaveBeenCalledWith('/golf/room/testroom/game/testgame', { replace: false })
    })
  })
})