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

// One finished game in the room's history (MoonBase#1637), without its
// moves. ordinal is its line on its table's score sheet, from 1; it and
// gameId are absent on a game's public page, which names no table.
export interface ChessGameSummary {
  // The game's identity: what a review names it by, and its place in the
  // public feed if it is there.
  archiveId: number
  gameId?: string
  ordinal?: number
  white: string
  black: string
  result: ChessResult
  setupId: string
  setupName: string
  plies: number
  endedAtMs: number
  // It ended while the room was published.
  published: boolean
}

// The room's finished games, newest first, at most 100, and whether the
// room publishes them now.
export interface ChessHistory {
  published: boolean
  games: ChessGameSummary[]
}

// One finished game move by move: fens has one more entry than moves,
// the start first.
export interface ChessReview {
  summary: ChessGameSummary
  moves: string[]
  san: string[]
  fens: string[]
  pgn: string
}

// A round robin (MoonBase#1647): everyone entered plays everyone once,
// on its terms, each pairing at a table its pair opens. Every member
// hears it whenever it changes.
export interface ChessPairing {
  // From 1; rounds only order the list, pairings are played whenever
  // both players are free.
  round: number
  white: string
  black: string
  // Absent until decided.
  result?: 'white' | 'black' | 'draw'
  // Recorded by the moderator, not played.
  forfeit: boolean
  // Never to be played: an entrant in it withdrew first.
  voided: boolean
  // The table playing it now.
  gameId?: string
}

export interface ChessStanding {
  playerId: string
  points: number
  sonnebornBerger: number
  // From 1; players level on everything share a place.
  place: number
  withdrawn: boolean
}

export interface ChessRoundRobin {
  roundRobinId: string
  // Moderates while in the room; while away, any other entrant does.
  creator: string
  entrants: string[]
  terms: ChessTerms
  // In round order.
  pairings: ChessPairing[]
  withdrawn: string[]
  // Best first.
  standings: ChessStanding[]
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
  history?: ChessHistory
  review?: ChessReview
  // `by` is absent when another hub instance relays it.
  published?: { published: boolean; by?: string }
  roundRobin?: ChessRoundRobin
  roundRobins?: { roundRobins: ChessRoundRobin[] }
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
  // The room's finished games, answered with history; any member.
  history: undefined
  // One of them move by move, answered with review: by archive id, or by
  // table and line on its score sheet (that table's newest such game).
  review: { archiveId: number } | { gameId: string; ordinal: number }
  // Publishes the room's games, or withdraws them. A game that ends while
  // published joins the public feed, /games/v2/chess.pgn, for 30 days;
  // withdrawing keeps the next games private, not the ones already out.
  // Every member hears published.
  publish: { published: boolean }
  // A round robin of 3 to 8 members, in pairing order, on terms whose
  // absent fields take a challenge's defaults; at most 16 in a room.
  createRoundRobin: { entrants: string[]; terms?: ChessMovePayloads['challenge'] }
  // The moderator voids an entrant's pairings still to play; refused
  // while they sit at a pairing's table.
  withdraw: { roundRobinId: string; playerId: string }
  // The moderator scores a pairing still to play, at no table, unplayed.
  forfeit: { roundRobinId: string; winner: string; loser: string }
  // The room's round robins, answered with roundRobins; any member.
  roundRobins: undefined
  // A table for the player's pairing with opponent, from no seat: only
  // the opponent fills it, and its one game is the pairing's result.
  playRoundRobin: { roundRobinId: string; opponent: string }
}

export type ChessMoveName = keyof ChessMovePayloads
