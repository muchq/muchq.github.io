import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { useGolfGame } from '../useGolfGame'
import type { Room, GameState as GolfGameState } from '@/types/golf'

// Mock the network adapter
const mockNetworkAdapter = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  createRoom: vi.fn(),
  createGame: vi.fn(),
  joinRoom: vi.fn(),
  joinGame: vi.fn(),
  startGame: vi.fn(),
  startNewGame: vi.fn(),
  peekCard: vi.fn(),
  drawCard: vi.fn(),
  takeFromDiscard: vi.fn(),
  swapCard: vi.fn(),
  discardDrawn: vi.fn(),
  knock: vi.fn(),
  hideCards: vi.fn(),
  isMyTurn: vi.fn(),
  getCurrentPlayer: vi.fn(),
  roomState: null,
  _callbacks: null as {
    onRoomJoined?: (playerId: string, roomState: Room) => void
    onGameJoined?: (playerId: string, gameState: GolfGameState) => void
    onNewGameStarted?: (gameId: string, previousGameId?: string) => void
    onNotification?: (message: string) => void
  } | null
}

vi.mock('@/utils/networkAdapter', () => ({
  GolfNetworkAdapter: vi.fn().mockImplementation((callbacks) => {
    mockNetworkAdapter._callbacks = callbacks
    return mockNetworkAdapter
  })
}))

// Mock the permalink utilities
vi.mock('@/utils/golfPermalinks', () => ({
  generateRoomPermalink: (roomId: string) => `/golf/room/${roomId}`,
  generateGamePermalink: (roomId: string, gameId: string) => `/golf/room/${roomId}/game/${gameId}`
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('useGolfGame - New Game Notifications', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    mockNetworkAdapter._callbacks = null
  })

  it('initializes with empty new game notifications', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    
    expect(result.current.newGameNotifications).toEqual([])
  })

  it('adds new game notification when onNewGameStarted is called', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    
    // Simulate a new game started event
    act(() => {
      mockNetworkAdapter._callbacks?.onNewGameStarted?.('new-game-123', 'previous-game-456')
    })
    
    expect(result.current.newGameNotifications).toHaveLength(1)
    expect(result.current.newGameNotifications[0]).toMatchObject({
      gameId: 'new-game-123',
      dismissed: false
    })
    expect(result.current.newGameNotifications[0].timestamp).toBeTypeOf('number')
  })

  it('does not add duplicate notifications for the same game', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    
    // Simulate the same new game started event twice
    act(() => {
      mockNetworkAdapter._callbacks?.onNewGameStarted?.('new-game-123')
    })
    
    act(() => {
      mockNetworkAdapter._callbacks?.onNewGameStarted?.('new-game-123')
    })
    
    expect(result.current.newGameNotifications).toHaveLength(1)
  })

  it('dismisses notification when dismissNewGameNotification is called', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    
    // Add a notification
    act(() => {
      mockNetworkAdapter._callbacks?.onNewGameStarted?.('new-game-123')
    })
    
    expect(result.current.newGameNotifications[0].dismissed).toBe(false)
    
    // Dismiss the notification
    act(() => {
      result.current.dismissNewGameNotification('new-game-123')
    })
    
    expect(result.current.newGameNotifications[0].dismissed).toBe(true)
  })

  it('joins new game and dismisses notification when joinNewGame is called', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    
    // Set up room state
    const mockRoom: Room = {
      id: 'test-room',
      players: [],
      games: {},
      gameHistory: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    }
    
    act(() => {
      mockNetworkAdapter._callbacks?.onRoomJoined?.('player-123', mockRoom)
    })
    
    // Add a notification
    act(() => {
      mockNetworkAdapter._callbacks?.onNewGameStarted?.('new-game-123')
    })
    
    expect(result.current.newGameNotifications[0].dismissed).toBe(false)
    
    // Join the new game
    act(() => {
      result.current.joinNewGame('new-game-123')
    })
    
    // Should dismiss the notification
    expect(result.current.newGameNotifications[0].dismissed).toBe(true)
    // Should call joinGame on the adapter
    expect(mockNetworkAdapter.joinGame).toHaveBeenCalledWith('test-room', 'new-game-123')
  })

  it('shows notification message when new game is started', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    
    // Simulate a new game started event
    act(() => {
      mockNetworkAdapter._callbacks?.onNewGameStarted?.('new-game-123')
    })
    
    // Should show notification in the UI
    expect(result.current.notification).toContain('New game new-game-123 started!')
  })

  it('handles joinNewGame when not in a room', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    
    // Try to join new game without being in a room
    act(() => {
      result.current.joinNewGame('new-game-123')
    })
    
    // Should show error notification
    expect(result.current.notification).toContain('Must be in a room to join a game')
    
    // Should not call joinGame
    expect(mockNetworkAdapter.joinGame).not.toHaveBeenCalled()
  })

  it('adds multiple notifications for different games', () => {
    const { result } = renderHook(() => useGolfGame(), { wrapper })
    
    // Add multiple notifications
    act(() => {
      mockNetworkAdapter._callbacks?.onNewGameStarted?.('game-1')
    })
    
    act(() => {
      mockNetworkAdapter._callbacks?.onNewGameStarted?.('game-2')
    })
    
    act(() => {
      mockNetworkAdapter._callbacks?.onNewGameStarted?.('game-3')
    })
    
    expect(result.current.newGameNotifications).toHaveLength(3)
    expect(result.current.newGameNotifications.map(n => n.gameId)).toEqual([
      'game-1', 'game-2', 'game-3'
    ])
  })
})