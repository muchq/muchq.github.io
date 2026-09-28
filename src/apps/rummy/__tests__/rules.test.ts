import { describe, expect, it } from 'vitest'
import {
  arrangedMeld,
  canDiscard,
  deadwood,
  describeEnding,
  describeLastMove,
  headlineOf,
  meldsFitting,
  sortHand
} from '../rules'
import type { Card, RummyView } from '../wire'

// The UI's copy of the engine's rules only shapes the offer — the hub
// refuses in band — but an offer that disagrees with the engine is a
// button that does nothing, so the meld rules are pinned case for case
// against libs/cards/rummy's meld_test.

const c = (spelled: string): Card => ({ rank: spelled.slice(0, -1), suit: spelled.slice(-1) })
const cards = (...spelled: string[]) => spelled.map(c)
const faces = (list: Card[] | null) => (list === null ? null : list.map(card => card.rank + card.suit))

describe('arrangedMeld', () => {
  it('lays three or four of a rank in suit order', () => {
    expect(faces(arrangedMeld(cards('7♠', '7♣', '7♥')))).toEqual(['7♣', '7♥', '7♠'])
    expect(arrangedMeld(cards('K♣', 'K♦', 'K♥', 'K♠'))).not.toBeNull()
  })

  it('refuses two cards, a repeated card, and a mix', () => {
    expect(arrangedMeld(cards('7♣', '7♥'))).toBeNull()
    expect(arrangedMeld(cards('7♣', '7♣', '7♥'))).toBeNull()
    expect(arrangedMeld(cards('7♣', '7♥', '8♥'))).toBeNull()
    expect(arrangedMeld([])).toBeNull()
  })

  it('lays a run low to high, one suit, no gaps', () => {
    expect(faces(arrangedMeld(cards('9♣', '7♣', '8♣', '10♣')))).toEqual(['7♣', '8♣', '9♣', '10♣'])
    expect(arrangedMeld(cards('7♣', '8♣', '10♣'))).toBeNull()
    expect(arrangedMeld(cards('7♣', '8♣', '9♥'))).toBeNull()
  })

  it('runs the ace low or high but never round the corner', () => {
    expect(faces(arrangedMeld(cards('3♣', 'A♣', '2♣')))).toEqual(['A♣', '2♣', '3♣'])
    expect(faces(arrangedMeld(cards('A♣', 'K♣', 'Q♣')))).toEqual(['Q♣', 'K♣', 'A♣'])
    expect(arrangedMeld(cards('K♣', 'A♣', '2♣'))).toBeNull()
  })

  it('reads a whole suit in rank order, the ace on top', () => {
    const suit = cards('2♠', '3♠', '4♠', '5♠', '6♠', '7♠', '8♠', '9♠', '10♠', 'J♠', 'Q♠', 'K♠', 'A♠')
    const run = arrangedMeld([...suit].reverse())
    expect(faces(run)?.at(0)).toBe('2♠')
    expect(faces(run)?.at(-1)).toBe('A♠')
  })
})

describe('meldsFitting', () => {
  const melds = [
    { owner: 'bob', cards: cards('4♣', '5♣', '6♣') },
    { owner: 'alice', cards: cards('9♣', '9♦', '9♥') }
  ]
  it('names every meld a card would grow, at either end of a run or onto a set', () => {
    expect(meldsFitting(melds, c('7♣'))).toEqual([0])
    expect(meldsFitting(melds, c('3♣'))).toEqual([0])
    expect(meldsFitting(melds, c('9♠'))).toEqual([1])
    expect(meldsFitting(melds, c('8♣'))).toEqual([])
  })
})

describe('sortHand', () => {
  const hand = cards('K♦', '2♠', 'A♠', '10♥', 'K♠', '3♣')
  it('by suit groups the suits, alternating colour, each low to high with the ace low', () => {
    expect(faces(sortHand(hand, 'suit'))).toEqual(['A♠', '2♠', 'K♠', '10♥', '3♣', 'K♦'])
  })
  it('by rank lines up sets', () => {
    expect(faces(sortHand(hand, 'rank'))).toEqual(['A♠', '2♠', '3♣', '10♥', 'K♠', 'K♦'])
  })
  it('does not reorder the hand it was given', () => {
    sortHand(hand, 'rank')
    expect(faces(hand)?.[0]).toBe('K♦')
  })
})

describe('deadwood', () => {
  it('counts an ace one, pips as printed, faces ten', () => {
    expect(deadwood(cards('A♠', '7♣', '10♥', 'J♦', 'Q♣', 'K♠'))).toBe(1 + 7 + 10 + 30)
  })
})

describe('canDiscard', () => {
  const view = (over: Partial<RummyView> = {}): RummyView => ({
    gameId: 'G',
    phase: 'playing',
    players: [],
    stockCount: 0,
    canDrawStock: true,
    discardCount: 0,
    melds: [],
    ...over
  })
  it('refuses the card taken from the discard, unless it is all that is left', () => {
    const taken = { takenDiscard: c('9♠') }
    expect(canDiscard(view(taken), cards('9♠', '2♣'), c('9♠'))).toBe(false)
    expect(canDiscard(view(taken), cards('9♠', '2♣'), c('2♣'))).toBe(true)
    expect(canDiscard(view(taken), cards('9♠'), c('9♠'))).toBe(true)
    expect(canDiscard(view(), cards('9♠', '2♣'), c('9♠'))).toBe(true)
  })
})

describe('describeLastMove', () => {
  it('says each move, in the second person for the viewer', () => {
    expect(describeLastMove({ playerId: 'bob', move: 'drawStock', cards: [] }, 'alice')).toBe('bob drew from the stock')
    expect(describeLastMove({ playerId: 'alice', move: 'drawDiscard', cards: cards('9♠') }, 'alice')).toBe('You took 9♠')
    expect(describeLastMove({ playerId: 'bob', move: 'meld', cards: cards('7♥', '8♥', '9♥'), meldIndex: 0 }, 'alice')).toBe(
      'bob melded 7♥ 8♥ 9♥'
    )
    expect(describeLastMove({ playerId: 'bob', move: 'layOff', cards: cards('10♥'), meldIndex: 0 }, 'alice')).toBe('bob laid off 10♥')
    expect(describeLastMove({ playerId: 'bob', move: 'discard', cards: cards('K♣') }, 'alice')).toBe('bob discarded K♣')
  })
})

describe('the ending', () => {
  const won = { winner: 'alice', points: 42, scores: [] }
  it('reads from each chair', () => {
    expect(headlineOf(won, 'alice')).toBe('You won!')
    expect(headlineOf(won, 'bob')).toBe('alice wins')
    expect(describeEnding(won, 'alice')).toBe('You went out and score 42 points.')
    expect(describeEnding(won, 'bob')).toBe('alice went out and scores 42 points.')
    expect(describeEnding({ winner: 'alice', points: 1, scores: [] }, 'bob')).toBe('alice went out and scores 1 point.')
  })
  it('names nobody for a table that broke up', () => {
    const broke = { points: 0, scores: [] }
    expect(headlineOf(broke, 'alice')).toBe('The table broke up')
    expect(describeEnding(broke, 'alice')).toBe('Nobody went out.')
  })
})
