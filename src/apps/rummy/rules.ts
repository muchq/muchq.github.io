// What the UI derives from a rummy view: which cards make a meld, which
// melds a card would grow, how a hand is sorted, and how to say what just
// happened. The engine (MoonBase libs/cards/rummy) is the referee; these
// only shape the offer, so they follow its rules to the letter — an offer
// the engine refuses is a button that does nothing.

import type { Card, RummyGameEnded, RummyLastMove, RummyMeld, RummyPlayer, RummyView } from './wire'
import { face } from '@/apps/castle/rules'

export { face, isRed, enteredSince } from '@/apps/castle/rules'

// Ace low, which is how a hand reads and how the ace counts; runs also
// take it above the king.
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
// The engine's suit order, which is how it lays a set.
const SET_SUITS = ['♣', '♦', '♥', '♠']
// A hand sorted by suit alternates colour, so neighbouring suits are told
// apart at a glance.
const HAND_SUITS = ['♠', '♥', '♣', '♦']

const rankOf = (card: Card, aceHigh = false) => {
  const at = RANKS.indexOf(card.rank)
  return aceHigh && at === 0 ? RANKS.length : at
}

// Laid low to high with the ace at one end, if that is a run.
const asRun = (cards: Card[], aceHigh: boolean): Card[] | null => {
  const run = [...cards].sort((a, b) => rankOf(a, aceHigh) - rankOf(b, aceHigh))
  for (let i = 1; i < run.length; i++) {
    if (rankOf(run[i], aceHigh) !== rankOf(run[i - 1], aceHigh) + 1) return null
  }
  return run
}

// The cards as they would lie on the table if they make a meld, else
// null: three or four of a rank in suit order, or three or more of a suit
// in sequence, the ace low or high but never both.
export function arrangedMeld(cards: Card[]): Card[] | null {
  if (cards.length < 3 || new Set(cards.map(face)).size !== cards.length) return null
  if (cards.every(card => card.rank === cards[0].rank)) {
    return [...cards].sort((a, b) => SET_SUITS.indexOf(a.suit) - SET_SUITS.indexOf(b.suit))
  }
  if (!cards.every(card => card.suit === cards[0].suit)) return null
  return asRun(cards, true) ?? asRun(cards, false)
}

// The places of every meld on the table this card would grow.
export function meldsFitting(melds: RummyMeld[], card: Card): number[] {
  return melds.flatMap((meld, i) => (arrangedMeld([...meld.cards, card]) === null ? [] : [i]))
}

export type HandOrder = 'suit' | 'rank'

// A copy of the hand in the order asked for: by suit for runs, by rank
// for sets. The hub keeps the hand in the order it arrived; this is only
// how it is laid out.
export function sortHand(hand: Card[], order: HandOrder): Card[] {
  const bySuit = (a: Card, b: Card) => HAND_SUITS.indexOf(a.suit) - HAND_SUITS.indexOf(b.suit)
  const byRank = (a: Card, b: Card) => rankOf(a) - rankOf(b)
  return [...hand].sort(order === 'suit' ? (a, b) => bySuit(a, b) || byRank(a, b) : (a, b) => byRank(a, b) || bySuit(a, b))
}

// What a card left in hand costs at the end.
export function cardPoints(card: Card): number {
  const at = RANKS.indexOf(card.rank)
  return at >= 10 ? 10 : at + 1
}

export function deadwood(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + cardPoints(card), 0)
}

// The card just taken from the discard pile may not go straight back,
// unless it is all the hand has left.
export function canDiscard(view: RummyView, hand: Card[], card: Card): boolean {
  return view.takenDiscard === undefined || face(view.takenDiscard) !== face(card) || hand.length === 1
}

const you = (id: string, viewer: string) => (id === viewer ? 'You' : id)

// The last move, as a sentence for the table.
export function describeLastMove(move: RummyLastMove, viewer: string): string {
  const who = you(move.playerId, viewer)
  const faces = move.cards.map(face).join(' ')
  switch (move.move) {
    case 'drawStock':
      return `${who} drew from the stock`
    case 'drawDiscard':
      return `${who} took ${faces}`
    case 'meld':
      return `${who} melded ${faces}`
    case 'layOff':
      return `${who} laid off ${faces}`
    case 'discard':
      return `${who} discarded ${faces}`
  }
}

const points = (n: number) => `${n} point${n === 1 ? '' : 's'}`

// How a finished game reads from one chair.
export function describeEnding(ended: RummyGameEnded, viewer: string): string {
  if (ended.winner === undefined) return 'Nobody went out.'
  return ended.winner === viewer
    ? `You went out and score ${points(ended.points)}.`
    : `${ended.winner} went out and scores ${points(ended.points)}.`
}

export function headlineOf(ended: RummyGameEnded, viewer: string): string {
  if (ended.winner === undefined) return 'The table broke up'
  return ended.winner === viewer ? 'You won!' : `${ended.winner} wins`
}

export function seatOf(view: RummyView, playerId: string): RummyPlayer | undefined {
  return view.players.find(p => p.playerId === playerId)
}
