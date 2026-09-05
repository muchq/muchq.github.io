import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGolfTable } from '../useGolfTable'
import type { GolfView } from '@/apps/golf/wire'

// The golf table over a scripted envelope: what each update does to the
// view, which tap sends which move, the local take-from-discard, the
// peek countdown, and how an ended table is left.

const view = (over: Partial<GolfView> = {}): GolfView => ({
  gameId: 'G1',
  phase: 'playing',
  players: [
    { playerId: 'alice', cards: [{ card: { rank: 'A', suit: '♠' } }, {}, {}, {}], revealedIndexes: [0, 1], hasPeeked: true },
    { playerId: 'bob', cards: [{}, {}, {}, {}], revealedIndexes: [], hasPeeked: true }
  ],
  currentPlayerId: 'alice',
  drawPileCount: 40,
  discardCount: 3,
  discardTop: { rank: 'Q', suit: '♥' },
  allPlayersPeeked: true,
  ...over
})

describe('useGolfTable', () => {
  afterEach(() => vi.useRealTimers())

  const mount = () => {
    const move = vi.fn()
    const showNotice = vi.fn()
    const onLeft = vi.fn()
    const hook = renderHook(() => useGolfTable({ playerId: 'alice', move, showNotice, onLeft }))
    const receive = (update: Parameters<typeof hook.result.current.handleUpdate>[0]) =>
      act(() => hook.result.current.handleUpdate(update))
    return { ...hook, move, showNotice, onLeft, receive }
  }

  it('maps the joined view into the UI model and follows every state', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view() } })
    expect(result.current.view?.id).toBe('G1')
    expect(result.current.view?.currentPlayerIndex).toBe(0)
    expect(result.current.view?.players[0].cards).toEqual([{ rank: 'A', suit: '♠' }, null, null, null])
    receive({ gameState: { view: view({ currentPlayerId: 'bob' }) } })
    expect(result.current.view?.currentPlayerIndex).toBe(1)
  })

  it('a tap peeks while peeking, swaps while holding, and is nothing otherwise', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view({ players: [{ playerId: 'alice', cards: [{}, {}, {}, {}], revealedIndexes: [2], hasPeeked: false }] }) } })
    act(() => result.current.tapCard(2))
    expect(move).not.toHaveBeenCalled()
    act(() => result.current.tapCard(1))
    expect(move).toHaveBeenLastCalledWith('peekCard', { cardIndex: 1 })

    receive({ gameState: { view: view() } })
    act(() => result.current.tapCard(1))
    expect(move).toHaveBeenCalledTimes(1) // nothing held
    receive({ gameState: { view: view({ drawnCard: { rank: '7', suit: '♣' } }) } })
    act(() => result.current.tapCard(1))
    expect(move).toHaveBeenLastCalledWith('swapCard', { cardIndex: 1 })

    receive({ gameState: { view: view({ currentPlayerId: 'bob', drawnCard: { rank: '7', suit: '♣' } }) } })
    act(() => result.current.tapCard(1))
    expect(move).toHaveBeenCalledTimes(2)
  })

  it('takes the discard locally and sends the take on placement', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.takeFromDiscard())
    expect(move).not.toHaveBeenCalled()
    expect(result.current.view?.drawnCard).toEqual({ rank: 'Q', suit: '♥' })
    expect(result.current.view?.discardPile).toEqual([])
    act(() => result.current.tapCard(3))
    expect(move).toHaveBeenLastCalledWith('takeFromDiscard', { cardIndex: 3 })
    // Placed: the next held card is the deck's, and a swap is a swap.
    receive({ gameState: { view: view({ drawnCard: { rank: '7', suit: '♣' } }) } })
    act(() => result.current.tapCard(0))
    expect(move).toHaveBeenLastCalledWith('swapCard', { cardIndex: 0 })
  })

  it('putting the taken discard back restores the server view and sends nothing', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.takeFromDiscard())
    act(() => result.current.discardDrawn())
    expect(move).not.toHaveBeenCalled()
    expect(result.current.view?.drawnCard).toBeNull()
    expect(result.current.view?.discardPile).toEqual([{ rank: 'Q', suit: '♥' }])
    // A drawn card is discarded for real.
    receive({ gameState: { view: view({ drawnCard: { rank: '7', suit: '♣' } }) } })
    act(() => result.current.discardDrawn())
    expect(move).toHaveBeenLastCalledWith('discardDrawn')
  })

  it('a fresh view ends a pending take, and an empty pile takes nothing', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.takeFromDiscard())
    receive({ gameState: { view: view({ drawnCard: { rank: '7', suit: '♣' } }) } })
    act(() => result.current.tapCard(0))
    expect(move).toHaveBeenLastCalledWith('swapCard', { cardIndex: 0 })

    receive({ gameState: { view: view({ discardTop: undefined, discardCount: 0 }) } })
    const before = result.current.view
    act(() => result.current.takeFromDiscard())
    expect(result.current.view).toBe(before)
  })

  it('counts the peek down once every seat has peeked, then asks the hub to hide', () => {
    vi.useFakeTimers()
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view({ phase: 'peeking', allPlayersPeeked: false }) } })
    expect(result.current.peekCountdown).toBeNull()
    receive({ gameState: { view: view({ phase: 'peeking', allPlayersPeeked: true }) } })
    act(() => vi.advanceTimersByTime(100))
    expect(result.current.peekCountdown).toBe(3)
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.peekCountdown).toBe(0)
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.peekCountdown).toBeNull()
    expect(move).toHaveBeenCalledWith('hideCards')
    expect(move).toHaveBeenCalledTimes(1)
  })

  it('a table that leaves the peek mid-count stops the clock and hides nothing', () => {
    vi.useFakeTimers()
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view({ phase: 'peeking', allPlayersPeeked: true }) } })
    act(() => vi.advanceTimersByTime(1100))
    expect(result.current.peekCountdown).toBe(2)
    receive({ gameState: { view: view() } })
    expect(result.current.peekCountdown).toBeNull()
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.peekCountdown).toBeNull()
    expect(move).not.toHaveBeenCalled()
  })

  it('tells the room about the game as it goes, but not about its own table opening', () => {
    const { receive, showNotice } = mount()
    receive({ gameCreated: { gameId: 'G2', createdBy: 'alice' } })
    expect(showNotice).not.toHaveBeenCalled()
    receive({ gameCreated: { gameId: 'G3', createdBy: 'bob' } })
    expect(showNotice).toHaveBeenLastCalledWith('bob opened table G3')
    receive({ gameStarted: {} })
    expect(showNotice).toHaveBeenLastCalledWith('Game started! Each player can peek at 2 cards.')
    receive({ turnChanged: { playerId: 'alice' } })
    expect(showNotice).toHaveBeenLastCalledWith('Your turn')
    receive({ turnChanged: { playerId: 'bob' } })
    expect(showNotice).toHaveBeenLastCalledWith("It's bob's turn")
    receive({ playerKnocked: { playerId: 'bob' } })
    expect(showNotice).toHaveBeenLastCalledWith('bob has knocked! Last round!')
  })

  it('an ended table keeps its result until it is left, locally, since the hub has dropped it', () => {
    const { result, receive, move, showNotice, onLeft } = mount()
    receive({ gameJoined: { view: view() } })
    receive({ gameState: { view: view({ phase: 'ended', currentPlayerId: undefined }) } })
    receive({ gameEnded: { winner: 'bob', winners: ['bob'], finalScores: [{ playerId: 'alice', score: 9 }, { playerId: 'bob', score: 4 }] } })
    expect(result.current.ended).toEqual({ winner: 'bob', winners: ['bob'] })
    expect(showNotice).toHaveBeenLastCalledWith('Game over! Winner: bob')
    act(() => result.current.leaveTable())
    expect(move).not.toHaveBeenCalled()
    expect(result.current.view).toBeNull()
    expect(result.current.ended).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  it('play again opens a new table, and its join clears the old result', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    receive({ gameEnded: { winner: 'bob', winners: ['bob'], finalScores: [] } })
    act(() => result.current.createTable())
    expect(move).toHaveBeenLastCalledWith('createGame')
    receive({ gameJoined: { view: view({ gameId: 'G2', phase: 'waiting' }) } })
    expect(result.current.view?.id).toBe('G2')
    expect(result.current.ended).toBeNull()
  })

  it('a live table is left through the hub, and gameLeft takes it down', () => {
    const { result, receive, move, onLeft } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.leaveTable())
    expect(move).toHaveBeenLastCalledWith('leaveGame')
    expect(result.current.view).not.toBeNull()
    receive({ gameLeft: { gameId: 'G1' } })
    expect(result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  it('a resume clears the table it held, so a seat that did not survive shows nothing', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.takeFromDiscard())
    act(() => result.current.clear())
    expect(result.current.view).toBeNull()
    // Nothing of the old table's take survives into the next.
    receive({ gameJoined: { view: view({ gameId: 'G2', drawnCard: { rank: '7', suit: '♣' } }) } })
    expect(result.current.view?.drawnCard).toEqual({ rank: '7', suit: '♣' })
  })
})
