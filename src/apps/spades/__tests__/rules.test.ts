import { describe, expect, it } from 'vitest'
import { bidWords, describeResult, isLegal, teamName } from '../rules'
import type { SpadesView } from '../wire'

const view = (over: Partial<SpadesView> = {}): SpadesView => ({
  gameId: 'S1',
  phase: 'playing',
  players: ['alice', 'bob', 'cat', 'dan'].map((playerId, seat) => ({ playerId, team: seat % 2, handCount: 13, hand: [], tricks: 0 })),
  handNumber: 1,
  trick: [],
  spadesBroken: false,
  legal: [],
  teams: [
    { players: ['alice', 'cat'], score: 0, bags: 0, gamesWon: 0 },
    { players: ['bob', 'dan'], score: 0, bags: 0, gamesWon: 0 }
  ],
  hands: [],
  ...over
})

describe('spades rules', () => {
  it('says a bid as it is played: nil is not zero tricks', () => {
    expect(bidWords(undefined)).toBe('to bid')
    expect(bidWords(0)).toBe('nil')
    expect(bidWords(1)).toBe('bid 1')
    expect(bidWords(13)).toBe('bid 13')
  })

  it('names a team from the viewer’s chair: yours is you and your partner', () => {
    expect(teamName(view(), 0, 'alice')).toBe('You & cat')
    expect(teamName(view(), 0, 'cat')).toBe('alice & you')
    expect(teamName(view(), 1, 'alice')).toBe('bob & dan')
    expect(teamName(view(), 1, 'eve')).toBe('bob & dan')
  })

  // Cutthroat: a team of one a seat.
  const cutthroat = view({
    mode: 'cutthroat',
    players: ['alice', 'bob', 'cat'].map((playerId, seat) => ({ playerId, team: seat, handCount: 17, hand: [], tricks: 0 }))
  })

  it('names a cutthroat team by its one seat', () => {
    expect(teamName(cutthroat, 1, 'alice')).toBe('bob')
    expect(teamName(cutthroat, 1, 'bob')).toBe('You')
  })

  // The winner's score, then the best of the rest.
  it('tells a cutthroat game’s end: one winner', () => {
    const won = { ending: 'points' as const, winners: ['bob'], scores: [300, 512, 120] }
    expect(describeResult(won, cutthroat, 'alice')).toBe('bob won, 512 to 300.')
    expect(describeResult(won, cutthroat, 'bob')).toBe('You won, 512 to 300.')
    const bust = { ending: 'points' as const, winners: ['cat'], scores: [-210, 90, 140] }
    expect(describeResult(bust, cutthroat, 'alice')).toBe('cat won, 140 to 90.')
  })

  it('a card is legal by its face, not its object', () => {
    const v = view({ legal: [{ rank: 'A', suit: '♠' }] })
    expect(isLegal(v, { rank: 'A', suit: '♠' })).toBe(true)
    expect(isLegal(v, { rank: 'A', suit: '♥' })).toBe(false)
    expect(isLegal(v, { rank: 'K', suit: '♠' })).toBe(false)
  })

  it('tells a game’s end from the viewer’s side of it', () => {
    const won = { ending: 'points' as const, winners: ['alice', 'cat'], scores: [520, 310] }
    expect(describeResult(won, view(), 'alice')).toBe('You and cat won, 520 to 310.')
    expect(describeResult(won, view(), 'bob')).toBe('alice and cat won, 520 to 310.')
    // The losing team's score first is its own side's reading: winners first.
    const theyWon = { ending: 'points' as const, winners: ['bob', 'dan'], scores: [-210, 140] }
    expect(describeResult(theyWon, view(), 'alice')).toBe('bob and dan won, 140 to -210.')
    expect(describeResult(theyWon, view(), 'dan')).toBe('You and bob won, 140 to -210.')
    const abandoned = { ending: 'abandoned' as const, winners: [], scores: [120, 80] }
    expect(describeResult(abandoned, view({ left: 'dan' }), 'alice')).toBe('dan left: the game was abandoned.')
    expect(describeResult(abandoned, view({ left: 'alice' }), 'alice')).toBe('You left: the game was abandoned.')
    expect(describeResult(abandoned, view(), 'alice')).toBe('The game was abandoned.')
  })
})
