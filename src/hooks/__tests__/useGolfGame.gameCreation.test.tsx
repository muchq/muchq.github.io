import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGolfGame } from '../useGolfGame'
import type { Room, GameState as GolfGameState, Player } from '@/types/golf'

// Helper functions to create mock objects
const createMockRoomPlayer = (id: string, name: string): Player => ({
  id,
  name,
  isConnected: true,
  gamesPlayed: 0,
  gamesWon: 0,
  totalScore: 0,
  cards: [],
  score: 0,
  revealedCards: [],
  isReady: false,
  clientId: `client-${id}`,
  hasPeeked: false,
  joinedAt: new Date().toISOString()
})

const createMockGamePlayer = (id: string): Player => ({
  id,
  name: `Player ${id}`,
  isConnected: true,
  gamesPlayed: 0,
  gamesWon: 0,
  totalScore: 0,
  cards: [],
  score: 0,
  revealedCards: [],
  isReady: false,
  clientId: `client-${id}`,
  hasPeeked: false,
  joinedAt: new Date().toISOString()
})

const createMockRoom = (id: string): Room => ({
  id,
  players: [createMockRoomPlayer('player1', 'Player 1')],
  games: {},
  gameHistory: [],
  createdAt: new Date().toISOString(),
  lastActivity: new Date().toISOString()
})

const createMockGameState = (id: string): GolfGameState => ({
  id,
  players: [createMockGamePlayer('player1')],
  currentPlayerIndex: 0,
  gamePhase: 'waiting',
  drawPile: 52,
  discardPile: [],
  drawnCard: null,
  allPlayersPeeked: false,
  knockedPlayerId: null
})

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
  hideCards: vi.fn(),
  roomState: null as Room | null,
  _callbacks: null as {
    onRoomJoined?: (playerId: string, roomState: Room) => void
    onGameJoined?: (playerId: string, gameState: GolfGameState) => void
    onNewGameStarted?: (gameId: string, previousGameId?: string) => void
  } | null
}

vi.mock('../../utils/networkAdapter', () => ({
  GolfNetworkAdapter: vi.fn().mockImplementation(function (callbacks: {
    onRoomJoined?: (playerId: string, roomState: Room) => void
    onGameJoined?: (playerId: string, gameState: GolfGameState) => void
    onNewGameStarted?: (gameId: string, previousGameId?: string) => void
  }) {
    // Store callbacks for later use in tests
    mockAdapter._callbacks = callbacks
    // Update roomState when onRoomJoined is called
    const callbacksObj = callbacks as { onRoomJoined?: (playerId: string, roomState: Room) => void }
    const originalOnRoomJoined = callbacksObj?.onRoomJoined
    if (originalOnRoomJoined) {
      callbacksObj.onRoomJoined = (playerId: string, roomState: Room) => {
        mockAdapter.roomState = roomState
        originalOnRoomJoined(playerId, roomState)
      }
    }
    return mockAdapter
  })
}))

describe('useGolfGame enhanced game creation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('startNewGame functionality', () => {
    it('should require room state to create new game', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      act(() => {
        result.current.startNewGame()
      })

      expect(mockAdapter.startNewGame).not.toHaveBeenCalled()
      expect(result.current.notification).toBe('Must be in a room to create a new game')
    })

    it('should call network adapter startNewGame when in room', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      const mockRoom = createMockRoom('testroom')

      act(() => {
        // Simulate room joined callback
        mockAdapter._callbacks?.onRoomJoined?.('player1', mockRoom)
      })

      act(() => {
        result.current.startNewGame()
      })

      expect(mockAdapter.startNewGame).toHaveBeenCalledTimes(1)
    })

    it('should automatically join creator to new game when newGameStarted callback is triggered', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      const mockRoom = createMockRoom('testroom')

      act(() => {
        // Simulate room joined callback
        mockAdapter._callbacks?.onRoomJoined?.('player1', mockRoom)
      })

      act(() => {
        // Start creating new game
        result.current.startNewGame()
      })

      act(() => {
        // Simulate server response with new game started
        mockAdapter._callbacks?.onNewGameStarted?.('newgame123', 'oldgame456')
      })

      // Should automatically join the new game
      expect(mockAdapter.joinGame).toHaveBeenCalledWith('testroom', 'newgame123')
    })

    it('should update URL when creator joins new game', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      const mockRoom = createMockRoom('testroom')
      const mockGameState = createMockGameState('newgame123')

      act(() => {
        // Simulate room joined callback
        mockAdapter._callbacks?.onRoomJoined?.('player1', mockRoom)
      })

      // Clear previous navigate calls from room join
      mockNavigate.mockClear()

      act(() => {
        // Start creating new game
        result.current.startNewGame()
      })

      act(() => {
        // Simulate server response with new game started
        mockAdapter._callbacks?.onNewGameStarted?.('newgame123', 'oldgame456')
      })

      act(() => {
        // Simulate successful game join
        mockAdapter._callbacks?.onGameJoined?.('player1', mockGameState)
      })

      // Should navigate to the new game URL
      expect(mockNavigate).toHaveBeenCalledWith('/golf/room/testroom/game/newgame123', { replace: false })
    })

    it('should show success notification when creator joins new game', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      const mockRoom = createMockRoom('testroom')
      const mockGameState = createMockGameState('newgame123')

      act(() => {
        // Simulate room joined callback
        mockAdapter._callbacks?.onRoomJoined?.('player1', mockRoom)
      })

      act(() => {
        // Start creating new game
        result.current.startNewGame()
      })

      act(() => {
        // Simulate server response with new game started
        mockAdapter._callbacks?.onNewGameStarted?.('newgame123', 'oldgame456')
      })

      act(() => {
        // Simulate successful game join
        mockAdapter._callbacks?.onGameJoined?.('player1', mockGameState)
      })

      expect(result.current.notification).toBe('Created and joined new game newgame123!')
    })

    it('should not auto-join if not creating new game', () => {
      renderHook(() => useGolfGame({}))
      
      const mockRoom = createMockRoom('testroom')

      act(() => {
        // Simulate room joined callback
        mockAdapter._callbacks?.onRoomJoined?.('player1', mockRoom)
      })

      // Don't call startNewGame, just simulate newGameStarted (from another player)
      act(() => {
        mockAdapter._callbacks?.onNewGameStarted?.('newgame123', 'oldgame456')
      })

      // Should NOT automatically join the game
      expect(mockAdapter.joinGame).not.toHaveBeenCalled()
    })

    it('should handle network error during game creation', () => {
      const { result } = renderHook(() => useGolfGame({}))
      
      const mockRoom = createMockRoom('testroom')

      act(() => {
        // Simulate room joined callback
        mockAdapter._callbacks?.onRoomJoined?.('player1', mockRoom)
      })

      // Set up network error before calling startNewGame
      mockAdapter.startNewGame.mockImplementation(() => {
        throw new Error('Network error')
      })

      expect(() => {
        act(() => {
          result.current.startNewGame()
        })
      }).toThrow('Network error')
    })
  })

  describe('URL updates during game creation', () => {
    it('should update URL to game permalink after successful creation and join', () => {
      // Reset the mock implementation before this test
      mockAdapter.startNewGame.mockReset()
      mockAdapter.startNewGame.mockImplementation(() => {})
      
      const { result } = renderHook(() => useGolfGame({}))
      
      const mockRoom = createMockRoom('room123')
      const mockGameState = createMockGameState('game456')

      // Simulate the full flow
      act(() => {
        mockAdapter._callbacks?.onRoomJoined?.('player1', mockRoom)
      })

      // Clear previous navigate calls from room join
      mockNavigate.mockClear()

      act(() => {
        result.current.startNewGame()
      })

      act(() => {
        mockAdapter._callbacks?.onNewGameStarted?.('game456')
      })

      act(() => {
        mockAdapter._callbacks?.onGameJoined?.('player1', mockGameState)
      })

      expect(mockNavigate).toHaveBeenCalledWith('/golf/room/room123/game/game456', { replace: false })
    })

    it('should not update URL if room state is missing', () => {
      renderHook(() => useGolfGame({}))
      
      const mockGameState = createMockGameState('game456')

      // Simulate game join without room state
      act(() => {
        mockAdapter._callbacks?.onGameJoined?.('player1', mockGameState)
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })
})