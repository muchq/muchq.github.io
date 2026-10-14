// A playing card as every card game's wire carries it, and how to show it.

export interface Card {
  rank: string
  suit: string
}

export function face(card: Card): string {
  return `${card.rank}${card.suit}`
}

export function isRed(card: Card): boolean {
  return card.suit === '♥' || card.suit === '♦'
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
