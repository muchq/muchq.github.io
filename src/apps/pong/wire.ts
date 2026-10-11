// Pong's vocabulary on the room stream, mirroring MoonBase's
// model/pong.smithy. The hub runs the rally: a seat says where it wants
// its paddle, and the table's state arrives as views (the score) and
// frames (the ball and paddles, about thirty a second).

import type { ChessStanding } from '@/apps/chess/wire'

export type PongVariant = 'smallcat' | '3d'

// ended: a game is over and the table waits on the next; closed: a seat
// left the table.
export type PongPhase = 'waiting' | 'playing' | 'ended' | 'closed'

export type PongEnding = 'points' | 'abandoned'

export interface PongPlayer {
  playerId: string
  // Lives left this game; absent while waiting.
  lives?: number
  // A bot's seat, its id naming its level ("smallcat@2").
  bot?: boolean
}

// The court in its own units. The ball travels along z, from end 0 at
// z = 0 (the first seat's) to end 1 at z = depth; a paddle moves across x
// and y on its end. The flat court has no width.
export interface PongCourt {
  width: number
  height: number
  depth: number
  paddleWidth: number
  paddleHeight: number
  ballRadius: number
  inset: number
  // The farthest a paddle moves in a tick, on each axis.
  playerSpeed: number
  // Velocities are per tick.
  ticksPerSecond: number
}

export interface PongResult {
  winner: string
  ending: PongEnding
}

export interface PongScoreLine {
  winner: string
  ending: PongEnding
}

export interface PongView {
  gameId: string
  phase: PongPhase
  // Absent while waiting.
  variant?: PongVariant
  court?: PongCourt
  // Seat order: the first defends end 0, the second end 1.
  players: PongPlayer[]
  result?: PongResult
  scoreSheet: PongScoreLine[]
  // The round robin whose pairing this table plays: one game on its
  // variant, with no next game or bot.
  roundRobinId?: string
}

export interface PongVector {
  x: number
  y: number
  z: number
}

// Where the rally stands. A frame with a lower tick than one already
// drawn is stale; between frames the ball moves on by its velocity.
export interface PongFrame {
  gameId: string
  tick: number
  ball: PongVector
  velocity: PongVector
  // Paddle centres, in seat order.
  paddles: Array<{ x: number; y: number }>
  // Ticks until the serve; 0 once the ball is in flight.
  serveIn: number
}

// A pairing of a pong round robin: pong has no draws, so its result is
// its winner.
export interface PongPairing {
  round: number
  first: string
  second: string
  winner?: string
  forfeit: boolean
  voided: boolean
  gameId?: string
}

export interface PongRoundRobin {
  roundRobinId: string
  creator: string
  entrants: string[]
  variant: PongVariant
  pairings: PongPairing[]
  withdrawn: string[]
  standings: ChessStanding[]
}

export interface PongUpdate {
  gameJoined?: { view: PongView }
  gameState?: { view: PongView }
  gameCreated?: { gameId: string; createdBy?: string }
  gameStarted?: Record<string, never>
  gameEnded?: { result: PongResult }
  gameLeft?: { gameId: string }
  frame?: PongFrame
  roundRobin?: PongRoundRobin
  roundRobins?: { roundRobins: PongRoundRobin[] }
}

export interface PongMovePayloads {
  createGame: undefined
  joinGame: { gameId: string }
  // Absent, smallcat. On an ended table, the next game.
  startGame: { variant?: PongVariant }
  leaveGame: undefined
  // Where the seat wants its paddle's centre, in court units: the hub
  // chases it at the court's player speed. The flat court ignores x.
  paddle: { x?: number; y: number }
  // smallcat's own opponent in the empty second seat, level 1 to 3.
  addBot: { level: number }
  // Any pong table in the room, from no seat.
  watch: { gameId: string }
  createRoundRobin: { entrants: string[]; variant?: PongVariant }
  withdraw: { roundRobinId: string; playerId: string }
  forfeit: { roundRobinId: string; winner: string; loser: string }
  roundRobins: undefined
  playRoundRobin: { roundRobinId: string; opponent: string }
}

export type PongMoveName = keyof PongMovePayloads

export const VARIANTS: ReadonlyArray<{ variant: PongVariant; label: string }> = [
  { variant: 'smallcat', label: '2D' },
  { variant: '3d', label: '3D' }
]

export const variantLabel = (variant: PongVariant): string =>
  VARIANTS.find(entry => entry.variant === variant)?.label ?? variant

export const BOT_LEVELS: ReadonlyArray<{ level: number; label: string }> = [
  { level: 1, label: 'Easy' },
  { level: 2, label: 'Medium' },
  { level: 3, label: 'Hard' }
]
