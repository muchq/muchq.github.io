import { describe, expect, it } from 'vitest'
import { clockText, describePractice, describeResult, parSteps, quickStatus, steps } from '../../race'
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
  practice: false,
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

  it('says a practice race’s steps against par, or that time ran out', () => {
    const alone = (finished: boolean) =>
      view({ practice: true, runners: [{ playerId: 'alice', words: 3, left: false, wins: 0, ...(finished ? { finishedAtMs: 1 } : {}) }] })
    expect(describePractice(alone(true), 'alice')).toBe('Finished in 3 steps (par 4).')
    expect(describePractice(alone(false), 'alice')).toBe('Time ran out.')
    expect(describePractice({ ...alone(true), par: undefined }, 'alice')).toBe('Finished in 3 steps.')
  })

  it('counts the clock down in m:ss and stops at zero', () => {
    expect(clockText(180_000)).toBe('3:00')
    expect(clockText(61_001)).toBe('1:02')
    expect(clockText(999)).toBe('0:01')
    expect(clockText(-5)).toBe('0:00')
  })
})

// A quick race's table, as its status line reads it on this clock
// (MoonBase#1736): looking and for how long, expired, or counting down.
describe('quick race status', () => {
  const T0 = 1_700_000_000_000
  const seeking = (over: Partial<NonNullable<WordchainView['seek']>> = {}): WordchainView =>
    view({ phase: 'waiting', runners: [{ playerId: 'alice', words: 0, left: false, wins: 0 }], seek: { deadlineMs: T0 + 90_000, expired: false, ...over } })
  const matched = (startedAtMs = T0 + 3000): WordchainView =>
    view({ phase: 'racing', startedAtMs, deadlineMs: startedAtMs + 180_000 })

  it('looks until the hub’s deadline', () => {
    expect(quickStatus(seeking(), T0 + 17_500)).toEqual({ kind: 'looking', msLeft: 72_500 })
    expect(quickStatus(seeking(), T0 + 90_000)).toEqual({ kind: 'expired' })
    expect(quickStatus(seeking({ expired: true }), T0)).toEqual({ kind: 'expired' })
  })

  it('counts a matched race down to its first word', () => {
    expect(quickStatus(matched(), T0)).toEqual({ kind: 'starting', count: 3 })
    expect(quickStatus(matched(), T0 + 2001)).toEqual({ kind: 'starting', count: 1 })
    expect(quickStatus(matched(), T0 + 3000)).toBeNull()
  })

  // A room table, or a race already under way, has nothing to say.
  it('says nothing for a room table or a race under way', () => {
    expect(quickStatus(view({ phase: 'waiting' }), T0)).toBeNull()
    expect(quickStatus(view(), T0)).toBeNull()
  })
})
