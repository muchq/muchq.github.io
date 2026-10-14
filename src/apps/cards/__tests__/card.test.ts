import { describe, expect, it } from 'vitest'
import { enteredSince, face, isRed } from '../card'

describe('card', () => {
  it('names a card by rank then suit', () => {
    expect(face({ rank: '10', suit: '♣' })).toBe('10♣')
  })

  it('hearts and diamonds are red, clubs and spades are not', () => {
    expect(['♥', '♦', '♣', '♠'].map(suit => isRed({ rank: 'A', suit }))).toEqual([true, true, false, false])
  })
})

describe('enteredSince', () => {
  it('names the cards that were not there, counting duplicates as a multiset', () => {
    const hand = [
      { rank: 'K', suit: '♣' },
      { rank: 'K', suit: '♣' },
      { rank: '3', suit: '♦' }
    ]
    // One K♣ was there: the second is new, the first is not.
    expect(enteredSince(['K♣'], hand)).toEqual([1, 2])
    expect(enteredSince(['K♣', 'K♣', '3♦'], hand)).toEqual([])
    expect(enteredSince([], hand)).toEqual([0, 1, 2])
    // Order changed, nothing arrived.
    expect(enteredSince(['3♦', 'K♣', 'K♣'], hand)).toEqual([])
  })
})
