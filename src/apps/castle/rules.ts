// What the UI derives from a castle view: which row a seat plays from,
// which cards may be picked together, and how to say what just
// happened. The engine is the referee; these only shape the offer.

import type { Card, CastleLastPlay, CastlePlayer, CastleView } from './wire'

export type Row = 'hand' | 'faceUp' | 'faceDown'

// The row in play: the hand while it holds cards, then the face-up row,
// then the blind face-down row.
export function rowInPlay(player: CastlePlayer): Row {
  if (player.handCount > 0) return 'hand'
  if (player.faceUp.length > 0) return 'faceUp'
  return 'faceDown'
}

export function cardsOf(player: CastlePlayer, row: Row): Card[] {
  return row === 'hand' ? player.hand : row === 'faceUp' ? player.faceUp : []
}

// A play is cards of one rank: selecting a card of another rank starts
// the selection over rather than refusing.
export function toggleSelection(selected: number[], cards: Card[], index: number): number[] {
  if (selected.includes(index)) return selected.filter(i => i !== index)
  const rank = cards[index]?.rank
  if (rank === undefined) return selected
  const sameRank = selected.filter(i => cards[i]?.rank === rank)
  return [...sameRank, index].sort((a, b) => a - b)
}

export function face(card: Card): string {
  return `${card.rank}${card.suit}`
}

export function isRed(card: Card): boolean {
  return card.suit === '♥' || card.suit === '♦'
}

const you = (id: string, viewer: string) => (id === viewer ? 'You' : id)

// The last move, as a sentence for the table.
export function describeLastPlay(play: CastleLastPlay, viewer: string): string {
  const who = you(play.playerId, viewer)
  const faces = play.cards.map(face).join(' ')
  if (play.pickedUp) {
    return play.cards.length > 0
      ? `${who} flipped ${faces} and picked up the pile`
      : `${who} picked up the pile`
  }
  return play.burned ? `${who} played ${faces} and burned the pile` : `${who} played ${faces}`
}

const COUNTS = ['none', 'one', 'two', 'three', 'four']

// The pile as a price: what the next play must match. Counts are words,
// so a run of three 3s does not read as arithmetic.
export function describePile(view: CastleView): string {
  if (view.pileTop === undefined) return 'Empty pile: anything goes'
  const rank = view.pileTop.rank
  const count = COUNTS[view.pileRun] ?? String(view.pileRun)
  const top = view.pileRun > 1 ? `${count} ${rank}s` : face(view.pileTop)
  return `${top} on top: play ${count} or more of ${rank} or higher`
}

// How a finished game reads from one chair.
export function describeEnding(finished: string[], loser: string | undefined, viewer: string): string {
  if (finished.length === 0) return 'The table broke up: nobody went out'
  const winner = finished[0]
  const won = winner === viewer ? 'You went out first and win' : `${winner} went out first and wins`
  if (loser === undefined) return `${won}.`
  return `${won}; ${loser === viewer ? 'you are' : `${loser} is`} the loser.`
}

export function seatOf(view: CastleView, playerId: string): CastlePlayer | undefined {
  return view.players.find(p => p.playerId === playerId)
}
