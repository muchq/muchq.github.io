import type { ChessRoundRobin, ChessStanding } from '@/apps/chess/wire'
import { clockLabel } from '@/apps/chess/rules'
import type { PongRoundRobin } from '@/apps/pong/wire'
import { variantLabel } from '@/apps/pong/wire'

// Round robins (MoonBase#1647) as the lobby reads them, chess's and
// pong's in one shape: what a player has still to play, who may moderate,
// and each pairing in a line.

export interface HeldPairing {
  round: number
  // Chess's white, pong's end 0.
  first: string
  second: string
  // Absent until decided: chess's score, or pong's winner.
  score?: string
  forfeit: boolean
  voided: boolean
  gameId?: string
}

export interface HeldRoundRobin {
  game: 'chess' | 'pong'
  roundRobinId: string
  creator: string
  entrants: string[]
  terms: string
  pairings: HeldPairing[]
  withdrawn: string[]
  standings: ChessStanding[]
}

const SCORE = { white: '1-0', black: '0-1', draw: '½-½' } as const

export const fromChess = (roundRobin: ChessRoundRobin): HeldRoundRobin => ({
  ...roundRobin,
  game: 'chess',
  terms: `${clockLabel(roundRobin.terms)} · ${roundRobin.terms.setupName}`,
  pairings: roundRobin.pairings.map(({ white, black, result, ...pairing }) => ({
    ...pairing,
    first: white,
    second: black,
    ...(result === undefined ? {} : { score: SCORE[result] })
  }))
})

export const fromPong = (roundRobin: PongRoundRobin): HeldRoundRobin => ({
  ...roundRobin,
  game: 'pong',
  terms: `Pong · ${variantLabel(roundRobin.variant)}`,
  pairings: roundRobin.pairings.map(({ winner, ...pairing }) => ({ ...pairing, ...(winner === undefined ? {} : { score: `${winner} won` }) }))
})

// The room's, chess's first: each game's once it has answered, so one
// game's silence hides nothing of the other's. Unknown until either has.
export const roomRoundRobins = (chess: ChessRoundRobin[] | null, pong: PongRoundRobin[] | null): HeldRoundRobin[] | null =>
  chess === null && pong === null ? null : [...(chess ?? []).map(fromChess), ...(pong ?? []).map(fromPong)]

export const stillToPlay = (pairing: HeldPairing): boolean => pairing.score === undefined && !pairing.voided

// Every pairing still the player's to play, in round order, and against
// whom: pairings are played whenever both players are free.
export const myOpenPairings = (roundRobin: HeldRoundRobin, me: string): Array<{ pairing: HeldPairing; opponent: string }> =>
  roundRobin.pairings
    .filter(pairing => stillToPlay(pairing) && (pairing.first === me || pairing.second === me))
    .map(pairing => ({ pairing, opponent: pairing.first === me ? pairing.second : pairing.first }))

// The creator moderates while in the room; while they are away, any
// entrant in it does, on what they aren't party to. The hub decides; this
// only says which controls to offer.
export const mayModerate = (roundRobin: HeldRoundRobin, me: string, present: readonly string[], parties: readonly string[]): boolean => {
  if (present.includes(roundRobin.creator)) return me === roundRobin.creator
  return roundRobin.entrants.includes(me) && !parties.includes(me)
}

export const pairingLine = (pairing: HeldPairing): string => {
  const pair = `${pairing.first} – ${pairing.second}`
  if (pairing.voided) return `${pair} · void`
  if (pairing.score !== undefined) return `${pair} · ${pairing.score}${pairing.forfeit ? ' by forfeit' : ''}`
  if (pairing.gameId !== undefined) return `${pair} · at table ${pairing.gameId}`
  return `${pair} · to play`
}
