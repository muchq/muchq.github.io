import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import GolfGame from '../GolfGame'
import { useGolfGame } from '@/hooks/useGolfGame'
import type { GameState, Room } from '@/types/golf'

// The way back to the lobby (MoonBase#1490): offered on the room screen
// and after a game, named for what the lobby adds — the world and chat —
// so it reads apart from "Back to Room" and "Leave Room" beside it.

vi.mock('@/hooks/useGolfGame', () => ({
  useGolfGame: vi.fn()
}))

const room: Room = {
  id: 'R1',
  players: [],
  games: {},
  gameHistory: [],
  createdAt: '2026-01-01T00:00:00Z',
  lastActivity: '2026-01-01T00:00:00Z'
}

const ended = {
  id: 'G1',
  players: [],
  currentPlayerIndex: 0,
  drawPile: 0,
  discardPile: [],
  gamePhase: 'ended',
  knockedPlayerId: null,
  drawnCard: null,
  allPlayersPeeked: true
} as unknown as GameState

const mockHook = (gameState: GameState | null) => {
  const backToLobby = vi.fn()
  vi.mocked(useGolfGame).mockReturnValue({
    gameState,
    roomState: room,
    playerId: 'alice',
    roomCode: '',
    isInLobby: false,
    isInRoom: true,
    notification: null,
    currentPlayer: null,
    isMyTurn: false,
    peekCountdown: null,
    winner: 'bob',
    winners: ['bob'],
    finalScores: [],
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
    backToLobby,
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
  return backToLobby
}

const page = () => (
  <GolfGame
    onGameIdChange={vi.fn()}
    onPlayerIdChange={vi.fn()}
    onPlayerNameChange={vi.fn()}
    onConnectionChange={vi.fn()}
    permalinkParams={{ roomId: null, gameId: null, isValid: true }}
  />
)

describe('GolfGame, the way back to the lobby', () => {
  beforeEach(() => cleanup())
  afterEach(() => vi.useRealTimers())

  it('offers it on the room screen beside Leave Room', () => {
    const backToLobby = mockHook(null)
    render(page())
    expect(screen.getByRole('button', { name: 'Leave Room' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Lobby: world & chat' }))
    expect(backToLobby).toHaveBeenCalledTimes(1)
  })

  it('offers it with the scores after a game, beside Back to Room', () => {
    vi.useFakeTimers()
    const backToLobby = mockHook(ended)
    render(page())
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByRole('button', { name: 'Back to Room' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Lobby: world & chat' }))
    expect(backToLobby).toHaveBeenCalledTimes(1)
  })
})
