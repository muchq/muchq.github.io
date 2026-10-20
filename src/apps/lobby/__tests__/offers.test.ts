import { describe, expect, it } from 'vitest'
import type { ChessPairing, ChessRoundRobin } from '@/apps/chess/wire'
import type { GoRoundRobin } from '@/apps/go/wire'
import type { PongRoundRobin } from '@/apps/pong/wire'
import type { HubGameSummary } from '@/utils/hubStream'
import { offerFor, pairingAt } from '../offers'

const pairing = (over: Partial<ChessPairing> = {}): ChessPairing => ({
  round: 1,
  white: 'alice',
  black: 'bob',
  forfeit: false,
  voided: false,
  gameId: 'T1',
  ...over
})

const shared = { creator: 'alice', entrants: ['alice', 'bob', 'carol'], withdrawn: [], standings: [] }

const lobby = (over: { chess?: ChessRoundRobin[] | null; pong?: PongRoundRobin[] | null; go?: GoRoundRobin[] | null } = {}) => ({
  playerId: 'carol',
  chess: { roundRobins: over.chess ?? null },
  pong: { roundRobins: over.pong ?? null },
  go: { roundRobins: over.go ?? null }
})

const table = (game: HubGameSummary['game'], gameId = 'T1'): HubGameSummary => ({ gameId, game, status: 'waiting', playerCount: 1 })

const chess = (pairings: ChessPairing[]): ChessRoundRobin => ({
  ...shared,
  roundRobinId: 'E1',
  terms: { setupId: 'standard', setupName: 'Standard', initialSeconds: 300, incrementSeconds: 3 },
  pairings
})

const go = (pairings: ChessPairing[]): GoRoundRobin => ({
  ...shared,
  roundRobinId: 'G1',
  terms: { size: 9, komi: 6.5, initialSeconds: 600, incrementSeconds: 5 },
  pairings
})

const pong = (): PongRoundRobin => ({
  ...shared,
  roundRobinId: 'P1',
  variant: '3d',
  pairings: [{ round: 1, first: 'alice', second: 'bob', forfeit: false, voided: false, gameId: 'T1' }]
})

describe('pairingAt', () => {
  // Each game names its pair as the lobby reads it: chess's white first,
  // pong's end 0, go's black.
  it('names the pair a table seats, first as each game names it', () => {
    expect(pairingAt(lobby({ chess: [chess([pairing()])] }), table('chess'))).toEqual(['alice', 'bob'])
    expect(pairingAt(lobby({ pong: [pong()] }), table('pong'))).toEqual(['alice', 'bob'])
    expect(pairingAt(lobby({ go: [go([pairing()])] }), table('go'))).toEqual(['bob', 'alice'])
  })

  // A round robin's id and a table's are each game's own: another game's
  // pairing at the same id seats nothing here.
  it('reads only the table’s own game’s round robins', () => {
    expect(pairingAt(lobby({ chess: [chess([pairing()])] }), table('go'))).toBeUndefined()
    expect(pairingAt(lobby({ go: [go([pairing()])] }), table('chess'))).toBeUndefined()
    expect(pairingAt(lobby({ go: [go([pairing()])] }), table('go', 'T2'))).toBeUndefined()
    expect(pairingAt(lobby(), table('go'))).toBeUndefined()
  })
})

describe('offerFor', () => {
  it('closes a go pairing’s table to all but its pair', () => {
    expect(offerFor(lobby({ go: [go([pairing()])] }), table('go')).open).toBe(false)
    expect(offerFor({ ...lobby({ go: [go([pairing()])] }), playerId: 'bob' }, table('go')).open).toBe(true)
    expect(offerFor(lobby(), table('go')).open).toBe(true)
  })
})
