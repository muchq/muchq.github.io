import { describe, expect, it } from 'vitest'
import {
  canCheck,
  canHint,
  canReveal,
  freshState,
  MIN_ATTEMPT,
  redoDelay,
  status,
  step,
  writingBlock,
  canRestart,
  normalize,
  attemptLength,
  nextDue,
  type Action,
  type ProblemState,
} from '../gate'
import type { Problem } from '../types'

const prove: Problem = {
  id: '9.9',
  kind: 'prove',
  title: 't',
  statement: 's',
  hints: ['h1', 'h2'],
  solution: 'sol',
  checks: ['c'],
}
const decide: Problem = { ...prove, id: '9.8', kind: 'decide', verdict: false }
const flaw: Problem = { ...prove, id: '9.7', kind: 'flaw', lines: ['a', 'b', 'c'], flawLine: 2 }

const long = (tag: string) => `${tag} `.padEnd(MIN_ATTEMPT, 'x')
const run = (p: Problem, actions: Action[], s: ProblemState = freshState()) =>
  actions.reduce((acc, a) => step(p, acc, a), s)
const DAY = 24 * 60 * 60 * 1000

describe('the attempt pays for every request', () => {
  it('refuses a hint for an attempt shorter than the minimum, and grants it at the minimum', () => {
    const short = run(prove, [{ type: 'edit', text: 'x'.repeat(MIN_ATTEMPT - 1) }])
    expect(writingBlock(short)).toBe('short')
    expect(canHint(prove, short)).toBe(false)
    expect(step(prove, short, { type: 'hint' })).toBe(short)

    const enough = run(prove, [{ type: 'edit', text: 'x'.repeat(MIN_ATTEMPT) }])
    expect(writingBlock(enough)).toBeNull()
    expect(step(prove, enough, { type: 'hint' }).hints).toBe(1)
  })

  it('does not count surrounding whitespace toward the minimum', () => {
    const padded = run(prove, [{ type: 'edit', text: `   ${'x'.repeat(MIN_ATTEMPT - 1)}\n\n\n` }])
    expect(writingBlock(padded)).toBe('short')
  })

  it('refuses a second hint until the attempt is revised, then grants it', () => {
    const one = run(prove, [{ type: 'edit', text: long('a') }, { type: 'hint' }])
    expect(one.hints).toBe(1)
    expect(writingBlock(one)).toBe('unrevised')
    expect(step(prove, one, { type: 'hint' })).toBe(one)
    const two = run(prove, [{ type: 'edit', text: long('b') }, { type: 'hint' }], one)
    expect(two.hints).toBe(2)
  })

  it('does not count whitespace as a revision', () => {
    const spent = run(prove, [{ type: 'edit', text: long('a') }, { type: 'hint' }])
    for (const text of [long('a') + ' ', ' ' + long('a'), long('a').replace(' ', '\n\n  ')]) {
      expect(writingBlock(step(prove, spent, { type: 'edit', text }))).toBe('unrevised')
    }
    // Control: one real character is a revision.
    expect(writingBlock(step(prove, spent, { type: 'edit', text: long('a') + 'y' }))).toBeNull()
  })

  it('does not count whitespace toward the minimum either', () => {
    const spaced = run(prove, [{ type: 'edit', text: 'x '.repeat(MIN_ATTEMPT / 2) + 'x' }])
    expect(writingBlock(spaced)).toBeNull()
    const gappy = run(prove, [{ type: 'edit', text: 'x' + ' '.repeat(MIN_ATTEMPT) + 'y' }])
    expect(writingBlock(gappy)).toBe('short')
  })

  it('treats editing back to the spent text as no revision at all', () => {
    const spent = run(prove, [{ type: 'edit', text: long('a') }, { type: 'hint' }])
    const back = run(prove, [{ type: 'edit', text: long('b') }, { type: 'edit', text: long('a') }], spent)
    expect(canHint(prove, back)).toBe(false)
  })

  it('stops handing out hints when they run out', () => {
    const all = run(prove, [
      { type: 'edit', text: long('a') },
      { type: 'hint' },
      { type: 'edit', text: long('b') },
      { type: 'hint' },
      { type: 'edit', text: long('c') },
    ])
    expect(all.hints).toBe(2)
    expect(canHint(prove, all)).toBe(false)
    expect(step(prove, all, { type: 'hint' })).toBe(all)
  })

  it('makes revealing the reference cost a revision too', () => {
    const hinted = run(prove, [{ type: 'edit', text: long('a') }, { type: 'hint' }])
    expect(canReveal(prove, hinted)).toBe(false)
    const revealed = run(prove, [{ type: 'edit', text: long('b') }, { type: 'reveal' }], hinted)
    expect(revealed.solution).toBe(true)
  })

  it('lets a prove problem reveal with no hints used', () => {
    const s = run(prove, [{ type: 'edit', text: long('a') }, { type: 'reveal' }])
    expect(s.solution).toBe(true)
    expect(s.hints).toBe(0)
  })
})

describe('prove or disprove', () => {
  const written = run(decide, [{ type: 'edit', text: long('a') }])

  it('cannot check without a committed verdict', () => {
    expect(canCheck(decide, written)).toBe(false)
    expect(step(decide, written, { type: 'check' })).toBe(written)
  })

  it('counts a wrong verdict as a miss, keeps the reference locked, and demands a revision before rechecking', () => {
    const wrong = run(decide, [{ type: 'pickVerdict', value: true }, { type: 'check' }], written)
    expect(wrong.misses).toBe(1)
    expect(wrong.confirmed).toBe(false)
    expect(canReveal(decide, wrong)).toBe(false)
    // Switching the verdict alone is free, but checking it is not.
    const flipped = step(decide, wrong, { type: 'pickVerdict', value: false })
    expect(canCheck(decide, flipped)).toBe(false)
    const revised = run(decide, [{ type: 'edit', text: long('b') }, { type: 'check' }], flipped)
    expect(revised.confirmed).toBe(true)
    expect(revised.misses).toBe(1)
  })

  it('locks the reference until the verdict is confirmed, then still asks for a revision', () => {
    const right = run(decide, [{ type: 'pickVerdict', value: false }, { type: 'check' }], written)
    expect(right.confirmed).toBe(true)
    expect(canReveal(decide, right)).toBe(false)
    expect(run(decide, [{ type: 'edit', text: long('b') }, { type: 'reveal' }], right).solution).toBe(true)
  })

  // Isolated from the revision rule: the attempt is fresh in every case, so
  // only the missing confirmation can be what refuses the reveal.
  it('refuses the reference to a fresh attempt until the verdict is confirmed', () => {
    expect(writingBlock(written)).toBeNull()
    expect(canReveal(decide, written)).toBe(false)
    expect(step(decide, written, { type: 'reveal' })).toBe(written)
    const missedThenRevised = run(
      decide,
      [{ type: 'pickVerdict', value: true }, { type: 'check' }, { type: 'edit', text: long('b') }],
      written
    )
    expect(writingBlock(missedThenRevised)).toBeNull()
    expect(canReveal(decide, missedThenRevised)).toBe(false)
    // Control: the same fresh attempt on a prove problem may reveal.
    expect(canReveal(prove, written)).toBe(true)
  })

  it('freezes the verdict once it is confirmed', () => {
    const right = run(decide, [{ type: 'pickVerdict', value: false }, { type: 'check' }], written)
    expect(step(decide, right, { type: 'pickVerdict', value: true })).toBe(right)
  })

  it('ignores line picks on a problem that has no lines', () => {
    expect(step(decide, written, { type: 'pickLine', line: 1 })).toBe(written)
  })
})

describe('find the flaw', () => {
  const written = run(flaw, [{ type: 'edit', text: long('a') }])

  it('accepts only lines that exist', () => {
    for (const line of [0, 4, 1.5, -1]) expect(step(flaw, written, { type: 'pickLine', line })).toBe(written)
    expect(step(flaw, written, { type: 'pickLine', line: 3 }).line).toBe(3)
  })

  it('misses on a sound line and confirms the flawed one', () => {
    const miss = run(flaw, [{ type: 'pickLine', line: 1 }, { type: 'check' }], written)
    expect(miss.misses).toBe(1)
    expect(canReveal(flaw, miss)).toBe(false)
    const hit = run(flaw, [{ type: 'pickLine', line: 2 }, { type: 'edit', text: long('b') }, { type: 'check' }], miss)
    expect(hit.confirmed).toBe(true)
  })

  it('ignores verdict picks', () => {
    expect(step(flaw, written, { type: 'pickVerdict', value: true })).toBe(written)
  })

  it('has nothing to check on a prove problem', () => {
    const s = run(prove, [{ type: 'edit', text: long('a') }])
    expect(canCheck(prove, s)).toBe(false)
  })
})

describe('after the reference', () => {
  const revealed = run(prove, [{ type: 'edit', text: long('a') }, { type: 'hint' }, { type: 'edit', text: long('b') }, { type: 'reveal' }])

  it('freezes the attempt, so the grade is of what was written before looking', () => {
    expect(step(prove, revealed, { type: 'edit', text: long('c') })).toBe(revealed)
  })

  it('refuses a grade before the reference is out', () => {
    const s = run(prove, [{ type: 'edit', text: long('a') }])
    expect(step(prove, s, { type: 'grade', grade: 'complete', now: 0 })).toBe(s)
  })

  it('records a grade once, with the hints used, and schedules the redo', () => {
    const graded = step(prove, revealed, { type: 'grade', grade: 'complete', now: 1000 })
    expect(graded.grade).toBe('complete')
    expect(graded.history).toEqual([{ at: 1000, grade: 'complete', hints: 1, misses: 0 }])
    expect(graded.redoAt).toBe(1000 + 7 * DAY)
    expect(step(prove, graded, { type: 'grade', grade: 'wrong', now: 2000 })).toBe(graded)
  })

  it('starts over from a blank page once the redo is due, keeping the history and the debt', () => {
    const graded = step(prove, revealed, { type: 'grade', grade: 'gap', now: 1000 })
    const due = 1000 + 3 * DAY
    const again = step(prove, graded, { type: 'restart', now: due })
    expect(again).toEqual({ ...freshState(), history: graded.history, redoAt: due })
    expect(canHint(prove, again)).toBe(false)
  })

  // Retyping a proof read a minute ago is recall, not the test.
  it('refuses to restart while a redo is owed and not yet due', () => {
    const graded = step(prove, revealed, { type: 'grade', grade: 'wrong', now: 1000 })
    expect(canRestart(graded, 1000 + DAY - 1)).toBe(false)
    expect(step(prove, graded, { type: 'restart', now: 1000 + DAY - 1 })).toBe(graded)
    expect(canRestart(graded, 1000 + DAY)).toBe(true)
  })

  it('lets an unaided, complete solution be practised again at any time', () => {
    const solved = run(prove, [{ type: 'edit', text: long('a') }, { type: 'reveal' }, { type: 'grade', grade: 'complete', now: 1000 }])
    expect(solved.redoAt).toBeNull()
    expect(step(prove, solved, { type: 'restart', now: 1001 }).grade).toBeNull()
  })

  it('refuses to restart an ungraded attempt', () => {
    expect(canRestart(revealed, 10 * DAY)).toBe(false)
    expect(step(prove, revealed, { type: 'restart', now: 10 * DAY })).toBe(revealed)
  })

  it('schedules the next redo from the grade of the redo itself', () => {
    const graded = step(prove, revealed, { type: 'grade', grade: 'gap', now: 0 })
    const redo = run(
      prove,
      [{ type: 'restart', now: 3 * DAY }, { type: 'edit', text: long('redo') }, { type: 'reveal' }, { type: 'grade', grade: 'complete', now: 4 * DAY }],
      graded
    )
    expect(redo.redoAt).toBeNull()
    expect(status(redo, 100 * DAY)).toBe('solved')
    expect(redo.history.map(h => h.grade)).toEqual(['gap', 'complete'])
  })
})

describe('redo scheduling', () => {
  it('owes no redo for a complete, unaided solution', () => {
    expect(redoDelay('complete', 0, 0)).toBeNull()
  })

  it('brings back help-assisted, gappy and wrong work, the worse sooner', () => {
    expect(redoDelay('complete', 1, 0)).toBe(7 * DAY)
    expect(redoDelay('complete', 0, 1)).toBe(7 * DAY)
    expect(redoDelay('gap', 0, 0)).toBe(3 * DAY)
    expect(redoDelay('wrong', 0, 0)).toBe(1 * DAY)
  })
})

describe('status', () => {
  const graded = (grade: 'complete' | 'gap', hints: number) => {
    let s = run(prove, [{ type: 'edit', text: long('a') }])
    for (let i = 0; i < hints; i++) s = run(prove, [{ type: 'edit', text: long(`h${i}`) }, { type: 'hint' }], s)
    s = run(prove, [{ type: 'edit', text: long('z') }, { type: 'reveal' }, { type: 'grade', grade, now: 0 }], s)
    return s
  }

  it('is new until something is written or picked', () => {
    expect(status(undefined, 0)).toBe('new')
    expect(status(freshState(), 0)).toBe('new')
    expect(status(run(prove, [{ type: 'edit', text: '  ' }]), 0)).toBe('new')
    expect(status(run(prove, [{ type: 'edit', text: 'a' }]), 0)).toBe('working')
    expect(status(step(decide, freshState(), { type: 'pickVerdict', value: true }), 0)).toBe('working')
  })

  it('keeps a restarted-but-abandoned redo due, and a voluntary restart in progress', () => {
    const abandoned = step(prove, graded('gap', 0), { type: 'restart', now: 3 * DAY })
    expect(status(abandoned, 3 * DAY)).toBe('due')
    const practice = step(prove, graded('complete', 0), { type: 'restart', now: 0 })
    expect(status(practice, 100 * DAY)).toBe('working')
  })

  it('is solved for good after a complete unaided grade', () => {
    expect(status(graded('complete', 0), 10_000 * DAY)).toBe('solved')
  })

  it('is solved until a help-assisted redo comes due, then due', () => {
    const s = graded('complete', 1)
    expect(status(s, 7 * DAY - 1)).toBe('solved')
    expect(status(s, 7 * DAY)).toBe('due')
  })

  it('is shaky after a gap until the redo comes due', () => {
    const s = graded('gap', 0)
    expect(status(s, 3 * DAY - 1)).toBe('shaky')
    expect(status(s, 3 * DAY)).toBe('due')
  })
})

describe('normalize', () => {
  const graded = { ...freshState(), attempt: 'x', solution: true, history: [{ at: 50, grade: 'gap' as const, hints: 0, misses: 0 }] }

  it('returns a consistent state untouched, as the same object', () => {
    const s = run(decide, [{ type: 'edit', text: long('a') }, { type: 'pickVerdict', value: false }, { type: 'check' }])
    expect(normalize(decide, s)).toBe(s)
    const fresh = freshState()
    expect(normalize(prove, fresh)).toBe(fresh)
  })

  it('withdraws a confirmation the pick does not earn, and keeps one it does', () => {
    expect(normalize(decide, { ...freshState(), confirmed: true }).confirmed).toBe(false)
    expect(normalize(decide, { ...freshState(), verdict: true, confirmed: true }).confirmed).toBe(false)
    expect(normalize(decide, { ...freshState(), verdict: false, confirmed: true }).confirmed).toBe(true)
    expect(normalize(flaw, { ...freshState(), line: 3, confirmed: true }).confirmed).toBe(false)
    expect(normalize(flaw, { ...freshState(), line: 2, confirmed: true }).confirmed).toBe(true)
    expect(normalize(prove, { ...freshState(), confirmed: true }).confirmed).toBe(false)
  })

  it('drops picks a problem cannot have', () => {
    expect(normalize(prove, { ...freshState(), verdict: true, line: 2 })).toMatchObject({ verdict: null, line: null })
    expect(normalize(flaw, { ...freshState(), line: 4 }).line).toBeNull()
    expect(normalize(flaw, { ...freshState(), line: 3 }).line).toBe(3)
  })

  it('caps hints at what the problem has', () => {
    expect(normalize(prove, { ...freshState(), hints: 9 }).hints).toBe(2)
    expect(normalize(prove, { ...freshState(), hints: 2 }).hints).toBe(2)
  })

  it('restores the due date a grade owes, from when it was graded', () => {
    expect(normalize(prove, { ...graded, grade: 'gap', redoAt: null }).redoAt).toBe(50 + 3 * DAY)
    expect(normalize(prove, { ...graded, grade: 'complete', redoAt: null }).redoAt).toBeNull()
  })
})

describe('attemptLength', () => {
  it('counts what the gate counts: words, not runs of whitespace', () => {
    expect(attemptLength(run(prove, [{ type: 'edit', text: '  a   b\n\n c  ' }]))).toBe(5)
    expect(attemptLength(freshState())).toBe(0)
  })
})

describe('nextDue', () => {
  const owed = (redoAt: number | null) => ({ ...freshState(), redoAt })

  it('is the earliest redo still in the future', () => {
    expect(nextDue([owed(50), owed(30), owed(10), owed(null)], 20)).toBe(30)
  })

  it('is null when nothing is owed later', () => {
    expect(nextDue([owed(10), owed(null)], 20)).toBeNull()
    expect(nextDue([], 0)).toBeNull()
  })
})
