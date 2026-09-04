// Castle's vocabulary on the room stream, mirroring MoonBase's
// model/castle.smithy. The view is the UI's model as well as the wire's:
// the hub already redacts per viewer, so there is nothing to translate.

export interface Card {
  rank: string
  suit: string
}

export type CastlePhase = 'waiting' | 'setup' | 'playing' | 'ended'

export interface CastlePlayer {
  playerId: string
  ready: boolean
  handCount: number
  // Faces only for the viewer's own seat, and for every seat once the
  // game ends.
  hand: Card[]
  faceUp: Card[]
  faceDownCount: number
  // Shed every card: finished, and out of the turn order.
  out: boolean
  // True only for the viewer's own seat, on turn, with a legal play on
  // the pile as it stands; always false for a blind row. The pile can
  // be picked up either way.
  canPlay: boolean
}

// The pile's last move: a play (its cards, and whether they cleared the
// pile), a pick-up by choice (no cards), or a blind flip that failed
// (the card it turned over, then the pile with it). The seat named may
// have left since.
export interface CastleLastPlay {
  playerId: string
  cards: Card[]
  burned: boolean
  pickedUp: boolean
}

export interface CastleView {
  gameId: string
  phase: CastlePhase
  players: CastlePlayer[]
  currentPlayerId?: string
  drawPileCount: number
  pileCount: number
  // The run on top of the pile, top card last: every card of the top's
  // rank in a row. Its length is the count the next play must match, or
  // the four of a kind it must complete. Empty on an empty pile.
  run: Card[]
  // First out first; the game ends on the first, so at most one name.
  finished: string[]
  lastPlay?: CastleLastPlay
}

// A two-seat game names the other seat as the loser; a bigger table
// ends with a winner and no loser; an abandoned game has neither.
export interface CastleGameEnded {
  finished: string[]
  loser?: string
}

// The castle update union's JSON encoding: exactly one member present.
export interface CastleUpdate {
  gameJoined?: { view: CastleView }
  gameState?: { view: CastleView }
  gameCreated?: { gameId: string; createdBy?: string }
  gameStarted?: Record<string, never>
  turnChanged?: { playerId: string }
  gameEnded?: CastleGameEnded
  gameLeft?: { gameId: string }
}

export type CastleMoveName =
  | 'createGame'
  | 'joinGame'
  | 'startGame'
  | 'leaveGame'
  | 'swapForSetup'
  | 'ready'
  | 'playFromHand'
  | 'playFaceUp'
  | 'playFaceDown'
  | 'pickUp'
