import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GolfTable from '../GolfTable'
import type { GolfTableProps } from '../GolfTable'
import type { GameState, Player } from '@/types/golf'

// The table's chrome over a fake hook: the piles and the hand send the
// moves the phase allows, and an ended table shows the result, then the
// scorecard with the owner's additions.

const player = (id: string, over: Partial<Player> = {}): Player => ({
  id,
  name: id,
  cards: [null, null, null, null],
  score: 0,
  revealedCards: [],
  isReady: true,
  hasPeeked: true,
  clientId: '',
  totalScore: 0,
  gamesPlayed: 0,
  gamesWon: 0,
  isConnected: true,
  joinedAt: '',
  ...over
})

const view = (over: Partial<GameState> = {}): GameState => ({
  id: 'G1',
  players: [player('alice'), player('bob')],
  currentPlayerIndex: 0,
  drawPile: 40,
  discardPile: [{ rank: 'Q', suit: '♥' }],
  gamePhase: 'playing',
  knockedPlayerId: null,
  drawnCard: null,
  allPlayersPeeked: true,
  ...over
})

const table = (over: Partial<GolfTableProps['table']> = {}): GolfTableProps['table'] => ({
  ended: null,
  peekCountdown: null,
  startTable: vi.fn(),
  leaveTable: vi.fn(),
  playAgain: vi.fn(),
  drawCard: vi.fn(),
  takeFromDiscard: vi.fn(),
  discardDrawn: vi.fn(),
  knock: vi.fn(),
  tapCard: vi.fn(),
  ...over
})

describe('GolfTable', () => {
  beforeEach(() => cleanup())
  afterEach(() => vi.useRealTimers())

  it('on your turn the piles draw, the hand taps, and knock is offered; off it, nothing is', () => {
    const t = table()
    const { container, rerender } = render(<GolfTable playerId="alice" view={view()} table={t} />)
    fireEvent.click(screen.getByText('Deck').nextElementSibling!)
    expect(t.drawCard).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Discard').nextElementSibling!)
    expect(t.takeFromDiscard).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Knock' }))
    expect(t.knock).toHaveBeenCalledTimes(1)
    const hand = container.querySelectorAll('[class*="cardGrid"] > [class*="card"]')
    fireEvent.click(hand[2])
    expect(t.tapCard).toHaveBeenCalledWith(2)

    rerender(<GolfTable playerId="alice" view={view({ currentPlayerIndex: 1 })} table={t} />)
    fireEvent.click(screen.getByText('Deck').nextElementSibling!)
    fireEvent.click(screen.getByText('Discard').nextElementSibling!)
    fireEvent.click(container.querySelectorAll('[class*="cardGrid"] > [class*="card"]')[2])
    expect(t.drawCard).toHaveBeenCalledTimes(1)
    expect(t.takeFromDiscard).toHaveBeenCalledTimes(1)
    expect(t.tapCard).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Waiting for bob...')).toBeTruthy()
  })

  it('holding a card offers discard and no second draw', () => {
    const t = table()
    render(<GolfTable playerId="alice" view={view({ drawnCard: { rank: '7', suit: '♣' } })} table={t} />)
    fireEvent.click(screen.getByText('Deck').nextElementSibling!)
    expect(t.drawCard).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Knock' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(t.discardDrawn).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Tap a card to swap, or discard')).toBeTruthy()
  })

  it('a waiting table starts with two seated and leaves straight away', () => {
    const t = table()
    const { rerender } = render(<GolfTable playerId="alice" view={view({ gamePhase: 'waiting', players: [player('alice')] })} table={t} />)
    expect(screen.queryByRole('button', { name: 'Start Game' })).toBeNull()
    rerender(<GolfTable playerId="alice" view={view({ gamePhase: 'waiting' })} table={t} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }))
    expect(t.startTable).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Leave Game' }))
    expect(t.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('leaving mid-game asks first', () => {
    const t = table()
    render(<GolfTable playerId="alice" view={view()} table={t} />)
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(t.leaveTable).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(t.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('an ended table celebrates, then scores it with the winners crowned and the owner\'s extras', () => {
    vi.useFakeTimers()
    const t = table({ ended: { winner: 'bob', winners: ['bob'], finalScores: [] } })
    const ended = view({
      gamePhase: 'ended',
      players: [player('alice', { score: 9 }), player('bob', { score: 4 })]
    })
    render(
      <GolfTable playerId="alice" view={ended} table={t} shareUrl="https://muchq.com/games/room/R1/table/G1">
        <p>room totals</p>
      </GolfTable>
    )
    expect(screen.getByText('bob wins!')).toBeTruthy()
    expect(screen.getByText('😤')).toBeTruthy()
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByText('Final Scores')).toBeTruthy()
    expect(screen.getByText('👑')).toBeTruthy()
    expect(screen.getByText('#2')).toBeTruthy()
    expect(screen.getByText('room totals')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Play Again' }))
    expect(t.playAgain).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Back to Room' }))
    expect(t.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('a shared win crowns every winner and reads as yours', () => {
    vi.useFakeTimers()
    const t = table({ ended: { winner: 'alice & bob', winners: ['alice', 'bob'], finalScores: [] } })
    render(<GolfTable playerId="alice" view={view({ gamePhase: 'ended' })} table={t} />)
    expect(screen.getByText('You won!')).toBeTruthy()
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getAllByText('👑')).toHaveLength(2)
  })

  it('shows the peek countdown the hook keeps', () => {
    render(<GolfTable playerId="alice" view={view({ gamePhase: 'peeking' })} table={table({ peekCountdown: 2 })} />)
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('All players have peeked!')).toBeTruthy()
  })
})
