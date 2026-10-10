import { describe, expect, it } from 'vitest'
import type { ChessPairing, ChessRoundRobin } from '../wire'
import { mayModerate, myOpenPairings, pairingLine, termsLine } from '../roundRobin'

const pairing = (over: Partial<ChessPairing> = {}): ChessPairing => ({
  round: 1,
  white: 'alice',
  black: 'bob',
  forfeit: false,
  voided: false,
  ...over
})

const roundRobin = (over: Partial<ChessRoundRobin> = {}): ChessRoundRobin => ({
  roundRobinId: 'E1',
  creator: 'alice',
  entrants: ['alice', 'bob', 'carol'],
  terms: { setupId: 'standard', setupName: 'Standard starting position', initialSeconds: 300, incrementSeconds: 3 },
  pairings: [
    pairing({ round: 1, white: 'bob', black: 'carol' }),
    pairing({ round: 2, white: 'carol', black: 'alice' }),
    pairing({ round: 3, white: 'alice', black: 'bob' })
  ],
  withdrawn: [],
  standings: [],
  ...over
})

describe('round robins', () => {
  // Pairings are played whenever both players are free, so a player is
  // offered every pairing still to play, with whom, in round order.
  it('offers a player each pairing still theirs to play, against whom', () => {
    const held = roundRobin({
      pairings: [
        pairing({ round: 1, white: 'alice', black: 'bob', result: 'draw' }),
        pairing({ round: 2, white: 'carol', black: 'alice', gameId: 'G7' }),
        pairing({ round: 3, white: 'alice', black: 'dave', voided: true }),
        pairing({ round: 4, white: 'erin', black: 'alice' }),
        pairing({ round: 4, white: 'bob', black: 'carol' })
      ]
    })
    expect(myOpenPairings(held, 'alice').map(({ opponent, pairing }) => [opponent, pairing.gameId])).toEqual([
      ['carol', 'G7'],
      ['erin', undefined]
    ])
    expect(myOpenPairings(held, 'stranger')).toEqual([])
  })

  // The creator moderates while in the room; while away, any entrant
  // in it does, on what they aren't party to.
  it('knows who moderates, and on whom', () => {
    const held = roundRobin()
    const everyone = ['alice', 'bob', 'carol', 'dave']
    expect(mayModerate(held, 'alice', everyone, ['bob', 'carol'])).toBe(true)
    expect(mayModerate(held, 'alice', everyone, ['alice'])).toBe(true)
    expect(mayModerate(held, 'bob', everyone, ['carol'])).toBe(false)
    const away = ['bob', 'carol', 'dave']
    expect(mayModerate(held, 'bob', away, ['carol', 'alice'])).toBe(true)
    expect(mayModerate(held, 'bob', away, ['bob', 'carol'])).toBe(false)
    expect(mayModerate(held, 'dave', away, ['carol', 'alice'])).toBe(false)
  })

  it('says how each pairing stands', () => {
    expect(pairingLine(pairing())).toBe('alice – bob · to play')
    expect(pairingLine(pairing({ gameId: 'G7' }))).toBe('alice – bob · at table G7')
    expect(pairingLine(pairing({ result: 'white' }))).toBe('alice – bob · 1-0')
    expect(pairingLine(pairing({ result: 'black', forfeit: true }))).toBe('alice – bob · 0-1 by forfeit')
    expect(pairingLine(pairing({ result: 'draw' }))).toBe('alice – bob · ½-½')
    expect(pairingLine(pairing({ voided: true }))).toBe('alice – bob · void')
  })

  it('says its terms as a clock and a setup', () => {
    expect(termsLine(roundRobin().terms)).toBe('5+3 · Standard starting position')
    expect(termsLine({ setupId: 'kpk', setupName: 'Random K+P vs K', initialSeconds: 90, incrementSeconds: 0 })).toBe('90s+0 · Random K+P vs K')
  })
})
