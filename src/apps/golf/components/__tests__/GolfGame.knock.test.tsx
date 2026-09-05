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

const playingState = () => makeGameState({ gamePhase: 'playing', knockedPlayerId: null })

interface HookOverrides {
  gameState?: GameState
  playerId?: string
  isMyTurn?: boolean
  winner?: string | null
}

const mockHook = ({ gameState = makeGameState(), playerId = 'alice', isMyTurn = true, winner = null }: HookOverrides = {}) => {
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
    winner,
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
    backToLobby: vi.fn(),
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

const gameJsx = () => (
  <GolfGame
    onGameIdChange={vi.fn()}
    onPlayerIdChange={vi.fn()}
    onPlayerNameChange={vi.fn()}
    onConnectionChange={vi.fn()}
    permalinkParams={{ roomId: null, gameId: null, isValid: true }}
  />
)

const renderGame = () => render(gameJsx())

const queryBackdrop = (container: HTMLElement) =>
  container.querySelector('[class*="finalRoundBackdrop"]')

describe('GolfGame knock visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a focused full-screen alert, urgent banner, and backdrop to non-knockers', () => {
    mockHook()
    const { container } = renderGame()

    expect(screen.getByRole('alert')).toHaveTextContent('bob knocked!')
    expect(screen.getByRole('alert')).toHaveTextContent('This is your last turn — make it count!')
    expect(screen.getByRole('alert')).toHaveFocus()
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
    expect(screen.getByText('Your last turn — tap a pile to draw')).toBeInTheDocument()
    expect(queryBackdrop(container)).toBeInTheDocument()
  })

  it('does not show the full-screen alert or backdrop to the knocker', () => {
    mockHook({ playerId: 'bob', isMyTurn: false })
    const { container } = renderGame()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(queryBackdrop(container)).not.toBeInTheDocument()
    expect(screen.getByText('You knocked — final round!')).toBeInTheDocument()
  })

  it('dismisses the alert on tap but keeps the banner', () => {
    mockHook()
    renderGame()

    fireEvent.click(screen.getByRole('alert'))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
  })

  it('dismisses the alert with the keyboard but keeps the banner', () => {
    mockHook()
    renderGame()

    fireEvent.keyDown(screen.getByRole('alert'), { key: 'Escape' })

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

  it('shows the alert when a knock arrives mid-game', () => {
    mockHook({ gameState: playingState() })
    const view = renderGame()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    mockHook()
    view.rerender(gameJsx())

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
  })

  it('keeps the active-player turn label through the knocked phase', () => {
    mockHook()
    renderGame()

    expect(screen.getByText('your turn')).toBeInTheDocument()
  })

  it('removes all knock UI when the game ends', () => {
    mockHook()
    const view = renderGame()

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('your turn')).toBeInTheDocument()

    mockHook({ gameState: makeGameState({ gamePhase: 'ended' }), winner: 'bob', isMyTurn: false })
    view.rerender(gameJsx())

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/final round/i)).not.toBeInTheDocument()
    expect(queryBackdrop(view.container)).not.toBeInTheDocument()
    expect(screen.queryByText('your turn')).not.toBeInTheDocument()
  })

  it('re-arms the alert for a new knock after a dismissed one', () => {
    vi.useFakeTimers()
    mockHook({ gameState: playingState() })
    const view = renderGame()

    // bob knocks; alice dismisses the alert
    mockHook()
    view.rerender(gameJsx())
    fireEvent.click(screen.getByRole('alert'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // game ends, next game starts, bob knocks again
    mockHook({ gameState: makeGameState({ gamePhase: 'ended' }), winner: 'bob', isMyTurn: false })
    view.rerender(gameJsx())
    act(() => {
      vi.advanceTimersByTime(0)
    })
    mockHook({ gameState: playingState() })
    view.rerender(gameJsx())
    mockHook()
    view.rerender(gameJsx())

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows no knock UI during normal play', () => {
    mockHook({ gameState: playingState() })
    const { container } = renderGame()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/final round/i)).not.toBeInTheDocument()
    expect(queryBackdrop(container)).not.toBeInTheDocument()
    expect(screen.getByText('Your turn — tap a pile to draw')).toBeInTheDocument()
  })
})
