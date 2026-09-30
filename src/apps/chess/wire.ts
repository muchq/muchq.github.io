// Chess's vocabulary on the room stream, mirroring MoonBase's
// model/chess.smithy. Chess hides nothing, so every seat gets the same
// view; the hub sends the legal moves, so the client needs no rules of
// its own beyond reading a position.

export type ChessColor = 'white' | 'black'

export type ChessPhase = 'waiting' | 'playing' | 'ended'

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

export interface ChessView {
  gameId: string
  phase: ChessPhase
  variant?: string
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
  // Seconds; absent is the hub's default, three minutes and two.
  startGame: { initialSeconds?: number; incrementSeconds?: number }
  leaveGame: undefined
  play: { uci: string }
  resign: undefined
}

export type ChessMoveName = keyof ChessMovePayloads
