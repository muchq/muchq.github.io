import { parseCycles, permEquals } from '../engine/permutations'

// An answer is data, not a closure: the checker, the "correct answer"
// display, and the tests that cross-check problems against the engine all
// read the same value.
export type Answer =
  | { readonly kind: 'int'; readonly value: number }
  /**
   * A set ("list the generators") or multiset (a class equation, a list of
   * invariant factors), shown as a list or as a sum.
   */
  | {
      readonly kind: 'ints'
      readonly values: readonly number[]
      readonly mode: 'set' | 'multiset'
      readonly display: 'list' | 'sum'
    }
  /** A permutation, compared as a permutation — (2 3 1) is (1 2 3). */
  | { readonly kind: 'perm'; readonly degree: number; readonly value: string }
  | { readonly kind: 'choice'; readonly options: readonly string[]; readonly correct: number }
  /** A short expression like "sr²"; matched after normalizing notation. */
  | { readonly kind: 'text'; readonly accept: readonly string[]; readonly placeholder?: string }

const INT = /^[+-]?\d+$/

export const parseInteger = (input: string): number | null => {
  const t = input.trim().replace(/^−/, '-')
  return INT.test(t) ? Number(t) : null
}

/** "1, 2, 4", "{1, 2, 4}", "1 + 3 + 4", and "1 2 4" all read as [1, 2, 4]. */
export const parseInts = (input: string): number[] | null => {
  const tokens = input
    .replace(/[{}[\]]/g, ' ')
    .split(/[\s,+;]+/)
    .filter(Boolean)
  if (tokens.length === 0 || !tokens.every(t => INT.test(t))) return null
  return tokens.map(Number)
}

/**
 * Folds the ways one writes the same element together: case, spacing,
 * ^ and *, superscript and subscript digits (NFKC turns ² and ₂ into 2,
 * ℤ into Z), and the Unicode minus.
 */
export const normalizeText = (s: string): string =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/−/g, '-')
    .replace(/[\s^*·⋅]/g, '')

const ascending = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b)

export const checkAnswer = (answer: Answer, input: string): boolean => {
  switch (answer.kind) {
    case 'int':
      return parseInteger(input) === answer.value
    case 'ints': {
      const given = parseInts(input)
      if (given === null) return false
      const want = answer.mode === 'set' ? [...new Set(answer.values)] : [...answer.values]
      const got = answer.mode === 'set' ? [...new Set(given)] : given
      return ascending(got).join() === ascending(want).join()
    }
    case 'perm': {
      const want = parseCycles(answer.value, answer.degree)
      const got = parseCycles(input, answer.degree)
      if (want === null) throw new Error(`answer ${answer.value} is not a permutation of degree ${answer.degree}`)
      return got !== null && permEquals(want, got)
    }
    case 'choice':
      return input === String(answer.correct)
    case 'text':
      return answer.accept.some(a => normalizeText(a) === normalizeText(input))
  }
}

/** The answer as a person would write it, for "the answer is …". */
export const formatAnswer = (answer: Answer): string => {
  switch (answer.kind) {
    case 'int':
      return String(answer.value)
    case 'ints':
      if (answer.mode === 'set') return `{${ascending([...new Set(answer.values)]).join(', ')}}`
      return ascending(answer.values).join(answer.display === 'sum' ? ' + ' : ', ')
    case 'perm':
      return answer.value
    case 'choice':
      return answer.options[answer.correct]
    case 'text':
      return answer.accept[0]
  }
}

/** The input a person would type to give this answer; the choice index for a choice. */
export const answerInput = (answer: Answer): string =>
  answer.kind === 'choice' ? String(answer.correct) : formatAnswer(answer)

export const placeholderFor = (answer: Answer): string => {
  switch (answer.kind) {
    case 'int':
      return 'An integer'
    case 'ints':
      if (answer.mode === 'set') return 'A list, e.g. 1, 2, 4'
      return answer.display === 'sum' ? 'A sum, e.g. 1 + 3 + 4' : 'A list with repeats, e.g. 2, 2, 6'
    case 'perm':
      return 'Cycle notation, e.g. (1 2 3)(4 5)'
    case 'choice':
      return ''
    case 'text':
      return answer.placeholder ?? 'Your answer'
  }
}

export const int = (value: number): Answer => ({ kind: 'int', value })
export const set = (...values: number[]): Answer => ({ kind: 'ints', values, mode: 'set', display: 'list' })
/** Repeats count, order does not; shown as a sum, as for a class equation. */
export const sum = (...values: number[]): Answer => ({ kind: 'ints', values, mode: 'multiset', display: 'sum' })
/** Repeats count, order does not; shown as a list, as for invariant factors. */
export const list = (...values: number[]): Answer => ({ kind: 'ints', values, mode: 'multiset', display: 'list' })
export const perm = (degree: number, value: string): Answer => ({ kind: 'perm', degree, value })
export const choice = (options: readonly string[], correct: string): Answer => {
  const i = options.indexOf(correct)
  if (i < 0) throw new Error(`${correct} is not among the options`)
  return { kind: 'choice', options, correct: i }
}
export const yesNo = (yes: boolean): Answer => choice(['Yes', 'No'], yes ? 'Yes' : 'No')
export const text = (accept: readonly string[], placeholder?: string): Answer => ({ kind: 'text', accept, placeholder })

/**
 * A dihedral element in normal form (e, rᵏ, srᵏ), also accepting the
 * spelled-out first power (r¹, sr^1) and the usual names for the identity.
 */
export const dihedralElement = (label: string): Answer =>
  text(
    label === 'e' ? ['e', '1', 'id'] : label.endsWith('r') ? [label, `${label}1`] : [label],
    'e.g. sr² or sr^2'
  )
