// What the UI derives from a castle view: which row a seat plays from,
// which cards may be picked together, and how to say what just
// happened. The engine is the referee; these only shape the offer.

import type { Card, CastleGameEnded, CastleLastPlay, CastlePlayer, CastleView } from './wire'

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

// Which cards of the hand were not in it last time: the draw-back, or
// the pile just picked up. Matched as a multiset by face, so a second
// K♣ is new only if there was not one already.
export function enteredSince(previous: string[], hand: Card[]): number[] {
  const left = [...previous]
  const entered: number[] = []
  hand.forEach((card, i) => {
    const at = left.indexOf(face(card))
    if (at < 0) entered.push(i)
    else left.splice(at, 1)
  })
  return entered
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
  return play.burned ? `${who} played ${faces} and cleared the pile` : `${who} played ${faces}`
}

const COUNTS = ['none', 'one', 'two', 'three', 'four']

// The pile as a price, for the seat that has to pay it: the count to
// match is the last play's, the rank the top's. The run itself is on the
// table, so the line does not repeat it. Counts are words, so a run of
// three 3s does not read as arithmetic.
export function describePile(view: CastleView): string {
  const top = view.run[view.run.length - 1]
  if (top === undefined) return 'Anything goes'
  const price = view.lastPlay !== undefined && view.lastPlay.cards.length > 0 ? view.lastPlay.cards.length : view.run.length
  return price > 1 ? `Play ${COUNTS[price] ?? price} or more, ${top.rank} or higher` : `Play ${top.rank} or higher`
}

// How a finished game reads from one chair.
export function describeEnding(finished: string[], loser: string | undefined, viewer: string): string {
  if (finished.length === 0) return 'The table broke up: nobody went out'
  const winner = finished[0]
  const won = winner === viewer ? 'You went out first and win' : `${winner} went out first and wins`
  if (loser === undefined) return `${won}.`
  return `${won}; ${loser === viewer ? 'you are' : `${loser} is`} the loser.`
}

// Where one chair finished: the first seat out wins — only the first,
// since the game ends there — the seat left holding cards loses, and an
// abandoned table has neither.
export type Standing = 'won' | 'lost' | 'other'

export function standingOf(finished: string[], loser: string | undefined, viewer: string): Standing {
  if (finished[0] === viewer) return 'won'
  if (loser === viewer) return 'lost'
  return 'other'
}

// The ending as a headline, from one chair. describeEnding has the whole
// sentence; this is the half a player reads first.
export function headlineOf(ended: CastleGameEnded, viewer: string): string {
  if (ended.finished.length === 0) return 'The table broke up'
  switch (standingOf(ended.finished, ended.loser, viewer)) {
    case 'won':
      return 'You won!'
    case 'lost':
      return 'You lost'
    default:
      return `${ended.finished[0]} wins`
  }
}

export function seatOf(view: CastleView, playerId: string): CastlePlayer | undefined {
  return view.players.find(p => p.playerId === playerId)
}
