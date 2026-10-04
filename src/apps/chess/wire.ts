// Chess's vocabulary on the room stream, mirroring MoonBase's
// model/chess.smithy. Chess hides nothing, so every seat gets the same
// view; the hub sends the legal moves, so the client needs no rules of
// its own beyond reading a position.

export type ChessColor = 'white' | 'black'

// ended: a game is over and the table waits on the next; closed: a seat
// left the table.
export type ChessPhase = 'waiting' | 'playing' | 'ended' | 'closed'

export type ChessEnding =
  | 'checkmate'
  | 'stalemate'
  | 'insufficientMaterial'
  | 'fiftyMoves'
  | 'repetition'
  | 'resignation'
  | 'timeout'
  | 'abandoned'

export interface ChessPlayer {
  playerId: string
  // Absent while waiting.
  color?: ChessColor
  // A bot's seat, its id naming engine and strength ("stockfish@1500").
  bot?: boolean
}

// Each side's time left as of the moment the hub built the view; the
// side to move's is running from there.
export interface ChessClock {
  whiteMs: number
  blackMs: number
  initialMs: number
  incrementMs: number
}

// A draw has no winner. The winner may have left since.
export interface ChessResult {
  winner?: string
  winnerColor?: ChessColor
  ending: ChessEnding
}

// One finished game: the winning player, absent for a draw.
export interface ChessScoreLine {
  winner?: string
  ending: ChessEnding
}

export interface ChessSetupOption {
  setupId: string
  name: string
}

export interface ChessView {
  gameId: string
  // The server owns this catalog; clients send an ID back when starting.
  availableSetups: ChessSetupOption[]
  phase: ChessPhase
  variant?: string
  // Absent while waiting.
  setupId?: string
  setupName?: string
  players: ChessPlayer[]
  // Absent while waiting.
  fen?: string
  // Every move so far in UCI ("e2e4", "e7e8q").
  moves: string[]
  sideToMove?: ChessColor
  currentPlayerId?: string
  inCheck: boolean
  // The side to move's legal moves in UCI; empty unless playing.
  legalMoves: string[]
  clock?: ChessClock
  result?: ChessResult
  // Every game the table finished, in order. Absent from a hub before tables played on.
  scoreSheet?: ChessScoreLine[]
}

// The chess update union's JSON encoding: exactly one member present.
export interface ChessUpdate {
  gameJoined?: { view: ChessView }
  gameState?: { view: ChessView }
  gameCreated?: { gameId: string; createdBy?: string }
  gameStarted?: Record<string, never>
  turnChanged?: { playerId: string }
  gameEnded?: { result: ChessResult }
  gameLeft?: { gameId: string }
}

export interface ChessMovePayloads {
  createGame: undefined
  joinGame: { gameId: string }
  // Absent fields use the hub's defaults: random K+P vs K, three minutes and two.
  startGame: { setupId?: string; initialSeconds?: number; incrementSeconds?: number }
  leaveGame: undefined
  play: { uci: string }
  resign: undefined
  // Stockfish in the empty second seat, at an Elo of 1320 to 3190.
  addBot: { elo: number }
}

export type ChessMoveName = keyof ChessMovePayloads
