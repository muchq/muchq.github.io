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

// A challenge's terms (MoonBase#1633): what a waiting table starts on once
// its second seat fills.
export interface ChessTerms {
  setupId: string
  setupName: string
  initialSeconds: number
  incrementSeconds: number
}

export interface ChessView {
  gameId: string
  // The server owns this catalog; clients send an ID back when starting.
  availableSetups: ChessSetupOption[]
  // The setup selected when startGame.setupId is absent.
  defaultSetupId: string
  phase: ChessPhase
  // The posted challenge's terms; only while waiting on one.
  terms?: ChessTerms
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
  // Absent fields use the hub's advertised setup default, three minutes and two.
  startGame: { setupId?: string; initialSeconds?: number; incrementSeconds?: number }
  leaveGame: undefined
  play: { uci: string }
  resign: undefined
  // Stockfish in the empty second seat, at an Elo of 1320 to 3190.
  addBot: { elo: number }
  // The lone seat's terms for a waiting table; absent fields use the hub's
  // defaults, and whoever fills the table starts the game on them.
  challenge: { setupId?: string; initialSeconds?: number; incrementSeconds?: number }
  // Any chess table in the room, from no seat: answered with a gameState,
  // then every gameState and gameEnded the seats get. leaveGame, sitting
  // down or leaving the room stops it; a table gone before it started
  // sends gameLeft.
  watch: { gameId: string }
}

export type ChessMoveName = keyof ChessMovePayloads
