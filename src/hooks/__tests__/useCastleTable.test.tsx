import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCastleTable } from '../useCastleTable'
import type { CastlePlayer, CastleView } from '@/apps/castle/wire'

// The castle table's moves name cards (MoonBase #1505): the hub resolves
// them against the row it is holding, so what goes on the wire is the
// card the viewer tapped, never the slot it was drawn in.

const seat = (over: Partial<CastlePlayer> = {}): CastlePlayer => ({
  playerId: 'alice',
  ready: false,
  handCount: 3,
  hand: [
    { rank: 'Q', suit: '♠' },
    { rank: 'K', suit: '♣' },
    { rank: 'K', suit: '♦' }
  ],
  faceUp: [
    { rank: 'A', suit: '♣' },
    { rank: 'K', suit: '♠' },
    { rank: 'K', suit: '♥' }
  ],
  faceDownCount: 3,
  out: false,
  canPlay: true,
  ...over
})

const view = (over: Partial<CastleView> = {}): CastleView => ({
  gameId: 'GAME01',
  phase: 'playing',
  players: [seat(), seat({ playerId: 'bob', hand: [], faceUp: [{ rank: 'J', suit: '♠' }] })],
  currentPlayerId: 'alice',
  drawPileCount: 34,
  pileCount: 0,
  run: [],
  finished: [],
  ...over
})

describe('useCastleTable', () => {
  const mount = () => {
    const move = vi.fn()
    const hook = renderHook(() =>
      useCastleTable({ playerId: 'alice', move, showNotice: vi.fn(), onLeft: vi.fn() })
    )
    const receive = (update: Parameters<typeof hook.result.current.handleUpdate>[0]) =>
      act(() => hook.result.current.handleUpdate(update))
    return { ...hook, move, receive }
  }

  it('a setup swap names one card of each row', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view({ phase: 'setup' }) } })
    // Two different slots, so a swap that sent the firsts of each row
    // would name other cards.
    act(() => result.current.swapForSetup(0, 2))
    expect(move).toHaveBeenCalledWith('swapForSetup', {
      handCard: { rank: 'Q', suit: '♠' },
      faceUpCard: { rank: 'K', suit: '♥' }
    })
  })

  it('a swap against a row that no longer has the card sends nothing', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view({ phase: 'setup' }) } })
    act(() => result.current.swapForSetup(3, 0))
    act(() => result.current.swapForSetup(0, 9))
    expect(move).not.toHaveBeenCalled()
  })

  it('a play names the selected cards of the row in play', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.toggleCard(1))
    act(() => result.current.toggleCard(2))
    expect(result.current.selected).toEqual([1, 2])
    act(() => result.current.playSelected())
    expect(move).toHaveBeenCalledWith('playFromHand', {
      cards: [
        { rank: 'K', suit: '♣' },
        { rank: 'K', suit: '♦' }
      ]
    })
    expect(result.current.selected).toEqual([])
  })

  it('an empty hand plays the face-up row, named the same way', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view({ players: [seat({ handCount: 0, hand: [] })] }) } })
    act(() => result.current.toggleCard(1))
    act(() => result.current.playSelected())
    expect(move).toHaveBeenCalledWith('playFaceUp', { cards: [{ rank: 'K', suit: '♠' }] })
  })

  it('a blind flip still names its position, and an empty selection sends nothing', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.playSelected())
    expect(move).not.toHaveBeenCalled()
    act(() => result.current.playFaceDown(2))
    expect(move).toHaveBeenCalledWith('playFaceDown', { index: 2 })
  })

  it('a new view clears the selection, so no move reads a stale one', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.toggleCard(2))
    receive({ gameState: { view: view({ players: [seat({ hand: [{ rank: 'K', suit: '♣' }], handCount: 1 })] }) } })
    expect(result.current.selected).toEqual([])
    act(() => result.current.playSelected())
    expect(move).not.toHaveBeenCalled()
  })
})
