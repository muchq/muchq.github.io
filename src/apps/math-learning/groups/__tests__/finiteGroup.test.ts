import { describe, expect, it } from 'vitest'
import {
  CATALOG,
  alternating,
  cyclic,
  dihedral,
  product,
  quaternion,
  symmetric,
  units,
} from '../engine/catalog'
import {
  byLabel,
  center,
  commutatorSubgroup,
  conjugacyClasses,
  directProduct,
  elementOrder,
  fromTable,
  generate,
  homomorphisms,
  isAbelian,
  isAssociative,
  isCyclic,
  isNormal,
  isSubgroup,
  kernel,
  leftCosets,
  mul,
  normalSubgroups,
  normalizer,
  order,
  orderStatistics,
  quotient,
  range,
  rightCosets,
  subgroups,
} from '../engine/finiteGroup'
import { gcd, invariantFactors } from '../engine/numbers'

const stats = (G: Parameters<typeof orderStatistics>[0]) => Object.fromEntries(orderStatistics(G))

describe('the catalog', () => {
  it('every entry is a group: closed, associative, with identity and inverses', () => {
    for (const { id, build } of CATALOG) {
      const G = build()
      expect(isAssociative(G), id).toBe(true)
      range(order(G)).forEach(a => expect(mul(G, a, G.inverses[a]), id).toBe(G.identity))
    }
  })

  it('names are unique and stable', () => {
    const names = CATALOG.map(e => e.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('D₄')
    expect(names).toContain('U(15)')
  })

  // Standard invariants: order, #subgroups, #normal subgroups, #classes, |Z|.
  const KNOWN: Array<[string, () => ReturnType<typeof cyclic>, number, number, number, number, number]> = [
    ['ℤ₁₂', () => cyclic(12), 12, 6, 6, 12, 12],
    ['S₃', () => symmetric(3), 6, 6, 3, 3, 1],
    ['D₄', () => dihedral(4), 8, 10, 6, 5, 2],
    ['Q₈', quaternion, 8, 6, 6, 5, 2],
    ['A₄', () => alternating(4), 12, 10, 3, 4, 1],
    ['D₆', () => dihedral(6), 12, 16, 7, 6, 2],
    ['S₄', () => symmetric(4), 24, 30, 4, 5, 1],
    ['A₅', () => alternating(5), 60, 59, 2, 5, 1],
    ['ℤ₂³', () => product(2, 2, 2), 8, 16, 16, 8, 8],
  ]

  it.each(KNOWN)('%s has the textbook invariants', (_name, build, n, subs, normals, classes, z) => {
    const G = build()
    expect(order(G)).toBe(n)
    expect(subgroups(G)).toHaveLength(subs)
    expect(normalSubgroups(G)).toHaveLength(normals)
    expect(conjugacyClasses(G)).toHaveLength(classes)
    expect(center(G)).toHaveLength(z)
  })

  it('dihedral relations: rⁿ = s² = e and rs = sr⁻¹', () => {
    for (const n of [3, 4, 5, 6]) {
      const D = dihedral(n)
      const [r, s] = byLabel(D, 'r', 's')
      expect(elementOrder(D, r)).toBe(n)
      expect(elementOrder(D, s)).toBe(2)
      expect(mul(D, r, s)).toBe(mul(D, s, D.inverses[r]))
    }
  })

  it('quaternion relations: i² = j² = k² = ijk = −1', () => {
    const Q = quaternion()
    const [minus1, i, j, k] = byLabel(Q, '−1', 'i', 'j', 'k')
    expect([mul(Q, i, i), mul(Q, j, j), mul(Q, k, k), mul(Q, mul(Q, i, j), k)]).toEqual([minus1, minus1, minus1, minus1])
    expect(stats(Q)).toEqual({ 1: 1, 2: 1, 4: 6 })
  })

  it('U(n) is cyclic exactly for n = 1, 2, 4, pᵏ, 2pᵏ', () => {
    const cyclicUnits = [2, 3, 4, 5, 6, 7, 9, 10, 11, 13, 14, 17, 18, 19, 22, 23, 25, 26, 27]
    for (let n = 2; n <= 27; n++) expect(isCyclic(units(n)), `U(${n})`).toBe(cyclicUnits.includes(n))
  })

  it('order statistics separate D₄ from Q₈ and ℤ₄ from ℤ₂ × ℤ₂', () => {
    expect(stats(dihedral(4))).toEqual({ 1: 1, 2: 5, 4: 2 })
    expect(stats(cyclic(4))).not.toEqual(stats(product(2, 2)))
  })

  it('ℤₘ × ℤₙ is cyclic iff gcd(m, n) = 1', () => {
    for (const [m, n] of [[2, 3], [3, 4], [2, 4], [4, 6], [3, 5], [3, 3]]) {
      expect(isCyclic(product(m, n)), `ℤ${m} × ℤ${n}`).toBe(gcd(m, n) === 1)
    }
  })

  it('a product of cyclic groups has the same element orders as its invariant-factor form', () => {
    for (const orders of [[2, 4, 3], [4, 6], [2, 2, 6], [12, 2], [4, 4], [9, 3]]) {
      expect(stats(product(...orders)), orders.join('×')).toEqual(stats(product(...invariantFactors(orders))))
    }
  })
})

describe('subgroups, cosets, and quotients', () => {
  it('generate builds ⟨a⟩ of size |a|', () => {
    const Z = cyclic(12)
    expect(generate(Z, byLabel(Z, '8'))).toEqual(byLabel(Z, '0', '4', '8'))
    expect(generate(Z, byLabel(Z, '4', '6'))).toEqual(byLabel(Z, '0', '2', '4', '6', '8', '10'))
  })

  it('isSubgroup accepts subgroups and refuses non-closed or empty subsets', () => {
    const S = symmetric(3)
    expect(isSubgroup(S, byLabel(S, 'e', '(1 2)'))).toBe(true)
    expect(isSubgroup(S, byLabel(S, 'e', '(1 2)', '(1 3)'))).toBe(false)
    expect(isSubgroup(S, [])).toBe(false)
  })

  it('left and right cosets of ⟨(1 2)⟩ in S₃ differ; those of A₃ agree', () => {
    const S = symmetric(3)
    const H = byLabel(S, 'e', '(1 2)')
    const sortSets = (xs: number[][]) => xs.map(x => x.join()).sort()
    expect(sortSets(leftCosets(S, H))).not.toEqual(sortSets(rightCosets(S, H)))
    const A3 = byLabel(S, 'e', '(1 2 3)', '(1 3 2)')
    expect(sortSets(leftCosets(S, A3))).toEqual(sortSets(rightCosets(S, A3)))
  })

  it('cosets partition G into [G : H] pieces of size |H|', () => {
    const G = symmetric(4)
    for (const H of subgroups(G)) {
      const cs = leftCosets(G, H)
      expect(cs).toHaveLength(order(G) / H.length)
      expect(cs.flat().sort((a, b) => a - b)).toEqual(range(order(G)))
    }
  })

  it('normality: ⟨r⟩ ◁ D₄, ⟨s⟩ is not, and N(⟨s⟩) = {e, r², s, sr²}', () => {
    const D = dihedral(4)
    expect(isNormal(D, generate(D, byLabel(D, 'r')))).toBe(true)
    const S = generate(D, byLabel(D, 's'))
    expect(isNormal(D, S)).toBe(false)
    expect(normalizer(D, S)).toEqual(byLabel(D, 'e', 'r²', 's', 'sr²'))
  })

  it('D₄/Z(D₄) is the Klein four-group', () => {
    const D = dihedral(4)
    const Q = quotient(D, center(D), 'Z')
    expect(order(Q)).toBe(4)
    expect(isCyclic(Q)).toBe(false)
    expect(Q.labels[Q.identity]).toBe('Z')
  })

  it('quotient refuses a non-normal subgroup', () => {
    const D = dihedral(4)
    expect(() => quotient(D, generate(D, byLabel(D, 's')))).toThrow()
  })

  it('commutator subgroups: S₄′ = A₄, A₄′ = V₄, D₄′ = ⟨r²⟩, A₅′ = A₅', () => {
    expect(commutatorSubgroup(symmetric(4))).toHaveLength(12)
    expect(commutatorSubgroup(alternating(4))).toHaveLength(4)
    expect(commutatorSubgroup(dihedral(4))).toHaveLength(2)
    expect(commutatorSubgroup(alternating(5))).toHaveLength(60)
    expect(commutatorSubgroup(cyclic(6))).toHaveLength(1)
  })

  it('class sizes divide |G| and sum to it', () => {
    for (const G of [symmetric(4), alternating(5), dihedral(5), quaternion()]) {
      const sizes = conjugacyClasses(G).map(c => c.length)
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(order(G))
      sizes.forEach(s => expect(order(G) % s).toBe(0))
    }
    expect(conjugacyClasses(alternating(5)).map(c => c.length).sort((a, b) => a - b)).toEqual([1, 12, 12, 15, 20])
  })
})

describe('homomorphisms', () => {
  it('there are gcd(m, n) homomorphisms ℤₘ → ℤₙ', () => {
    for (const [m, n, g] of [[12, 30, 6], [4, 6, 2], [5, 7, 1], [8, 8, 8]]) {
      expect(homomorphisms(cyclic(m), cyclic(n))).toHaveLength(g)
    }
  })

  it('S₃ → ℤ₂ has two homomorphisms (trivial and sign); S₃ → ℤ₃ only the trivial one', () => {
    const S = symmetric(3)
    const toZ2 = homomorphisms(S, cyclic(2))
    expect(toZ2).toHaveLength(2)
    expect(toZ2.map(f => kernel(S, cyclic(2), f).length).sort()).toEqual([3, 6])
    expect(homomorphisms(S, cyclic(3))).toHaveLength(1)
  })

  it('directProduct of a single factor is that factor up to labels', () => {
    expect(stats(directProduct([dihedral(3)]))).toEqual(stats(dihedral(3)))
  })

  it('fromTable refuses a table without inverses', () => {
    expect(() => fromTable('bad', ['a', 'b'], [[0, 1], [1, 1]])).toThrow()
  })

  it('isAbelian on the catalog', () => {
    expect(isAbelian(units(15))).toBe(true)
    expect(isAbelian(dihedral(3))).toBe(false)
  })
})
