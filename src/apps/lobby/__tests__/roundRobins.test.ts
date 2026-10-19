import { describe, expect, it } from 'vitest'
import type { ChessPairing, ChessRoundRobin } from '@/apps/chess/wire'
import type { GoRoundRobin } from '@/apps/go/wire'
import type { PongRoundRobin } from '@/apps/pong/wire'
import { fromChess, fromGo, fromPong, mayModerate, myOpenPairings, pairingLine, roomRoundRobins, type HeldPairing, type HeldRoundRobin } from '../roundRobins'

const pairing = (over: Partial<HeldPairing> = {}): HeldPairing => ({
  round: 1,
  first: 'alice',
  second: 'bob',
  forfeit: false,
  voided: false,
  ...over
})

const held = (over: Partial<HeldRoundRobin> = {}): HeldRoundRobin => ({
  game: 'chess',
  roundRobinId: 'E1',
  creator: 'alice',
  entrants: ['alice', 'bob', 'carol'],
  terms: '5+3 · Standard starting position',
  pairings: [],
  withdrawn: [],
  standings: [],
  ...over
})

const chessPairing = (over: Partial<ChessPairing> = {}): ChessPairing => ({
  round: 1,
  white: 'alice',
  black: 'bob',
  forfeit: false,
  voided: false,
  ...over
})

const chess = (over: Partial<ChessRoundRobin> = {}): ChessRoundRobin => ({
  roundRobinId: 'E1',
  creator: 'alice',
  entrants: ['alice', 'bob', 'carol'],
  terms: { setupId: 'standard', setupName: 'Standard starting position', initialSeconds: 300, incrementSeconds: 3 },
  pairings: [],
  withdrawn: [],
  standings: [],
  ...over
})

const pong = (over: Partial<PongRoundRobin> = {}): PongRoundRobin => ({
  roundRobinId: 'P1',
  creator: 'bob',
  entrants: ['alice', 'bob', 'carol'],
  variant: '3d',
  pairings: [],
  withdrawn: [],
  standings: [],
  ...over
})

const go = (over: Partial<GoRoundRobin> = {}): GoRoundRobin => ({
  roundRobinId: 'G1',
  creator: 'carol',
  entrants: ['alice', 'bob', 'carol'],
  terms: { size: 13, komi: 6.5, initialSeconds: 300, incrementSeconds: 3 },
  pairings: [],
  withdrawn: [],
  standings: [],
  ...over
})

describe('round robins', () => {
  // Pairings are played whenever both players are free, so a player is
  // offered every pairing still to play, with whom, in round order.
  it('offers a player each pairing still theirs to play, against whom', () => {
    const pairings = [
      pairing({ round: 1, first: 'alice', second: 'bob', score: '½-½' }),
      pairing({ round: 2, first: 'carol', second: 'alice', gameId: 'G7' }),
      pairing({ round: 3, first: 'alice', second: 'dave', voided: true }),
      pairing({ round: 4, first: 'erin', second: 'alice' }),
      pairing({ round: 4, first: 'bob', second: 'carol' })
    ]
    expect(myOpenPairings(held({ pairings }), 'alice').map(({ opponent, pairing }) => [opponent, pairing.gameId])).toEqual([
      ['carol', 'G7'],
      ['erin', undefined]
    ])
    expect(myOpenPairings(held({ pairings }), 'stranger')).toEqual([])
  })

  // The creator moderates while in the room; while away, any entrant
  // in it does, on what they aren't party to.
  it('knows who moderates, and on whom', () => {
    const everyone = ['alice', 'bob', 'carol', 'dave']
    expect(mayModerate(held(), 'alice', everyone, ['bob', 'carol'])).toBe(true)
    expect(mayModerate(held(), 'alice', everyone, ['alice'])).toBe(true)
    expect(mayModerate(held(), 'bob', everyone, ['carol'])).toBe(false)
    const away = ['bob', 'carol', 'dave']
    expect(mayModerate(held(), 'bob', away, ['carol', 'alice'])).toBe(true)
    expect(mayModerate(held(), 'bob', away, ['bob', 'carol'])).toBe(false)
    expect(mayModerate(held(), 'dave', away, ['carol', 'alice'])).toBe(false)
  })

  it('says how each pairing stands', () => {
    expect(pairingLine(pairing())).toBe('alice – bob · to play')
    expect(pairingLine(pairing({ gameId: 'G7' }))).toBe('alice – bob · at table G7')
    expect(pairingLine(pairing({ score: '0-1', forfeit: true }))).toBe('alice – bob · 0-1 by forfeit')
    expect(pairingLine(pairing({ voided: true }))).toBe('alice – bob · void')
  })

  it('reads a chess round robin: white first, its result as a score, its terms as a clock and a setup', () => {
    const read = fromChess(
      chess({
        pairings: [
          chessPairing({ result: 'white' }),
          chessPairing({ round: 2, white: 'bob', black: 'carol', result: 'draw' }),
          chessPairing({ round: 3, white: 'carol', black: 'alice', result: 'black' })
        ]
      })
    )
    expect(read.game).toBe('chess')
    expect(read.terms).toBe('5+3 · Standard starting position')
    expect(read.pairings.map(pairingLine)).toEqual(['alice – bob · 1-0', 'bob – carol · ½-½', 'carol – alice · 0-1'])
    expect(fromChess(chess({ terms: { setupId: 'kpk', setupName: 'Random K+P vs K', initialSeconds: 90, incrementSeconds: 0 } })).terms).toBe(
      '90s+0 · Random K+P vs K'
    )
  })

  // Pong has no draws: a pairing's result is who won it.
  it('reads a pong round robin: its result the winner, its terms the variant', () => {
    const read = fromPong(pong({ pairings: [{ round: 1, first: 'alice', second: 'bob', winner: 'bob', forfeit: false, voided: false }] }))
    expect(read.game).toBe('pong')
    expect(read.terms).toBe('Pong · 3D')
    expect(read.pairings.map(pairingLine)).toEqual(['alice – bob · bob won'])
  })

  // Black moves first in go, so it is named first, and a score reads from
  // Black's side.
  it('reads a go round robin: black first, its result as a score from black’s side, its terms the board, komi and clock', () => {
    const read = fromGo(
      go({
        pairings: [
          chessPairing({ white: 'alice', black: 'bob', result: 'black' }),
          chessPairing({ round: 2, white: 'bob', black: 'carol', result: 'draw' }),
          chessPairing({ round: 3, white: 'carol', black: 'alice', result: 'white' })
        ]
      })
    )
    expect(read.game).toBe('go')
    expect(read.terms).toBe('Go · 13×13 · komi 6.5 · 5+3')
    expect(read.pairings.map(pairingLine)).toEqual(['bob – alice · 1-0', 'carol – bob · ½-½', 'alice – carol · 0-1'])
  })

  // One list for the room, chess first: each game's as soon as it answers,
  // so one game's silence hides nothing of the other's.
  it('lists the room’s round robins of each game that has answered', () => {
    expect(roomRoundRobins(null, null)).toBeNull()
    expect(roomRoundRobins(null, [pong()])?.map(entry => entry.roundRobinId)).toEqual(['P1'])
    expect(roomRoundRobins([chess()], null)?.map(entry => entry.roundRobinId)).toEqual(['E1'])
    expect(roomRoundRobins([chess()], [pong()])?.map(entry => [entry.game, entry.roundRobinId])).toEqual([
      ['chess', 'E1'],
      ['pong', 'P1']
    ])
    expect(roomRoundRobins(null, null, [go()])?.map(entry => [entry.game, entry.roundRobinId])).toEqual([['go', 'G1']])
    expect(roomRoundRobins([chess()], [pong()], [go()])?.map(entry => entry.game)).toEqual(['chess', 'pong', 'go'])
  })
})
