import { describe, expect, it } from 'vitest'
import { cuesFor, rungHertz } from '../sounds'
import type { WordchainRunner, WordchainView } from '../wire'

const alice = (over: Partial<WordchainRunner> = {}): WordchainRunner => ({ playerId: 'alice', words: 0, left: false, ladder: [], wins: 0, ...over })
const bob = (over: Partial<WordchainRunner> = {}): WordchainRunner => ({ playerId: 'bob', words: 0, left: false, wins: 0, ...over })

const view = (over: Partial<WordchainView> = {}): WordchainView => ({
  gameId: 'W1',
  phase: 'racing',
  start: 'cold',
  target: 'warm',
  par: 5,
  startedAtMs: 0,
  deadlineMs: 180_000,
  runners: [alice(), bob()],
  racesPlayed: 0,
  practice: false,
  ...over
})

const climbed = (ladder: string[], finished = false) => alice({ words: ladder.length, ladder, ...(finished ? { finishedAtMs: 1 } : {}) })

describe('cuesFor', () => {
  it('plays a rung for each word the viewer climbs, numbered by its step', () => {
    const one = view({ runners: [climbed(['cord']), bob()] })
    const two = view({ runners: [climbed(['cord', 'card']), bob()] })
    expect(cuesFor(view(), one, 'alice')).toEqual([{ kind: 'rung', step: 1 }])
    expect(cuesFor(one, two, 'alice')).toEqual([{ kind: 'rung', step: 2 }])
  })

  it('plays nothing for a view that changed nothing of the viewer’s', () => {
    const one = view({ runners: [climbed(['cord']), bob()] })
    expect(cuesFor(one, one, 'alice')).toEqual([])
    expect(cuesFor(undefined, one, 'alice')).toEqual([])
  })

  it('plays a take-back when the ladder shrinks', () => {
    const one = view({ runners: [climbed(['cord']), bob()] })
    expect(cuesFor(one, view(), 'alice')).toEqual([{ kind: 'takeBack' }])
  })

  it('plays a finish instead of a rung on reaching the target', () => {
    const near = view({ runners: [climbed(['cord', 'card', 'ward']), bob()] })
    const done = view({ runners: [climbed(['cord', 'card', 'ward', 'warm'], true), bob()] })
    expect(cuesFor(near, done, 'alice')).toEqual([{ kind: 'finish' }])
  })

  it('plays another runner’s climb, but not in a new race', () => {
    const before = view()
    const after = view({ runners: [alice(), bob({ words: 1 })] })
    expect(cuesFor(before, after, 'alice')).toEqual([{ kind: 'other' }])
    const next = view({ start: 'heat', target: 'cool', startedAtMs: 200_000, runners: [alice(), bob({ words: 1 })] })
    expect(cuesFor(view({ runners: [climbed(['cord', 'card']), bob({ words: 0 })] }), next, 'alice')).toEqual([])
  })

  it('plays nothing for a ladder reset by a new race', () => {
    const old = view({ phase: 'over', runners: [climbed(['cord', 'card']), bob()], result: { ending: 'timeout', winners: [], standings: [] } })
    const fresh = view({ start: 'heat', target: 'cool', startedAtMs: 200_000 })
    expect(cuesFor(old, fresh, 'alice')).toEqual([])
  })

  it('plays the result once, as a win, a shared win, a loss or a timeout', () => {
    const racing = view({ runners: [climbed(['cord']), bob()] })
    const ended = (winners: string[], ending: 'finished' | 'timeout' = 'finished') =>
      view({ phase: 'over', runners: [climbed(['cord']), bob()], result: { ending, winners, standings: [] } })
    expect(cuesFor(racing, ended(['alice']), 'alice')).toEqual([{ kind: 'win' }])
    expect(cuesFor(racing, ended(['alice', 'bob']), 'alice')).toEqual([{ kind: 'sharedWin' }])
    expect(cuesFor(racing, ended(['bob']), 'alice')).toEqual([{ kind: 'lose' }])
    expect(cuesFor(racing, ended([], 'timeout'), 'alice')).toEqual([{ kind: 'timeout' }])
    expect(cuesFor(ended(['alice']), ended(['alice']), 'alice')).toEqual([])
  })

  it('names no winner in practice: a finish, or time running out', () => {
    const racing = view({ practice: true, runners: [climbed(['cord', 'card', 'ward'])] })
    const done = view({
      practice: true,
      phase: 'over',
      runners: [climbed(['cord', 'card', 'ward', 'warm'], true)],
      result: { ending: 'finished', winners: ['alice'], standings: ['alice'] }
    })
    expect(cuesFor(racing, done, 'alice')).toEqual([{ kind: 'finish' }])
    const timedOut = view({ practice: true, phase: 'over', runners: [climbed(['cord'])], result: { ending: 'timeout', winners: [], standings: ['alice'] } })
    expect(cuesFor(view({ practice: true, runners: [climbed(['cord'])] }), timedOut, 'alice')).toEqual([{ kind: 'timeout' }])
  })
})

describe('rungHertz', () => {
  it('rises with every step', () => {
    const pitches = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rungHertz)
    for (let i = 1; i < pitches.length; ++i) expect(pitches[i]).toBeGreaterThan(pitches[i - 1])
  })
})
