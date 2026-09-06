export interface Card {
  rank: string
  suit: string
}

export interface Player {
  // Game-specific fields
  id: string
  name: string
  cards: (Card | null)[]
  score: number
  revealedCards: number[]
  isReady: boolean
  hasPeeked: boolean
  
  // Room/persistence fields
  clientId: string
  totalScore: number      // Running total across all games
  gamesPlayed: number
  gamesWon: number
  isConnected: boolean
  joinedAt: string
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
