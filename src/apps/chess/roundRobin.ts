import type { ChessPairing, ChessRoundRobin, ChessTerms } from './wire'
import { clockLabel } from './rules'

// Round robins (MoonBase#1647) as the lobby reads them: what a player
// has still to play, who may moderate, and each pairing in a line.

export const stillToPlay = (pairing: ChessPairing): boolean => pairing.result === undefined && !pairing.voided

// Every pairing still the player's to play, in round order, and against
// whom: pairings are played whenever both players are free.
export const myOpenPairings = (roundRobin: ChessRoundRobin, me: string): Array<{ pairing: ChessPairing; opponent: string }> =>
  roundRobin.pairings
    .filter(pairing => stillToPlay(pairing) && (pairing.white === me || pairing.black === me))
    .map(pairing => ({ pairing, opponent: pairing.white === me ? pairing.black : pairing.white }))

// The creator moderates while in the room; while they are away, any
// entrant in it does, on what they aren't party to. The hub decides; this
// only says which controls to offer.
export const mayModerate = (roundRobin: ChessRoundRobin, me: string, present: readonly string[], parties: readonly string[]): boolean => {
  if (present.includes(roundRobin.creator)) return me === roundRobin.creator
  return roundRobin.entrants.includes(me) && !parties.includes(me)
}

const SCORE = { white: '1-0', black: '0-1', draw: '½-½' } as const

export const pairingLine = (pairing: ChessPairing): string => {
  const pair = `${pairing.white} – ${pairing.black}`
  if (pairing.voided) return `${pair} · void`
  if (pairing.result !== undefined) return `${pair} · ${SCORE[pairing.result]}${pairing.forfeit ? ' by forfeit' : ''}`
  if (pairing.gameId !== undefined) return `${pair} · at table ${pairing.gameId}`
  return `${pair} · to play`
}

export const termsLine = (terms: ChessTerms): string => `${clockLabel(terms)} · ${terms.setupName}`
