// The word ladder race's vocabulary on the room stream (MoonBase#1719),
// mirroring model/wordchain.smithy. Two to four seats climb the same
// puzzle against one clock, each on their own ladder; while a race runs a
// seat sees its own ladder and only everyone else's word count.

// over: between races; closed: too few seats remain.
export type WordchainPhase = 'waiting' | 'racing' | 'over' | 'closed'

// finished: every seat finished, or one did on par; timeout: the clock ran
// out; leave: too few seats stayed.
export type WordchainEnding = 'finished' | 'timeout' | 'leave'

export interface WordchainResult {
  ending: WordchainEnding
  // The fewest words, then the earliest finish; several share a win,
  // none when nobody finished.
  winners: string[]
  // Finishers best first, then everyone else in the order they joined.
  standings: string[]
}

export interface WordchainRunner {
  playerId: string
  // Rungs climbed, the target among them once finished.
  words: number
  finishedAtMs?: number
  // Left the table; their ladder and any finish still count.
  left: boolean
  // The rungs after the start: the viewer's own always, everyone's once
  // the race is over.
  ladder?: string[]
  // Races won at this table.
  wins: number
}

export interface WordchainView {
  gameId: string
  phase: WordchainPhase
  // The puzzle and its clock (epoch ms); absent while waiting. par counts
  // a shortest ladder's words, both ends included.
  start?: string
  target?: string
  par?: number
  startedAtMs?: number
  deadlineMs?: number
  lexicon?: string
  // In the order they joined.
  runners: WordchainRunner[]
  result?: WordchainResult
  racesPlayed: number
}

export interface WordchainUpdate {
  gameJoined?: { view: WordchainView }
  gameState?: { view: WordchainView }
  gameCreated?: { gameId: string; createdBy: string }
  gameStarted?: Record<string, never>
  gameEnded?: { result: WordchainResult }
  gameLeft?: { gameId: string }
}

export type WordchainLetters = 3 | 4 | 5

export interface WordchainMovePayloads {
  createGame: undefined
  joinGame: { gameId: string }
  // The first race once two are seated, and each next once the last is
  // over; absent fields take 4 letters and 180 seconds.
  startGame: { letters?: WordchainLetters; seconds?: number }
  leaveGame: undefined
  play: { word: string }
  // Takes back the sender's last rung, until they finish.
  retract: undefined
}

export type WordchainMoveName = keyof WordchainMovePayloads
