// The one rule that makes this path different from reading a book: every
// request for information — a hint, a verdict or flaw check, the reference
// proof — costs a revision of the written attempt. A request is honoured only
// when the attempt is long enough to be an attempt and has changed since the
// last request. Being stuck counts, if you write down where and why.
//
// Pure functions over plain data, so the page and the tests drive the same
// rules. `step` returns the input state unchanged when an action is refused.
import type { Problem } from './types'

export const MIN_ATTEMPT = 40

export type Grade = 'complete' | 'gap' | 'wrong'

export interface PastAttempt {
  at: number
  grade: Grade
  hints: number
  misses: number
}

export interface ProblemState {
  attempt: string
  /** The attempt as it stood at the last request; null before any. */
  spentOn: string | null
  hints: number
  /** decide: the verdict the student has committed to. */
  verdict: boolean | null
  /** flaw: the line the student has picked (1-based). */
  line: number | null
  /** decide/flaw: the pick has been checked and is right. */
  confirmed: boolean
  /** Wrong checks on this attempt. */
  misses: number
  solution: boolean
  grade: Grade | null
  /** When a redo from a blank page comes due; null when none is owed. */
  redoAt: number | null
  history: PastAttempt[]
}

export const freshState = (history: PastAttempt[] = []): ProblemState => ({
  attempt: '',
  spentOn: null,
  hints: 0,
  verdict: null,
  line: null,
  confirmed: false,
  misses: 0,
  solution: false,
  grade: null,
  redoAt: null,
  history,
})

/** Why the attempt cannot pay for a request right now, if it cannot. */
export type WritingBlock = 'short' | 'unrevised'

export function writingBlock(s: ProblemState): WritingBlock | null {
  if (s.attempt.trim().length < MIN_ATTEMPT) return 'short'
  if (s.spentOn !== null && s.attempt === s.spentOn) return 'unrevised'
  return null
}

export function canHint(p: Problem, s: ProblemState): boolean {
  return !s.solution && s.hints < p.hints.length && writingBlock(s) === null
}

const hasPick = (p: Problem, s: ProblemState) =>
  p.kind === 'decide' ? s.verdict !== null : p.kind === 'flaw' ? s.line !== null : false

export function canCheck(p: Problem, s: ProblemState): boolean {
  return p.kind !== 'prove' && !s.confirmed && hasPick(p, s) && writingBlock(s) === null
}

export function canReveal(p: Problem, s: ProblemState): boolean {
  return !s.solution && (p.kind === 'prove' || s.confirmed) && writingBlock(s) === null
}

export type Action =
  | { type: 'edit'; text: string }
  | { type: 'hint' }
  | { type: 'pickVerdict'; value: boolean }
  | { type: 'pickLine'; line: number }
  | { type: 'check' }
  | { type: 'reveal' }
  | { type: 'grade'; grade: Grade; now: number }
  | { type: 'restart' }

const DAY = 24 * 60 * 60 * 1000

/**
 * How long until a graded problem comes back as a redo. Reading a reference
 * proof feels like understanding it; reproducing it days later is the test.
 */
export function redoDelay(grade: Grade, hints: number, misses: number): number | null {
  if (grade === 'wrong') return 1 * DAY
  if (grade === 'gap') return 3 * DAY
  return hints === 0 && misses === 0 ? null : 7 * DAY
}

export function step(p: Problem, s: ProblemState, a: Action): ProblemState {
  switch (a.type) {
    // Once the reference is out the attempt is frozen: the grade is of what
    // was written before looking.
    case 'edit':
      return s.solution ? s : { ...s, attempt: a.text }
    case 'hint':
      return canHint(p, s) ? { ...s, hints: s.hints + 1, spentOn: s.attempt } : s
    case 'pickVerdict':
      return p.kind === 'decide' && !s.confirmed ? { ...s, verdict: a.value } : s
    case 'pickLine': {
      const count = p.lines?.length ?? 0
      const ok = p.kind === 'flaw' && !s.confirmed && Number.isInteger(a.line) && a.line >= 1 && a.line <= count
      return ok ? { ...s, line: a.line } : s
    }
    case 'check': {
      if (!canCheck(p, s)) return s
      const right = p.kind === 'decide' ? s.verdict === p.verdict : s.line === p.flawLine
      return right
        ? { ...s, confirmed: true, spentOn: s.attempt }
        : { ...s, misses: s.misses + 1, spentOn: s.attempt }
    }
    case 'reveal':
      return canReveal(p, s) ? { ...s, solution: true, spentOn: s.attempt } : s
    case 'grade': {
      if (!s.solution || s.grade !== null) return s
      const delay = redoDelay(a.grade, s.hints, s.misses)
      return {
        ...s,
        grade: a.grade,
        redoAt: delay === null ? null : a.now + delay,
        history: [...s.history, { at: a.now, grade: a.grade, hints: s.hints, misses: s.misses }],
      }
    }
    case 'restart':
      return s.grade === null ? s : freshState(s.history)
  }
}

export type Status = 'new' | 'working' | 'solved' | 'shaky' | 'due'

export function status(s: ProblemState | undefined, now: number): Status {
  if (!s) return 'new'
  if (s.grade === null) {
    const untouched =
      s.history.length === 0 && s.attempt.trim() === '' && s.spentOn === null && s.verdict === null && s.line === null
    return untouched ? 'new' : 'working'
  }
  if (s.redoAt !== null && now >= s.redoAt) return 'due'
  return s.grade === 'complete' ? 'solved' : 'shaky'
}
