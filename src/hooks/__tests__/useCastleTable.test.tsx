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

// alice is neither the first seat nor the seat named on turn, so a
// payload built from the wrong seat cannot pass by coincidence.
const view = (over: Partial<CastleView> = {}): CastleView => ({
  gameId: 'GAME01',
  phase: 'playing',
  players: [seat({ playerId: 'bob', hand: [], faceUp: [{ rank: 'J', suit: '♠' }] }), seat()],
  currentPlayerId: 'bob',
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
    expect(move.mock.calls).toEqual([
      ['swapForSetup', { handCard: { rank: 'Q', suit: '♠' }, faceUpCard: { rank: 'K', suit: '♥' } }]
    ])
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
    // The whole transcript: one move, no legacy shape beside it.
    expect(move.mock.calls).toEqual([
      ['playFromHand', { cards: [{ rank: 'K', suit: '♣' }, { rank: 'K', suit: '♦' }] }]
    ])
    expect(result.current.selected).toEqual([])
  })

  it('an empty hand plays the face-up row, named the same way', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view({ players: [seat({ playerId: 'bob' }), seat({ handCount: 0, hand: [] })] }) } })
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

  it('a selection pointing past its row plays nothing, not the part that is left', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    // A shorter hand and a tap in one batch: the selection outlives the
    // row it was made against, which is the one way it can.
    act(() => {
      result.current.handleUpdate({
        gameState: {
          view: view({
            players: [seat({ playerId: 'bob' }), seat({ handCount: 2, hand: [{ rank: 'K', suit: '♣' }, { rank: 'Q', suit: '♠' }] })]
          })
        }
      })
      result.current.toggleCard(1)
      result.current.toggleCard(2)
    })
    expect(result.current.selected).toEqual([1, 2])
    act(() => result.current.playSelected())
    expect(move).not.toHaveBeenCalled()
    // Cleared, so the table stops offering a play it will not send.
    expect(result.current.selected).toEqual([])
  })

  it('a new view clears the selection, so no move reads a stale one', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.toggleCard(2))
    receive({
      gameState: { view: view({ players: [seat({ playerId: 'bob' }), seat({ hand: [{ rank: 'K', suit: '♣' }], handCount: 1 })] }) }
    })
    expect(result.current.selected).toEqual([])
    act(() => result.current.playSelected())
    expect(move).not.toHaveBeenCalled()
  })
})
