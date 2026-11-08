import { describe, expect, it } from 'vitest'
import {
  abelianGroupCount,
  divisors,
  factorize,
  gcd,
  invariantFactors,
  isPrime,
  lcm,
  mod,
  partitionCount,
  partitions,
  powMod,
  totient,
} from '../engine/numbers'

describe('numbers', () => {
  it('gcd and lcm, including signs and zero', () => {
    expect(gcd(12, 18)).toBe(6)
    expect(gcd(-12, 18)).toBe(6)
    expect(gcd(7, 0)).toBe(7)
    expect(lcm(4, 6)).toBe(12)
    expect(lcm(0, 5)).toBe(0)
  })

  it('mod is never negative', () => {
    expect(mod(-1, 5)).toBe(4)
    expect(mod(7, 5)).toBe(2)
  })

  it('factorizes and recognizes primes', () => {
    expect(factorize(360)).toEqual([
      [2, 3],
      [3, 2],
      [5, 1],
    ])
    expect(factorize(97)).toEqual([[97, 1]])
    expect([1, 2, 4, 9, 13].map(isPrime)).toEqual([false, true, false, false, true])
  })

  it('totient agrees with counting coprimes', () => {
    for (let n = 1; n <= 60; n++) {
      const coprime = Array.from({ length: n }, (_, k) => k + 1).filter(k => gcd(k, n) === 1).length
      expect(totient(n), `φ(${n})`).toBe(coprime)
    }
  })

  it('Σ_{d | n} φ(d) = n', () => {
    for (let n = 1; n <= 60; n++) expect(divisors(n).reduce((s, d) => s + totient(d), 0)).toBe(n)
  })

  it('partition counts match the enumerated partitions', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(partitionCount)).toEqual([1, 1, 2, 3, 5, 7, 11, 15])
    for (let k = 0; k <= 10; k++) expect(partitions(k)).toHaveLength(partitionCount(k))
    expect(partitions(4)).toEqual([[4], [3, 1], [2, 2], [2, 1, 1], [1, 1, 1, 1]])
  })

  it('counts abelian groups of order n (OEIS A000688)', () => {
    const a000688 = [1, 1, 1, 2, 1, 1, 1, 3, 2, 1, 1, 2, 1, 1, 1, 5, 1, 2, 1, 2, 1, 1, 1, 3, 2, 1, 3, 2, 1, 1, 1, 7]
    expect(a000688.map((_, i) => abelianGroupCount(i + 1))).toEqual(a000688)
  })

  it('powMod agrees with exact arithmetic', () => {
    expect(powMod(3, 100, 7)).toBe(Number(3n ** 100n % 7n))
    expect(powMod(7, 222, 10)).toBe(9)
    expect(powMod(5, 0, 1)).toBe(0)
  })

  it('invariant factors chain by divisibility and preserve the order', () => {
    expect(invariantFactors([2, 4, 3, 9])).toEqual([6, 36])
    expect(invariantFactors([4, 6])).toEqual([2, 12])
    expect(invariantFactors([2, 3])).toEqual([6])
    expect(invariantFactors([2, 2, 2])).toEqual([2, 2, 2])
    expect(invariantFactors([1])).toEqual([])
    const fs = invariantFactors([12, 18, 10])
    fs.slice(1).forEach((f, i) => expect(f % fs[i]).toBe(0))
    expect(fs.reduce((a, b) => a * b, 1)).toBe(12 * 18 * 10)
  })
})
