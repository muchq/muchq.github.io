import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import GolfTable from '../GolfTable'
import type { GolfTableProps } from '../GolfTable'
import type { GameState, Player } from '@/types/golf'

// The final round from each chair: the knocker gets a calm banner, the
// others a focused alert (tap, key, or five seconds to dismiss), the
// banner and the red backdrop until the game ends.

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

const knocked = (overrides: Partial<GameState> = {}): GameState => ({
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

const playing = () => knocked({ gamePhase: 'playing', knockedPlayerId: null })

const table = (ended: GolfTableProps['table']['ended'] = null): GolfTableProps['table'] => ({
  ended,
  peekCountdown: null,
  createTable: vi.fn(),
  startTable: vi.fn(),
  leaveTable: vi.fn(),
  drawCard: vi.fn(),
  takeFromDiscard: vi.fn(),
  discardDrawn: vi.fn(),
  knock: vi.fn(),
  tapCard: vi.fn()
})

const jsx = (view = knocked(), playerId = 'alice', ended: GolfTableProps['table']['ended'] = null) => (
  <GolfTable playerId={playerId} connected view={view} table={table(ended)} />
)

const queryBackdrop = (container: HTMLElement) => container.querySelector('[class*="finalRoundBackdrop"]')

describe('GolfTable knock visibility', () => {
  beforeEach(() => cleanup())
  afterEach(() => vi.useRealTimers())

  it('shows a focused full-screen alert, urgent banner, and backdrop to non-knockers', () => {
    const { container } = render(jsx())
    expect(screen.getByRole('alert')).toHaveTextContent('bob knocked!')
    expect(screen.getByRole('alert')).toHaveTextContent('This is your last turn — make it count!')
    expect(screen.getByRole('alert')).toHaveFocus()
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
    expect(screen.getByText('Your last turn — tap a pile to draw')).toBeInTheDocument()
    expect(queryBackdrop(container)).toBeInTheDocument()
  })

  it('does not show the full-screen alert or backdrop to the knocker', () => {
    const { container } = render(jsx(knocked(), 'bob'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(queryBackdrop(container)).not.toBeInTheDocument()
    expect(screen.getByText('You knocked — final round!')).toBeInTheDocument()
  })

  it('dismisses the alert on tap or with the keyboard but keeps the banner', () => {
    render(jsx())
    fireEvent.click(screen.getByRole('alert'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
    cleanup()
    render(jsx())
    fireEvent.keyDown(screen.getByRole('alert'), { key: 'Escape' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
  })

  it('auto-dismisses the alert after 5 seconds but keeps the banner', () => {
    vi.useFakeTimers()
    render(jsx())
    expect(screen.getByRole('alert')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
  })

  it('shows the alert when a knock arrives mid-game, and the turn label stays through it', () => {
    const view = render(jsx(playing()))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    view.rerender(jsx())
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('🚨 Final round — bob knocked! 🚨')).toBeInTheDocument()
    expect(screen.getByText('your turn')).toBeInTheDocument()
  })

  it('removes all knock UI when the game ends', () => {
    const view = render(jsx())
    expect(screen.getByRole('alert')).toBeInTheDocument()
    view.rerender(jsx(knocked({ gamePhase: 'ended', currentPlayerIndex: 1 }), 'alice', { winner: 'bob', winners: ['bob'] }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/final round/i)).not.toBeInTheDocument()
    expect(queryBackdrop(view.container)).not.toBeInTheDocument()
    expect(screen.queryByText('your turn')).not.toBeInTheDocument()
  })

  it('re-arms the alert for a new knock after a dismissed one', () => {
    vi.useFakeTimers()
    const view = render(jsx(playing()))
    // bob knocks; alice dismisses the alert
    view.rerender(jsx())
    fireEvent.click(screen.getByRole('alert'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // game ends, next game starts, bob knocks again
    view.rerender(jsx(knocked({ gamePhase: 'ended', currentPlayerIndex: 1 }), 'alice', { winner: 'bob', winners: ['bob'] }))
    act(() => vi.advanceTimersByTime(0))
    view.rerender(jsx(playing()))
    view.rerender(jsx())
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows no knock UI during normal play', () => {
    const { container } = render(jsx(playing()))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/final round/i)).not.toBeInTheDocument()
    expect(queryBackdrop(container)).not.toBeInTheDocument()
    expect(screen.getByText('Your turn — tap a pile to draw')).toBeInTheDocument()
  })
})
