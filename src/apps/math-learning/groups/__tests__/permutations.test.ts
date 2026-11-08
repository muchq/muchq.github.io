import { describe, expect, it } from 'vitest'
import {
  allPerms,
  asPermutation,
  collisions,
  compose,
  cycleType,
  cycles,
  formatCycles,
  identityPerm,
  invert,
  isIdentity,
  parseCycles,
  parseImages,
  permEquals,
  permOrder,
  power,
  sign,
} from '../engine/permutations'

const p = (s: string, n: number) => {
  const parsed = parseCycles(s, n)
  if (!parsed) throw new Error(`unparseable ${s}`)
  return parsed
}

describe('permutations', () => {
  it('composes right to left: (1 2)(2 3) = (1 2 3)', () => {
    expect(formatCycles(compose(p('(1 2)', 3), p('(2 3)', 3)))).toBe('(1 2 3)')
    expect(formatCycles(compose(p('(2 3)', 3), p('(1 2)', 3)))).toBe('(1 3 2)')
  })

  it('parses a product of overlapping cycles as their composite', () => {
    expect(formatCycles(p('(1 2 3)(2 4 5)', 5))).toBe('(1 2 4 5 3)')
  })

  it('accepts commas, run-together digits, and the identity words', () => {
    expect(formatCycles(p('(1,3,5)(2,4)', 5))).toBe('(1 3 5)(2 4)')
    expect(formatCycles(p('(135)(24)', 5))).toBe('(1 3 5)(2 4)')
    for (const id of ['e', 'id', '()', '(1)', ' E ']) expect(isIdentity(p(id, 4)), id).toBe(true)
  })

  it('reads a run-together cycle as one number once n ≥ 10', () => {
    expect(formatCycles(p('(1 10)', 10))).toBe('(1 10)')
    expect(parseCycles('(110)', 10)).toBeNull()
  })

  it('rejects what is not a permutation of {1, …, n}', () => {
    for (const bad of ['', '1 2 3', '(1 2', '(1 2))', '(1 1 2)', '(0 1)', '(1 6)', '(a b)', '(1 2)x', '(1.5 2)']) {
      expect(parseCycles(bad, 5), JSON.stringify(bad)).toBeNull()
    }
  })

  it('parses two-line bottom rows and refuses non-bijections', () => {
    expect(formatCycles(parseImages('2 3 1')!)).toBe('(1 2 3)')
    expect(formatCycles(parseImages('3 4 5 2 1')!)).toBe('(1 3 5)(2 4)')
    for (const bad of ['', '1 1 2', '2 4 1 3 9', '0 1', 'x']) expect(parseImages(bad), bad).toBeNull()
  })

  it('asPermutation accepts exactly the bijections of {0, …, n − 1}', () => {
    expect(asPermutation([1, 2, 0])).toEqual([1, 2, 0])
    for (const bad of [[], [0, 0], [1, 2], [0, 1.5], [-1, 0]]) expect(asPermutation(bad), JSON.stringify(bad)).toBeNull()
  })

  it('collisions lists each target hit more than once, 1-based, in order first hit', () => {
    expect(collisions([2, 1, 2, 1])).toEqual([
      { target: 3, sources: [1, 3] },
      { target: 2, sources: [2, 4] },
    ])
    // The control: a bijection has none.
    expect(collisions([1, 0, 2])).toEqual([])
  })

  it('cycle decomposition reassembles the permutation', () => {
    for (const q of allPerms(5)) {
      const rebuilt = cycles(q).reduce(
        (acc, c) => compose(acc, p(`(${c.join(' ')})`, 5)),
        identityPerm(5)
      )
      expect(permEquals(rebuilt, q)).toBe(true)
    }
  })

  it('inverse undoes, and order is the least k with σᵏ = e', () => {
    for (const q of allPerms(5)) {
      expect(isIdentity(compose(q, invert(q)))).toBe(true)
      const k = permOrder(q)
      expect(isIdentity(power(q, k))).toBe(true)
      for (let j = 1; j < k; j++) expect(isIdentity(power(q, j))).toBe(false)
    }
  })

  it('sign agrees with the parity of inversions and is multiplicative', () => {
    const inversions = (q: readonly number[]) =>
      q.reduce((n, x, i) => n + q.slice(i + 1).filter(y => y < x).length, 0)
    const all = allPerms(4)
    for (const a of all) {
      expect(sign(a)).toBe(inversions(a) % 2 === 0 ? 1 : -1)
      for (const b of all) expect(sign(compose(a, b))).toBe(sign(a) * sign(b))
    }
  })

  it('cycle type counts fixed points', () => {
    expect(cycleType(p('(1 2)(3 4 5)', 7))).toEqual([3, 2, 1, 1])
    expect(cycleType(identityPerm(3))).toEqual([1, 1, 1])
  })

  it('there are n! permutations', () => {
    expect([1, 2, 3, 4, 5].map(n => allPerms(n).length)).toEqual([1, 2, 6, 24, 120])
  })
})
