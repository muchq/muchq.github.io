// Go's vocabulary on the room stream, following chess's envelope. Go
// hides nothing, so every seat gets the same view.

export type GoColor = 'black' | 'white'

// scoring: both passed, and the seats mark dead stones and accept; ended:
// a game is over and the table waits on the next; closed: a seat left
// the table.
export type GoPhase = 'waiting' | 'playing' | 'scoring' | 'ended' | 'closed'

export type GoEnding = 'score' | 'resignation' | 'timeout' | 'abandoned'

export type GoBoardSize = 9 | 13 | 19

export interface GoPlayer {
  playerId: string
  // Absent while waiting.
  color?: GoColor
}

// Each side's time left as of the moment the hub built the view; the
// side to move's is running from there.
export interface GoClock {
  blackMs: number
  whiteMs: number
  initialMs: number
  incrementMs: number
}

export interface GoCount {
  black: number
  white: number
}

// The point played, or absent coordinates for a pass.
export interface GoLastMove {
  color: GoColor
  pass: boolean
  x?: number
  y?: number
}

export interface GoPoint {
  x: number
  y: number
}

// The count if the marks were accepted now, and who accepts them.
export interface GoScoring {
  acceptedBy: string[]
  score: GoCount
}

// Scores include komi and count dead stones as empty; present when the
// game was counted.
export interface GoResult {
  winner?: string
  winnerColor?: GoColor
  ending: GoEnding
  score?: GoCount
}

export interface GoScoreLine {
  winner?: string
  ending: GoEnding
}

// A challenge's terms, the hub's defaults filled in.
export interface GoTerms {
  size: GoBoardSize
  komi: number
  initialSeconds: number
  incrementSeconds: number
}

export interface GoView {
  gameId: string
  phase: GoPhase
  players: GoPlayer[]
  // The posted challenge, while the table waits on it.
  terms?: GoTerms
  // Absent while waiting.
  size?: GoBoardSize
  // One string per row from the top, one character per point: '.', 'b' or 'w'.
  board?: string[]
  // Stones each color has captured.
  captures?: GoCount
  sideToMove?: GoColor
  currentPlayerId?: string
  clock?: GoClock
  lastMove?: GoLastMove
  komi?: number
  result?: GoResult
  // Stones marked dead; absent when none are.
  dead?: GoPoint[]
  // Present only while scoring.
  scoring?: GoScoring
  moveCount: number
  scoreSheet: GoScoreLine[]
}

// The go update union's JSON encoding: exactly one member present.
export interface GoUpdate {
  gameJoined?: { view: GoView }
  gameState?: { view: GoView }
  gameCreated?: { gameId: string; createdBy?: string }
  gameStarted?: Record<string, never>
  turnChanged?: { playerId: string }
  gameEnded?: { result: GoResult }
  gameLeft?: { gameId: string }
}

export interface GoMovePayloads {
  createGame: undefined
  joinGame: { gameId: string }
  // Absent fields use the hub's defaults.
  startGame: { size?: GoBoardSize; komi?: number; initialSeconds?: number; incrementSeconds?: number }
  leaveGame: undefined
  // x is the column from the left, y the row from the top, both from 0.
  play: { x: number; y: number }
  pass: undefined
  resign: undefined
  watch: { gameId: string }
  // In the scoring, either seat: the group at the point dead, or alive
  // again. Withdraws both acceptances.
  markDead: { x: number; y: number }
  accept: undefined
  // A lone seat's terms for whoever joins to start on; posting again
  // replaces them.
  challenge: GoMovePayloads['startGame']
}

export type GoMoveName = keyof GoMovePayloads
