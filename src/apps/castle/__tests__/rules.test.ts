import { describe, it, expect } from 'vitest'
import { cardsOf, describeEnding, describeLastPlay, describePile, rowInPlay, toggleSelection } from '../rules'
import type { CastlePlayer, CastleView } from '../wire'

const seat = (over: Partial<CastlePlayer> = {}): CastlePlayer => ({
  playerId: 'alice',
  ready: true,
  handCount: 0,
  hand: [],
  faceUp: [],
  faceDownCount: 0,
  out: false,
  canPlay: false,
  ...over
})

const view = (over: Partial<CastleView> = {}): CastleView => ({
  gameId: 'G1',
  phase: 'playing',
  players: [],
  drawPileCount: 10,
  pileCount: 0,
  run: [],
  finished: [],
  ...over
})

describe('rowInPlay', () => {
  it('is the hand while it holds cards, then the face-up row, then blind', () => {
    expect(rowInPlay(seat({ handCount: 2, faceUp: [{ rank: 'K', suit: '♠' }], faceDownCount: 3 }))).toBe('hand')
    expect(rowInPlay(seat({ faceUp: [{ rank: 'K', suit: '♠' }], faceDownCount: 3 }))).toBe('faceUp')
    expect(rowInPlay(seat({ faceDownCount: 3 }))).toBe('faceDown')
  })

  it('reads the count, not the faces: an opponent hand is a count alone', () => {
    expect(rowInPlay(seat({ handCount: 3, hand: [], faceUp: [{ rank: '4', suit: '♣' }] }))).toBe('hand')
  })

  it('a blind row offers no cards to pick from', () => {
    const blind = seat({ faceDownCount: 2 })
    expect(cardsOf(blind, 'faceDown')).toEqual([])
    expect(toggleSelection([], cardsOf(blind, rowInPlay(blind)), 0)).toEqual([])
  })
})

describe('toggleSelection', () => {
  const cards = [
    { rank: '7', suit: '♠' },
    { rank: '9', suit: '♥' },
    { rank: '7', suit: '♦' }
  ]

  it('adds cards of the selected rank and removes a card picked twice', () => {
    expect(toggleSelection([], cards, 2)).toEqual([2])
    expect(toggleSelection([2], cards, 0)).toEqual([0, 2])
    expect(toggleSelection([0, 2], cards, 2)).toEqual([0])
  })

  it('a card of another rank starts the selection over', () => {
    expect(toggleSelection([0, 2], cards, 1)).toEqual([1])
  })

  it('ignores an index off the row', () => {
    expect(toggleSelection([0], cards, 5)).toEqual([0])
  })
})

describe('describeLastPlay', () => {
  it('says who played what, and whether it burned', () => {
    expect(describeLastPlay({ playerId: 'bob', cards: [{ rank: '7', suit: '♠' }], burned: false, pickedUp: false }, 'alice')).toBe('bob played 7♠')
    expect(
      describeLastPlay({ playerId: 'alice', cards: [{ rank: '10', suit: '♣' }], burned: true, pickedUp: false }, 'alice')
    ).toBe('You played 10♣ and cleared the pile')
  })

  it('tells a pick-up by choice from a failed blind flip', () => {
    expect(describeLastPlay({ playerId: 'bob', cards: [], burned: false, pickedUp: true }, 'alice')).toBe('bob picked up the pile')
    expect(
      describeLastPlay({ playerId: 'bob', cards: [{ rank: '3', suit: '♦' }], burned: false, pickedUp: true }, 'alice')
    ).toBe('bob flipped 3♦ and picked up the pile')
  })
})

describe('describePile', () => {
  it('names the price the next play must match', () => {
    expect(describePile(view())).toBe('Empty pile: anything goes')
    expect(describePile(view({ run: [{ rank: '8', suit: '♥' }], pileCount: 3 }))).toBe(
      '8♥ on top: play one or more of 8 or higher'
    )
    expect(describePile(view({ run: [{ rank: '8', suit: '♠' }, { rank: '8', suit: '♥' }], pileCount: 3 }))).toBe(
      'two 8s on top: play two or more of 8 or higher'
    )
    // A queen on a queen: two show, but one king answers, since the
    // count to match is the last play's.
    expect(
      describePile(
        view({
          run: [{ rank: 'Q', suit: '♠' }, { rank: 'Q', suit: '♥' }],
          pileCount: 2,
          lastPlay: { playerId: 'bob', cards: [{ rank: 'Q', suit: '♥' }], burned: false, pickedUp: false }
        })
      )
    ).toBe('two Qs on top: play one or more of Q or higher')
    // Three 3s must not read as arithmetic.
    expect(
      describePile(view({ run: [{ rank: '3', suit: '♠' }, { rank: '3', suit: '♦' }, { rank: '3', suit: '♥' }], pileCount: 3 }))
    ).toBe('three 3s on top: play three or more of 3 or higher')
  })
})

describe('describeEnding', () => {
  it('names the winner, the loser when there is one, or the break-up', () => {
    expect(describeEnding(['alice'], 'bob', 'alice')).toBe('You went out first and win; bob is the loser.')
    expect(describeEnding(['alice'], 'bob', 'bob')).toBe('alice went out first and wins; you are the loser.')
    expect(describeEnding(['carol'], undefined, 'alice')).toBe('carol went out first and wins.')
    expect(describeEnding([], undefined, 'alice')).toBe('The table broke up: nobody went out')
  })
})
