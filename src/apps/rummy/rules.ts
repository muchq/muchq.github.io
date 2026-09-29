// What the UI derives from a rummy view: which cards make a meld, which
// melds a card would grow, how a hand is sorted, and how to say what just
// happened. The engine (MoonBase libs/cards/rummy) is the referee; these
// only shape the offer, so they follow its rules to the letter — an offer
// the engine refuses is a button that does nothing.

import type { Card, RummyDealResult, RummyGameEnded, RummyLastMove, RummyMeld, RummyPlayer, RummyView } from './wire'
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

// A hand's best split into melds and deadwood: the least deadwood left,
// which is what gin reckons a hand by.
export interface Arrangement {
  // Each as it would lie on the table.
  melds: Card[][]
  deadwood: Card[]
  points: number
}

// Every meld the hand could make: each three or four of a rank, and each
// stretch of three or more in a suit, the ace low or high.
function candidateMelds(hand: Card[]): Card[][] {
  const found = new Map<string, Card[]>()
  const add = (cards: Card[]) => {
    const meld = arrangedMeld(cards)
    if (meld !== null) found.set(meld.map(face).join(','), meld)
  }
  for (const rank of RANKS) {
    const same = hand.filter(card => card.rank === rank)
    if (same.length >= 3) add(same)
    if (same.length === 4) same.forEach((_, skip) => add(same.filter((__, i) => i !== skip)))
  }
  for (const suit of HAND_SUITS) {
    for (const aceHigh of [false, true]) {
      const run = hand.filter(card => card.suit === suit).sort((a, b) => rankOf(a, aceHigh) - rankOf(b, aceHigh))
      for (let from = 0; from < run.length; from++) {
        for (let to = from + 1; to < run.length && rankOf(run[to], aceHigh) === rankOf(run[to - 1], aceHigh) + 1; to++) {
          if (to - from >= 2) add(run.slice(from, to + 1))
        }
      }
    }
  }
  return [...found.values()]
}

export function bestArrangement(hand: Card[]): Arrangement {
  const candidates = candidateMelds(hand)
  const faces = hand.map(face)
  const decided = new Set<string>()
  const chosen: Card[][] = []
  let best: Arrangement = { melds: [], deadwood: hand, points: deadwood(hand) }
  // Card by card: each is deadwood or in a meld with cards still free.
  // Deadwood only grows, so a branch already past the best is dropped.
  const search = (at: number, points: number) => {
    if (points >= best.points && at > 0) return
    while (at < hand.length && decided.has(faces[at])) at++
    if (at === hand.length) {
      best = { melds: [...chosen], deadwood: hand.filter(card => !chosen.some(meld => meld.includes(card))), points }
      return
    }
    for (const meld of candidates) {
      const cards = meld.map(face)
      if (!cards.includes(faces[at]) || cards.some(f => decided.has(f))) continue
      cards.forEach(f => decided.add(f))
      chosen.push(meld.map(card => hand[faces.indexOf(face(card))]))
      search(at + 1, points)
      chosen.pop()
      cards.forEach(f => decided.delete(f))
    }
    decided.add(faces[at])
    search(at + 1, points + cardPoints(hand[at]))
    decided.delete(faces[at])
  }
  search(0, 0)
  return best
}

// Gin: whether throwing this card leaves ten or less deadwood.
export function knockable(hand: Card[], card: Card): boolean {
  if (!hand.some(held => face(held) === face(card))) return false
  return bestArrangement(hand.filter(held => face(held) !== face(card))).points <= 10
}

export type HandOrder = 'suit' | 'rank' | 'melds'

// A copy of the hand in the order asked for: by suit for runs, by rank
// for sets, or each meld of its best arrangement together, then the
// deadwood. The hub keeps the hand in the order it arrived; this is only
// how it is laid out.
export function sortHand(hand: Card[], order: HandOrder): Card[] {
  const bySuit = (a: Card, b: Card) => HAND_SUITS.indexOf(a.suit) - HAND_SUITS.indexOf(b.suit)
  const byRank = (a: Card, b: Card) => rankOf(a) - rankOf(b)
  const suitThenRank = (a: Card, b: Card) => bySuit(a, b) || byRank(a, b)
  if (order === 'melds') {
    const arranged = bestArrangement(hand)
    const melds = [...arranged.melds].sort((a, b) => suitThenRank(a[0], b[0]))
    return [...melds.flat(), ...[...arranged.deadwood].sort(suitThenRank)]
  }
  return [...hand].sort(order === 'suit' ? suitThenRank : (a, b) => byRank(a, b) || bySuit(a, b))
}

// What a card left in hand costs at the end.
export function cardPoints(card: Card): number {
  const at = RANKS.indexOf(card.rank)
  return at >= 10 ? 10 : at + 1
}

export function deadwood(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + cardPoints(card), 0)
}

// The card just taken alone from the discard pile may not go straight
// back, unless it is all the hand has left; and nothing goes down while a
// card the pile was taken down to is still owed.
export function canDiscard(view: RummyView, hand: Card[], card: Card): boolean {
  // A card the pile was taken down to is owed to the table first.
  if (view.mustPlay !== undefined) return false
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
    case 'pass':
      return `${who} passed on the upcard`
    case 'knock':
      return `${who} knocked on ${faces}`
  }
}

const points = (n: number) => `${n} point${n === 1 ? '' : 's'}`

// How a deal's end reads from one chair.
export function describeEnding(deal: RummyDealResult, viewer: string): string {
  const gin = deal.gin
  if (gin !== undefined) {
    if (gin.ending === 'draw' || deal.winner === undefined) return 'The stock ran down: a draw.'
    const scores = deal.winner === viewer ? `score ${points(deal.points)}` : `scores ${points(deal.points)}`
    const who = you(deal.winner, viewer)
    if (gin.ending === 'undercut') return `${who} undercut ${gin.knocker === viewer ? 'you' : gin.knocker} and ${scores}.`
    return `${who} ${gin.ending === 'gin' ? 'went gin' : 'knocked'} and ${scores}.`
  }
  if (deal.winner === undefined) return 'Nobody went out.'
  return deal.winner === viewer
    ? `You went out and score ${points(deal.points)}.`
    : `${deal.winner} went out and scores ${points(deal.points)}.`
}

export function headlineOf(deal: RummyDealResult, viewer: string): string {
  if (deal.gin?.ending === 'draw') return 'A draw'
  if (deal.winner === undefined) return 'The deal broke up'
  return deal.winner === viewer ? 'You won the hand!' : `${deal.winner} wins the hand`
}

const hands = (n: number) => `${n} hand${n === 1 ? '' : 's'}`

// How the table's end reads from one chair: the hands it won, or, to a
// chair that left before the end, what was played.
export function describeTableEnd(ended: RummyGameEnded, viewer: string): string {
  const mine = ended.standings.find(standing => standing.playerId === viewer)
  if (mine !== undefined) return `You won ${mine.handsWon} of ${hands(ended.dealsPlayed)}.`
  return ended.dealsPlayed === 0 ? 'No hands played.' : `${hands(ended.dealsPlayed)} played.`
}

// Between deals the dealer deals; a dealer the room shows as away lets
// anyone. The hub decides the same way from the same room.
export function canDeal(view: RummyView, viewer: string, away: string[]): boolean {
  if (view.phase !== 'choosing' || view.choosing === undefined) return false
  return view.choosing.dealer === viewer || away.includes(view.choosing.dealer)
}

// `basic` is 7-card's name on a hub from before 7-card had its own.
const VARIANT_LABELS: Record<string, string> = { '7-card': '7-card rummy', basic: '7-card rummy', '10-card': '10-card rummy', gin: 'Gin rummy' }

// A variant as the table names it; one this build does not know yet reads
// as the hub spelled it.
export function variantLabel(variant: string): string {
  return VARIANT_LABELS[variant] ?? variant
}

export function seatOf(view: RummyView, playerId: string): RummyPlayer | undefined {
  return view.players.find(p => p.playerId === playerId)
}
