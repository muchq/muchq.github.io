// Spades' vocabulary on the room stream (MoonBase#1658), mirroring
// model/spades.smithy. Two to four seats in the order they joined:
// partners at four, seats 0 and 2 team 0 and 1 and 3 team 1; or
// cutthroat, every seat a team of its own.

import type { Card } from '@/apps/castle/wire'

export type { Card }

// scored: a hand played out, the next not dealt; won: a hand has won the
// game; closed: a seat left.
export type SpadesPhase = 'waiting' | 'bidding' | 'playing' | 'scored' | 'won' | 'closed'

export type SpadesMode = 'partners' | 'cutthroat'

export interface SpadesPlayer {
  playerId: string
  // Its index in the view's teams.
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
  // Absent while waiting.
  mode?: SpadesMode
  // Cards a seat is dealt and the highest bid; absent while waiting.
  handSize?: number
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
  // In team order; empty while waiting.
  teams: SpadesTeam[]
  // This game's hands, in order.
  hands: SpadesHandLine[]
  // The game's end, once won (phase won) or abandoned (phase closed).
  result?: SpadesResult
  left?: string
}

export interface SpadesResult {
  ending: 'points' | 'abandoned'
  // The winning team's seats; empty when abandoned.
  winners: string[]
  // Each team's score at the end, in team order.
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
  // Partners needs four seats.
  startGame: { mode: SpadesMode }
  leaveGame: undefined
  // 0 (nil) to handSize.
  bid: { tricks: number }
  play: { card: Card }
  // The next hand, once this one is scored.
  deal: undefined
}

export type SpadesMoveName = keyof SpadesMovePayloads

export const HAND_SIZE = 13
