import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import GolfGame from '../GolfGame'
import { useGolfGame } from '@/hooks/useGolfGame'
import type { GameState, Player } from '@/types/golf'

vi.mock('@/hooks/useGolfGame', () => ({
  useGolfGame: vi.fn()
}))

const makePlayer = (id: string): Player => ({
  id,
  name: id,
  cards: [null, null, null, null],
  score: 0,
  revealedCards: [],
  isReady: true,
  hasPeeked: true,
  clientId: `client-${id}`,
  totalScore: 0,
  gamesPlayed: 0,
  gamesWon: 0,
  isConnected: true,
  joinedAt: '2026-01-01T00:00:00Z'
})

const makeGameState = (overrides: Partial<GameState> = {}): GameState => ({
  id: 'GAME1',
  players: [makePlayer('alice'), makePlayer('bob')],
  currentPlayerIndex: 0,
  drawPile: 40,
  discardPile: [{ rank: '5', suit: '♠' }],
  gamePhase: 'knocked',
  knockedPlayerId: 'bob',
  drawnCard: null,
  allPlayersPeeked: true,
  ...overrides
})

interface HookOverrides {
  gameState?: GameState
  playerId?: string
  isMyTurn?: boolean
}

const mockHook = ({ gameState = makeGameState(), playerId = 'alice', isMyTurn = true }: HookOverrides = {}) => {
  const currentPlayer = gameState.players.find(p => p.id === playerId) ?? null
  vi.mocked(useGolfGame).mockReturnValue({
    gameState,
    roomState: null,
    playerId,
    roomCode: '',
    isInLobby: false,
    isInRoom: true,
    notification: null,
    currentPlayer,
    isMyTurn,
    peekCountdown: null,
    winner: null,
    winners: [],
    currentRoomPermalink: null,
    currentGamePermalink: null,
    newGameNotifications: [],
    createRoom: vi.fn(),
    createGame: vi.fn(),
    joinRoom: vi.fn(),
    joinGame: vi.fn(),
    startGame: vi.fn(),
    startNewGame: vi.fn(),
    drawCard: vi.fn(),
    takeFromDiscard: vi.fn(),
    discardDrawn: vi.fn(),
    knock: vi.fn(),
    handleCardClick: vi.fn(),
    setRoomCode: vi.fn(),
    leaveGame: vi.fn(),
    leaveRoom: vi.fn(),
    dismissNewGameNotification: vi.fn(),
    joinNewGame: vi.fn(),
    permalinkJoinAttempt: { isAttempting: false, error: null },
    chatMessages: [],
    chatAvailable: false,
    chatReplayUpTo: null,
    chatRejection: null,
    sendChat: vi.fn(),
    isConnected: true
  } as unknown as ReturnType<typeof useGolfGame>)
}

const renderGame = () =>
  render(
    <GolfGame
      onGameIdChange={vi.fn()}
      onPlayerIdChange={vi.fn()}
      onPlayerNameChange={vi.fn()}
      onConnectionChange={vi.fn()}
      permalinkParams={{ roomId: null, gameId: null, isValid: true }}
    />
  )

describe('GolfGame knock visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a full-screen alert and urgent banner to non-knockers', () => {
    mockHook()
    renderGame()

    expect(screen.getByRole('alert')).toHaveTextContent('bob knocked!')
    expect(screen.getByRole('alert')).toHaveTextContent('This is your last turn — make it count!')
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
    expect(screen.getByText('Your last turn — tap a pile to draw')).toBeInTheDocument()
  })

  it('does not show the full-screen alert to the knocker', () => {
    mockHook({ playerId: 'bob', isMyTurn: false })
    renderGame()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('You knocked — final round!')).toBeInTheDocument()
  })

  it('dismisses the alert on tap but keeps the banner', () => {
    mockHook()
    renderGame()

    fireEvent.click(screen.getByRole('alert'))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
  })

  it('auto-dismisses the alert after 5 seconds but keeps the banner', () => {
    vi.useFakeTimers()
    mockHook()
    renderGame()

    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
  })

  it('shows no knock UI during normal play', () => {
    mockHook({ gameState: makeGameState({ gamePhase: 'playing', knockedPlayerId: null }) })
    renderGame()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/final round/i)).not.toBeInTheDocument()
  })
})
