import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRummyTable } from '../useRummyTable'
import type { Card, RummyPlayer, RummyView } from '@/apps/rummy/wire'

// Rummy's moves name cards (MoonBase #1505): what goes on the wire is the
// card the viewer tapped, read out of the hand on screen, never a slot —
// the hand is shown sorted, so a slot would be the wrong card anyway.

const c = (spelled: string): Card => ({ rank: spelled.slice(0, -1), suit: spelled.slice(-1) })

const seat = (playerId: string, hand: string[] = []): RummyPlayer => ({
  playerId,
  handCount: hand.length || 10,
  hand: hand.map(c)
})

// alice is not the first seat, so a payload built from the wrong seat
// cannot pass by coincidence.
const view = (over: Partial<RummyView> = {}): RummyView => ({
  gameId: 'GAME01',
  phase: 'playing',
  variant: 'basic',
  dealNumber: 1,
  standings: [
    { playerId: 'bob', handsWon: 0 },
    { playerId: 'alice', handsWon: 0 }
  ],
  players: [seat('bob'), seat('alice', ['7♥', '8♥', '9♥', 'K♣'])],
  currentPlayerId: 'alice',
  stage: 'play',
  stockCount: 30,
  canDrawStock: true,
  discardCount: 1,
  discardTop: c('2♠'),
  melds: [{ owner: 'bob', cards: [c('4♣'), c('5♣'), c('6♣')] }],
  ...over
})

describe('useRummyTable', () => {
  beforeEach(() => window.localStorage.clear())

  const mount = () => {
    const move = vi.fn()
    const showNotice = vi.fn()
    const onLeft = vi.fn()
    const hook = renderHook(() => useRummyTable({ playerId: 'alice', move, showNotice, onLeft }))
    const receive = (update: Parameters<typeof hook.result.current.handleUpdate>[0]) =>
      act(() => hook.result.current.handleUpdate(update))
    return { ...hook, move, showNotice, onLeft, receive }
  }

  it('a meld names the selected cards, in the order they were picked', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.toggleCard(c('9♥')))
    act(() => result.current.toggleCard(c('7♥')))
    act(() => result.current.toggleCard(c('8♥')))
    expect(result.current.selected).toEqual(['9♥', '7♥', '8♥'])
    act(() => result.current.meldSelected())
    // The whole transcript: one move.
    expect(move.mock.calls).toEqual([['meld', { cards: [c('9♥'), c('7♥'), c('8♥')] }]])
    // Picked until the hub answers: a refusal leaves them to be fixed, the
    // next view clears them.
    act(() => result.current.handleRejected())
    expect(result.current.selected).toEqual(['9♥', '7♥', '8♥'])
    receive({ gameState: { view: view() } })
    expect(result.current.selected).toEqual([])
  })

  it('a second tap on a card puts it back', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.toggleCard(c('K♣')))
    act(() => result.current.toggleCard(c('K♣')))
    expect(result.current.selected).toEqual([])
  })

  it('a lay-off and a discard each name one card', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.toggleCard(c('K♣')))
    act(() => result.current.layOffSelected(0))
    receive({ gameState: { view: view() } })
    act(() => result.current.toggleCard(c('K♣')))
    act(() => result.current.discardSelected())
    expect(move.mock.calls).toEqual([
      ['layOff', { card: c('K♣'), meldIndex: 0 }],
      ['discard', { card: c('K♣') }]
    ])
  })

  it('a lay-off or discard with two cards picked sends nothing', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.toggleCard(c('K♣')))
    act(() => result.current.toggleCard(c('7♥')))
    act(() => result.current.layOffSelected(0))
    act(() => result.current.discardSelected())
    expect(move).not.toHaveBeenCalled()
  })

  it('a selection naming a card the hand no longer holds sends nothing, not the part that is left', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    // A new hand and two taps in one batch: the selection outlives the
    // hand it was made against, which is the one way it can.
    act(() => {
      result.current.handleUpdate({ gameState: { view: view({ players: [seat('bob'), seat('alice', ['7♥', 'K♣'])] }) } })
      result.current.toggleCard(c('7♥'))
      result.current.toggleCard(c('9♥'))
    })
    act(() => result.current.meldSelected())
    expect(move).not.toHaveBeenCalled()
    // Cleared, so the table stops offering a meld it will not send.
    expect(result.current.selected).toEqual([])
  })

  it('a new view clears the selection', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.toggleCard(c('K♣')))
    receive({ gameState: { view: view() } })
    expect(result.current.selected).toEqual([])
  })

  it('the draws are bare moves', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view({ stage: 'draw' }) } })
    act(() => result.current.drawStock())
    act(() => result.current.drawDiscard())
    expect(move.mock.calls).toEqual([['drawStock'], ['drawDiscard']])
  })

  it('the hand order is the viewer’s, and outlives the table', () => {
    const first = mount()
    expect(first.result.current.order).toBe('suit')
    act(() => first.result.current.setOrder('rank'))
    expect(first.result.current.order).toBe('rank')
    first.unmount()
    expect(mount().result.current.order).toBe('rank')
  })

  it('a turn and the table starting are the felt’s to show; another table opening is a toast', () => {
    const { receive, showNotice } = mount()
    receive({ turnChanged: { playerId: 'alice' } })
    receive({ gameStarted: {} })
    expect(showNotice).not.toHaveBeenCalled()
    receive({ gameCreated: { gameId: 'G2', createdBy: 'bob' } })
    receive({ gameCreated: { gameId: 'G3', createdBy: 'alice' } })
    expect(showNotice.mock.calls).toEqual([['bob opened table G2']])
  })

  it('the dealer’s pick names the variant, once, until the hub answers', () => {
    const { result, move, receive } = mount()
    act(() => result.current.chooseVariant('basic'))
    expect(move.mock.calls).toEqual([['chooseVariant', { variant: 'basic' }]])
    expect(result.current.dealing).toBe(true)
    receive({ gameState: { view: view() } })
    expect(result.current.dealing).toBe(false)
    act(() => result.current.chooseVariant('basic'))
    act(() => result.current.handleRejected())
    expect(result.current.dealing).toBe(false)
    // A table joined meanwhile answers it too.
    act(() => result.current.chooseVariant('basic'))
    receive({ gameJoined: { view: view() } })
    expect(result.current.dealing).toBe(false)
  })

  it('play again opens another table; the ending goes with the old one', () => {
    const { result, receive, move } = mount()
    receive({ gameState: { view: view({ phase: 'ended' }) } })
    receive({ gameEnded: { standings: [{ playerId: 'alice', handsWon: 2 }], dealsPlayed: 3 } })
    expect(result.current.ended?.dealsPlayed).toBe(3)
    act(() => result.current.playAgain())
    expect(move.mock.calls).toEqual([['createGame']])
    expect(result.current.opening).toBe(true)
    act(() => result.current.handleRejected())
    expect(result.current.opening).toBe(false)
    receive({ gameJoined: { view: view({ gameId: 'GAME02', phase: 'waiting' }) } })
    expect(result.current.view?.gameId).toBe('GAME02')
    expect(result.current.ended).toBeNull()
  })

  it('leaving a live table asks the hub; leaving an ended one only lets go of the view', () => {
    const live = mount()
    live.receive({ gameJoined: { view: view() } })
    act(() => live.result.current.leaveTable())
    expect(live.move.mock.calls).toEqual([['leaveGame']])
    live.receive({ gameLeft: { gameId: 'GAME01' } })
    expect(live.result.current.view).toBeNull()
    expect(live.onLeft).toHaveBeenCalledTimes(1)

    const over = mount()
    over.receive({ gameState: { view: view({ phase: 'ended' }) } })
    act(() => over.result.current.leaveTable())
    expect(over.move).not.toHaveBeenCalled()
    expect(over.result.current.view).toBeNull()
    expect(over.onLeft).toHaveBeenCalledTimes(1)
  })
})
