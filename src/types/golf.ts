export interface Card {
  rank: string
  suit: string
}

export interface Player {
  id: string
  name: string
  cards: (Card | null)[]
  score: number
  revealedCards: number[]
  isReady: boolean
  hasPeeked: boolean
}

export interface GameState {
  id: string
  players: Player[]
  currentPlayerIndex: number
  drawPile: number
  discardPile: Card[]
  gamePhase: 'waiting' | 'playing' | 'peeking' | 'knocked' | 'ended'
  knockedPlayerId: string | null
  drawnCard: Card | null
  allPlayersPeeked: boolean
}

export const CARD_VALUES: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 0, 'Q': 10, 'K': 10
}