import { describe, expect, it } from 'vitest'
import { clockText, describeResult, parSteps, steps } from '../../race'
import type { WordchainView } from '../../wire'

const view = (over: Partial<WordchainView> = {}): WordchainView => ({
  gameId: 'W1',
  phase: 'over',
  par: 5,
  runners: [
    { playerId: 'alice', words: 4, left: false, wins: 1 },
    { playerId: 'bob', words: 4, left: false, wins: 1 },
    { playerId: 'cat', words: 2, left: false, wins: 0 }
  ],
  racesPlayed: 1,
  ...over
})

describe('race words', () => {
  // The hub's par counts both ends; a runner's words count neither start
  // nor anything before it, so a finish on par is par - 1 steps.
  it('says par in the steps a runner counts', () => {
    expect(parSteps(view())).toBe(4)
    expect(parSteps(view({ par: undefined }))).toBeUndefined()
    expect(steps(1)).toBe('1 step')
    expect(steps(4)).toBe('4 steps')
  })

  it('names the winner, a shared win, and a race nobody finished', () => {
    const v = view()
    expect(describeResult({ ending: 'finished', winners: ['alice'], standings: [] }, v, 'alice')).toBe('You won in 4 steps.')
    expect(describeResult({ ending: 'finished', winners: ['bob'], standings: [] }, v, 'alice')).toBe('bob won in 4 steps.')
    expect(describeResult({ ending: 'timeout', winners: ['alice', 'bob'], standings: [] }, v, 'cat')).toBe(
      'Time ran out: alice and bob share the win in 4 steps.'
    )
    expect(describeResult({ ending: 'finished', winners: ['alice', 'bob'], standings: [] }, v, 'alice')).toBe('You and bob share the win in 4 steps.')
    expect(describeResult({ ending: 'leave', winners: [], standings: [] }, v, 'cat')).toBe('Too few seats stayed: nobody finished.')
  })

  it('counts the clock down in m:ss and stops at zero', () => {
    expect(clockText(180_000)).toBe('3:00')
    expect(clockText(61_001)).toBe('1:02')
    expect(clockText(999)).toBe('0:01')
    expect(clockText(-5)).toBe('0:00')
  })
})
