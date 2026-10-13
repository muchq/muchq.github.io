// Spades' vocabulary on the room stream (MoonBase#1658), mirroring
// model/spades.smithy. Four seats, partners across: seats 0 and 2 are
// team 0, seats 1 and 3 team 1, in the order they joined.

import type { Card } from '@/apps/castle/wire'

export type { Card }

// scored: a hand played out, the next not dealt; won: a hand has won the
// game; closed: a seat left.
export type SpadesPhase = 'waiting' | 'bidding' | 'playing' | 'scored' | 'won' | 'closed'

export interface SpadesPlayer {
  playerId: string
  team: number
  handCount: number
  // The viewer's own hand, by suit (♠ ♥ ♣ ♦) then rank; empty for others.
  hand: Card[]
  // Absent until the seat bids; 0 is nil.
  bid?: number
  tricks: number
}

export interface SpadesTrickPlay {
  playerId: string
  card: Card
}

export interface SpadesTrick {
  plays: SpadesTrickPlay[]
  winner: string
}

export interface SpadesTeam {
  players: string[]
  score: number
  // 0 to 9: the tenth costs 100.
  bags: number
  gamesWon: number
}

// One hand: bids and tricks seat by seat, what each team scored and its
// total after.
export interface SpadesHandLine {
  bids: number[]
  tricks: number[]
  points: number[]
  scores: number[]
}

export interface SpadesView {
  gameId: string
  phase: SpadesPhase
  // Seat order.
  players: SpadesPlayer[]
  // Absent while waiting.
  dealer?: string
  currentPlayerId?: string
  handNumber: number
  // The trick in play, from its lead.
  trick: SpadesTrickPlay[]
  lastTrick?: SpadesTrick
  spadesBroken: boolean
  // The cards the viewer may play now; empty off turn.
  legal: Card[]
  // Team 0 then team 1; empty while waiting.
  teams: SpadesTeam[]
  // This game's hands, in order.
  hands: SpadesHandLine[]
  // The game's end, once won (phase won) or abandoned (phase closed).
  result?: SpadesResult
  left?: string
}

export interface SpadesResult {
  ending: 'points' | 'abandoned'
  // The winning team's two seats; empty when abandoned.
  winners: string[]
  // Each team's score at the end, team 0 first.
  scores: number[]
}

export interface SpadesGameEnded {
  result: SpadesResult
}

export interface SpadesUpdate {
  gameJoined?: { view: SpadesView }
  gameState?: { view: SpadesView }
  gameCreated?: { gameId: string; createdBy?: string }
  gameStarted?: Record<string, never>
  turnChanged?: { playerId: string }
  gameEnded?: SpadesGameEnded
  gameLeft?: { gameId: string }
}

export interface SpadesMovePayloads {
  createGame: undefined
  joinGame: { gameId: string }
  // Needs all four seats.
  startGame: undefined
  leaveGame: undefined
  // 0 (nil) to 13.
  bid: { tricks: number }
  play: { card: Card }
  // The next hand, once this one is scored.
  deal: undefined
}

export type SpadesMoveName = keyof SpadesMovePayloads

export const MAX_BID = 13
