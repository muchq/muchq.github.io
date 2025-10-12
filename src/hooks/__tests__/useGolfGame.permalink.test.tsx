import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGolfGame } from '../useGolfGame'
import type { ParsedPermalinkParams } from '../../utils/golfPermalinks'

// Mock React Router hooks
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn())
}))

// Simple mock for the network adapter
vi.mock('../../utils/networkAdapter', () => ({
  GolfNetworkAdapter: vi.fn().mockImplementation(() => ({
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
  }))
}))

describe('useGolfGame permalink functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('permalink state management', () => {
    it('should initialize with correct permalink join attempt state', () => {
      const permalinkParams: ParsedPermalinkParams = {
        roomId: 'room123',
        gameId: null,
        isValid: true
      }

      const { result } = renderHook(() => 
        useGolfGame({ permalinkParams })
      )

      expect(result.current.permalinkJoinAttempt).toEqual({
        isAttempting: false,
        roomId: null,
        gameId: null,
        error: null,
        gameJoinAttempted: false
      })
    })

    it('should not attempt join with invalid permalink params', () => {
      const permalinkParams: ParsedPermalinkParams = {
        roomId: null,
        gameId: null,
        isValid: false,
        error: 'Invalid URL'
      }

      const { result } = renderHook(() => 
        useGolfGame({ permalinkParams })
      )

      expect(result.current.permalinkJoinAttempt.isAttempting).toBe(false)
    })

    it('should handle empty permalink params', () => {
      const { result } = renderHook(() => 
        useGolfGame({})
      )

      expect(result.current.permalinkJoinAttempt).toEqual({
        isAttempting: false,
        roomId: null,
        gameId: null,
        error: null,
        gameJoinAttempted: false
      })
    })

    it('should accept permalink params in props', () => {
      const permalinkParams: ParsedPermalinkParams = {
        roomId: 'room123',
        gameId: 'game456',
        isValid: true
      }

      const { result } = renderHook(() => 
        useGolfGame({ permalinkParams })
      )

      // Should initialize without errors
      expect(result.current.permalinkJoinAttempt.error).toBe(null)
    })
  })

  describe('hook interface', () => {
    it('should return all expected properties including permalink state', () => {
      const { result } = renderHook(() => 
        useGolfGame({})
      )

      // Check that all expected properties are present
      expect(result.current).toHaveProperty('gameState')
      expect(result.current).toHaveProperty('roomState')
      expect(result.current).toHaveProperty('playerId')
      expect(result.current).toHaveProperty('roomCode')
      expect(result.current).toHaveProperty('selectedCardIndex')
      expect(result.current).toHaveProperty('isInLobby')
      expect(result.current).toHaveProperty('isInRoom')
      expect(result.current).toHaveProperty('notification')
      expect(result.current).toHaveProperty('isConnected')
      expect(result.current).toHaveProperty('peekCountdown')
      expect(result.current).toHaveProperty('winner')
      expect(result.current).toHaveProperty('finalScores')
      expect(result.current).toHaveProperty('permalinkJoinAttempt')
      
      // Check action functions
      expect(result.current).toHaveProperty('createRoom')
      expect(result.current).toHaveProperty('createGame')
      expect(result.current).toHaveProperty('joinRoom')
      expect(result.current).toHaveProperty('joinGame')
      expect(result.current).toHaveProperty('startGame')
      expect(result.current).toHaveProperty('startNewGame')
      
      // Check computed properties
      expect(result.current).toHaveProperty('currentPlayer')
      expect(result.current).toHaveProperty('isMyTurn')
    })

    it('should have correct permalink join attempt structure', () => {
      const { result } = renderHook(() => 
        useGolfGame({})
      )

      expect(result.current.permalinkJoinAttempt).toEqual({
        isAttempting: false,
        roomId: null,
        gameId: null,
        error: null,
        gameJoinAttempted: false
      })
    })
  })
})