import { describe, expect, it } from 'vitest'
import {
  arrangedMeld,
  bestArrangement,
  canDeal,
  canDiscard,
  deadwood,
  describeEnding,
  describeLastMove,
  describeTableEnd,
  headlineOf,
  knockable,
  meldsFitting,
  sortHand,
  variantLabel
} from '../rules'
import type { Card, RummyView } from '../wire'
import corpus from './arrange_corpus.json'

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
    dealNumber: 1,
    standings: [],
    players: [],
    stockCount: 0,
    canDrawStock: true,
    canDrawDiscard: true,
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
    expect(describeLastMove({ playerId: 'bob', move: 'pass', cards: [] }, 'alice')).toBe('bob passed on the upcard')
    expect(describeLastMove({ playerId: 'alice', move: 'knock', cards: cards('K♣') }, 'alice')).toBe('You knocked on K♣')
  })
})

describe('a deal’s end', () => {
  const won = { variant: '7-card', winner: 'alice', points: 42, scores: [] }
  it('reads from each chair', () => {
    expect(headlineOf(won, 'alice')).toBe('You won the hand!')
    expect(headlineOf(won, 'bob')).toBe('alice wins the hand')
    expect(describeEnding(won, 'alice')).toBe('You went out and score 42 points.')
    expect(describeEnding(won, 'bob')).toBe('alice went out and scores 42 points.')
    expect(describeEnding({ ...won, points: 1 }, 'bob')).toBe('alice went out and scores 1 point.')
  })
  it('names nobody for a deal that broke up', () => {
    const broke = { variant: '7-card', points: 0, scores: [] }
    expect(headlineOf(broke, 'alice')).toBe('The deal broke up')
    expect(describeEnding(broke, 'alice')).toBe('Nobody went out.')
  })
})

describe('the table’s end', () => {
  const standings = [
    { playerId: 'alice', handsWon: 2 },
    { playerId: 'bob', handsWon: 1 }
  ]
  it('reads the hands each chair won', () => {
    expect(describeTableEnd({ standings, dealsPlayed: 3 }, 'alice')).toBe('You won 2 of 3 hands.')
    expect(describeTableEnd({ standings, dealsPlayed: 1 }, 'bob')).toBe('You won 1 of 1 hand.')
  })
  it('says what was played to a chair no longer in the standings', () => {
    expect(describeTableEnd({ standings, dealsPlayed: 3 }, 'carol')).toBe('3 hands played.')
    expect(describeTableEnd({ standings: [], dealsPlayed: 0 }, 'alice')).toBe('No hands played.')
  })
})

describe('the dealer’s choice', () => {
  const choosing = (dealer: string): RummyView => ({
    gameId: 'M1',
    phase: 'choosing',
    players: [],
    stockCount: 0,
    canDrawStock: false,
    canDrawDiscard: false,
    discardCount: 0,
    melds: [],
    dealNumber: 1,
    standings: [],
    choosing: { dealer, options: ['7-card'] }
  })
  it('is the dealer’s alone while they are here', () => {
    expect(canDeal(choosing('alice'), 'alice', [])).toBe(true)
    expect(canDeal(choosing('bob'), 'alice', [])).toBe(false)
  })
  it('passes to anyone while the dealer is away', () => {
    expect(canDeal(choosing('bob'), 'alice', ['bob'])).toBe(true)
    expect(canDeal(choosing('bob'), 'alice', ['carol'])).toBe(false)
  })
  it('is nobody’s outside the choosing', () => {
    expect(canDeal({ ...choosing('alice'), phase: 'playing', choosing: undefined }, 'alice', [])).toBe(false)
  })
  it('names each variant, and an unknown one as it came', () => {
    expect(variantLabel('7-card')).toBe('7-card rummy')
    expect(variantLabel('10-card')).toBe('10-card rummy')
    expect(variantLabel('gin')).toBe('Gin rummy')
    expect(variantLabel('canasta')).toBe('canasta')
  })
})

// The hub arranges gin hands; the UI arranges the viewer's own to say
// what a knock would leave. The corpus is MoonBase's
// libs/cards/rummy/testdata/arrange_corpus.json, copied: both searches
// replay the same cases, which an independent brute force generated.
describe('bestArrangement', () => {
  it.each(corpus.arrange.map(({ hand, deadwood }) => [hand.join(' '), hand, deadwood] as const))('%s', (_, hand, expected) => {
    const arranged = bestArrangement(cards(...hand))
    expect(arranged.points).toBe(expected)
    expect(deadwood(arranged.deadwood)).toBe(expected)
    for (const meld of arranged.melds) expect(arrangedMeld(meld)).not.toBeNull()
    const used = [...arranged.melds.flat(), ...arranged.deadwood].map(card => card.rank + card.suit)
    expect(used.sort()).toEqual([...hand].sort())
  })
})

describe('knockable', () => {
  it('is throwing a card that leaves ten or less', () => {
    // A-2-3♠ and 7-8-9♥ melded: K♣ and 9♦ left over.
    const hand = cards('A♠', '2♠', '3♠', '7♥', '8♥', '9♥', 'K♣', '9♦', 'A♦')
    expect(knockable(hand, c('K♣'))).toBe(true)
    expect(knockable(hand, c('9♦'))).toBe(false)
    expect(knockable(hand, c('Q♥'))).toBe(false)
  })
})

describe('the ace, in every variant', () => {
  const melds = [
    { owner: 'bob', cards: cards('J♣', 'Q♣', 'K♣') },
    { owner: 'bob', cards: cards('2♥', '3♥', '4♥') },
    { owner: 'bob', cards: cards('Q♠', 'K♠', 'A♠') },
    { owner: 'bob', cards: cards('A♦', '2♦', '3♦') }
  ]
  it('lays off high over the king or low under the two, never round the corner', () => {
    expect(meldsFitting(melds, c('A♣'))).toEqual([0])
    expect(meldsFitting(melds, c('A♥'))).toEqual([1])
    expect(meldsFitting(melds, c('2♠'))).toEqual([])
    expect(meldsFitting(melds, c('K♦'))).toEqual([])
  })
  it('counts toward a gin knock at either end, never round the corner', () => {
    const sets = ['7♣', '7♦', '7♥', '3♥', '4♥', '5♥', '2♦', 'K♦']
    expect(knockable(cards('Q♠', 'K♠', 'A♠', ...sets), c('K♦'))).toBe(true)
    expect(knockable(cards('A♠', '2♠', '3♠', ...sets), c('K♦'))).toBe(true)
    expect(knockable(cards('K♠', 'A♠', '2♠', ...sets), c('K♦'))).toBe(false)
  })
})

describe('sortHand by melds', () => {
  it('lays each meld together, then the deadwood by suit', () => {
    const hand = cards('K♣', '9♥', 'A♠', '8♥', '2♠', '7♥', '3♠', '4♦')
    expect(faces(sortHand(hand, 'melds'))).toEqual(['A♠', '2♠', '3♠', '7♥', '8♥', '9♥', 'K♣', '4♦'])
  })
})

describe('a gin deal’s end', () => {
  const hands = [
    { playerId: 'alice', melds: [], deadwood: [] },
    { playerId: 'bob', melds: [], deadwood: [] }
  ]
  const ending = (kind: 'knock' | 'gin' | 'undercut' | 'draw', winner?: string) => ({
    variant: 'gin',
    winner,
    points: 12,
    scores: [],
    gin: { ending: kind, knocker: kind === 'draw' ? undefined : 'alice', hands, laidOff: [] }
  })
  it('says how it ended, from each chair', () => {
    expect(describeEnding(ending('knock', 'alice'), 'alice')).toBe('You knocked and score 12 points.')
    expect(describeEnding(ending('knock', 'alice'), 'bob')).toBe('alice knocked and scores 12 points.')
    expect(describeEnding(ending('gin', 'alice'), 'alice')).toBe('You went gin and score 12 points.')
    expect(describeEnding(ending('gin', 'alice'), 'bob')).toBe('alice went gin and scores 12 points.')
    expect(describeEnding(ending('undercut', 'bob'), 'bob')).toBe('You undercut alice and score 12 points.')
    expect(describeEnding(ending('undercut', 'bob'), 'alice')).toBe('bob undercut you and scores 12 points.')
    expect(describeEnding(ending('undercut', 'bob'), 'carol')).toBe('bob undercut alice and scores 12 points.')
    expect(describeEnding(ending('draw'), 'alice')).toBe('The stock ran down: a draw.')
    expect(headlineOf(ending('draw'), 'alice')).toBe('A draw')
    expect(headlineOf(ending('gin', 'alice'), 'alice')).toBe('You won the hand!')
  })
})
