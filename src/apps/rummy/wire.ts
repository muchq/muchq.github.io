// Rummy's vocabulary on the room stream, mirroring MoonBase's
// model/rummy.smithy (#245). The view is the UI's model as well as the
// wire's: the hub already redacts per viewer, so there is nothing to
// translate.
//
// Every table is dealer's choice (MoonBase#1609): started, it waits
// between deals on its dealer's pick — 7-card or 10-card rummy, or gin
// heads-up (#1610); each deal's end passes the deal on; it ends only when
// fewer than two seats are left.

import type { Card } from '@/apps/castle/wire'

export type { Card }

export type RummyPhase = 'waiting' | 'choosing' | 'playing' | 'ended'

// Where the seat on turn is: gin's upcard (take it or pass), about to
// draw, or holding the drawn card with melds, lay-offs and the discard to
// come — in gin, a discard or a knock.
export type RummyStage = 'upcard' | 'draw' | 'play'

export interface RummyPlayer {
  playerId: string
  handCount: number
  // Faces only for the viewer's own seat, in the order they arrived (a
  // drawn card last), and for every seat once the deal ends.
  hand: Card[]
}

// Cards on the table, laid low to high for a run, by suit for a set.
// Melds only grow and never move, so a lay-off names one by its place.
export interface RummyMeld {
  owner: string
  cards: Card[]
}

export type RummyMoveKind = 'drawStock' | 'drawDiscard' | 'meld' | 'layOff' | 'discard' | 'pass' | 'knock'

// The table's most recent move: nothing for a stock draw (nobody else
// sees it), the card taken, the meld as laid, the card laid off, the card
// discarded or knocked on; nothing for a pass. The seat named may have
// left since.
export interface RummyLastMove {
  playerId: string
  move: RummyMoveKind
  cards: Card[]
  meldIndex?: number
}

export interface RummyStanding {
  playerId: string
  handsWon: number
}

export interface RummyScore {
  playerId: string
  deadwood: number
}

// A gin hand as the hub arranged it at the end; the defender's without
// what it laid off.
export interface RummyArrangedHand {
  playerId: string
  melds: Card[][]
  deadwood: Card[]
}

export type RummyGinEnding = 'knock' | 'gin' | 'undercut' | 'draw'

export interface RummyGinResult {
  ending: RummyGinEnding
  // Absent for a draw.
  knocker?: string
  // Seat order.
  hands: RummyArrangedHand[]
  // The defender's cards laid off onto the knocker's melds.
  laidOff: Card[]
}

// A deal's result: the seat that scored and what (everyone else's cards
// left in hand, or gin's reckoning), or no winner and no points for a
// deal broken up by a leave or drawn.
export interface RummyDealResult {
  variant: string
  winner?: string
  points: number
  scores: RummyScore[]
  gin?: RummyGinResult
}

// Between deals: who deals next and what they may deal. A dealer the
// room shows as not connected lets any seat deal.
export interface RummyChoosing {
  dealer: string
  options: string[]
}

export interface RummyView {
  gameId: string
  phase: RummyPhase
  // The deal in play's variant, or the last one's.
  variant?: string
  // Deals dealt so far.
  dealNumber: number
  // Hands won, seat by seat.
  standings: RummyStanding[]
  choosing?: RummyChoosing
  // The last deal's result, between deals and once the table ends.
  lastDeal?: RummyDealResult
  players: RummyPlayer[]
  currentPlayerId?: string
  stage?: RummyStage
  stockCount: number
  // Whether a stock draw would take a card: the stock has one, or the
  // discard pile has cards under its top to turn over.
  canDrawStock: boolean
  // Whether a discard draw would take the top: not once gin's upcard was
  // passed by both. Absent from a hub older than gin, where it is whether
  // there is a top.
  canDrawDiscard?: boolean
  discardCount: number
  discardTop?: Card
  // Taken from the discard pile this turn: it may not go straight back
  // unless it is the last card in hand.
  takenDiscard?: Card
  melds: RummyMeld[]
  lastMove?: RummyLastMove
}

// The table broke up, below two seats: the hands each seat still at it
// won.
export interface RummyGameEnded {
  standings: RummyStanding[]
  dealsPlayed: number
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
  chooseVariant: { variant: string }
  pass: undefined
  drawStock: undefined
  drawDiscard: undefined
  meld: { cards: Card[] }
  layOff: { card: Card; meldIndex: number }
  discard: { card: Card }
  knock: { card: Card }
}

export type RummyMoveName = keyof RummyMovePayloads
