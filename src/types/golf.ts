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

// New types for room-based architecture
export interface Room {
  id: string
  players: Player[]
  games: Record<string, GameState>  // Active games mapped by game ID
  gameHistory: GameResult[]
  createdAt: string
  lastActivity: string
}

export interface GameResult {
  gameId: string
  winner: string
  finalScores: FinalScore[]
  completedAt: string
}

export interface FinalScore {
  playerName: string
  score: number
}

export interface GameContext {
  roomId: string
  gameId: string
}

export const CARD_VALUES: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 0, 'Q': 10, 'K': 10
}