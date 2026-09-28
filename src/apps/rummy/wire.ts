// Rummy's vocabulary on the room stream, mirroring MoonBase's
// model/rummy.smithy (#245). The view is the UI's model as well as the
// wire's: the hub already redacts per viewer, so there is nothing to
// translate.

import type { Card } from '@/apps/castle/wire'

export type { Card }

export type RummyPhase = 'waiting' | 'playing' | 'ended'

// Where the seat on turn is: about to draw, or holding the drawn card
// with melds, lay-offs and the discard to come.
export type RummyStage = 'draw' | 'play'

export interface RummyPlayer {
  playerId: string
  handCount: number
  // Faces only for the viewer's own seat, in the order they arrived (a
  // drawn card last), and for every seat once the game ends.
  hand: Card[]
}

// Cards on the table, laid low to high for a run, by suit for a set.
// Melds only grow and never move, so a lay-off names one by its place.
export interface RummyMeld {
  owner: string
  cards: Card[]
}

export type RummyMoveKind = 'drawStock' | 'drawDiscard' | 'meld' | 'layOff' | 'discard'

// The table's most recent move: nothing for a stock draw (nobody else
// sees it), the card taken, the meld as laid, the card laid off, the card
// discarded. The seat named may have left since.
export interface RummyLastMove {
  playerId: string
  move: RummyMoveKind
  cards: Card[]
  meldIndex?: number
}

export interface RummyView {
  gameId: string
  phase: RummyPhase
  players: RummyPlayer[]
  currentPlayerId?: string
  stage?: RummyStage
  stockCount: number
  // Whether a stock draw would take a card: the stock has one, or the
  // discard pile has cards under its top to turn over.
  canDrawStock: boolean
  discardCount: number
  discardTop?: Card
  // Taken from the discard pile this turn: it may not go straight back
  // unless it is the last card in hand.
  takenDiscard?: Card
  melds: RummyMeld[]
  lastMove?: RummyLastMove
}

export interface RummyScore {
  playerId: string
  deadwood: number
}

// The seat that went out and what it scored (everyone else's cards left
// in hand), or no winner and no points for a table that broke up.
export interface RummyGameEnded {
  winner?: string
  points: number
  scores: RummyScore[]
}

// The rummy update union's JSON encoding: exactly one member present.
export interface RummyUpdate {
  gameJoined?: { view: RummyView }
  gameState?: { view: RummyView }
  gameCreated?: { gameId: string; createdBy?: string }
  gameStarted?: Record<string, never>
  turnChanged?: { playerId: string }
  gameEnded?: RummyGameEnded
  gameLeft?: { gameId: string }
}

// What each move carries. Every card is named (MoonBase #1505): the hub
// matches it against the hand it holds rather than trusting a slot.
export interface RummyMovePayloads {
  createGame: undefined
  joinGame: { gameId: string }
  startGame: undefined
  leaveGame: undefined
  drawStock: undefined
  drawDiscard: undefined
  meld: { cards: Card[] }
  layOff: { card: Card; meldIndex: number }
  discard: { card: Card }
}

export type RummyMoveName = keyof RummyMovePayloads
