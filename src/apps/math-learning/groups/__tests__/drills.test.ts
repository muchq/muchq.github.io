import { describe, expect, it } from 'vitest'
import { cyclic, dihedral, product, units } from '../engine/catalog'
import {
  byLabel,
  elementOrder,
  generate,
  homomorphisms,
  image,
  isCyclic,
  isHomomorphism,
  kernel,
  leftCosets,
  order,
  quotient,
  range,
  conjugacyClasses,
} from '../engine/finiteGroup'
import { gcd, partitions } from '../engine/numbers'
import { allPerms, compose, cycleType, isIdentity, parseCycles, parseImages } from '../engine/permutations'
import { answerInput, checkAnswer, type Answer } from '../problems/answers'
import { DRILLS } from '../problems/drills'
import { seeded } from '../problems/rng'
import type { Drill, DrillItem } from '../problems/types'

// Each verifier reads the prompt — what the reader actually sees — and
// re-derives the answer by an independent route, by brute force over the
// real group wherever one exists. It returns an input the reader could
// type that must be accepted.

const digits = (s: string) => Number(s.normalize('NFKC'))
const match = (prompt: string, re: RegExp): string[] => {
  const m = prompt.match(re)
  if (!m) throw new Error(`prompt did not match ${re}: ${prompt}`)
  return m.slice(1)
}

const cyclicProductTuples = (orders: number[]): number[][] =>
  orders.reduce<number[][]>((acc, n) => acc.flatMap(t => range(n).map(x => [...t, x])), [[]])
const tupleOrder = (t: number[], orders: number[]) => t.reduce((acc, x, i) => lcmOf(acc, orders[i] / gcd(x, orders[i])), 1)
const lcmOf = (a: number, b: number) => (a / gcd(a, b)) * b
const parseOrders = (s: string) => s.split(' × ').map(z => digits(z.replace('ℤ', '')))

const elementsOfOrder = (G: ReturnType<typeof cyclic>, d: number) =>
  range(order(G)).filter(a => elementOrder(G, a) === d).length

const VERIFY: Record<string, (item: DrillItem) => string> = {
  'unit-order': ({ prompt }) => {
    const [a, n] = match(prompt, /order of (\d+) in U\((\d+)\)/).map(Number)
    const U = units(n)
    return String(elementOrder(U, byLabel(U, String(a))[0]))
  },
  'unit-inverse': ({ prompt }) => {
    const [a, n] = match(prompt, /inverse of (\d+) in U\((\d+)\)/).map(Number)
    const U = units(n)
    return U.labels[U.inverses[byLabel(U, String(a))[0]]]
  },
  'dihedral-product': ({ prompt }) => {
    const [n, x, y] = match(prompt, /In D([₀-₉]+),.* compute \((.+?)\)\((.+?)\)\./)
    const D = dihedral(digits(n))
    const [a, b] = byLabel(D, x, y)
    return D.labels[D.table[a][b]]
  },
  'cyclic-order': ({ prompt }) => {
    const [k, n] = match(prompt, /order of (\d+) in ℤ([₀-₉]+)/)
    return String(elementOrder(cyclic(digits(n)), Number(k)))
  },
  'cyclic-generators': ({ prompt }) => {
    const n = digits(match(prompt, /does ℤ([₀-₉]+) have/)[0])
    return String(elementsOfOrder(cyclic(n), n))
  },
  'cyclic-subgroups': ({ prompt }) => {
    const G = cyclic(digits(match(prompt, /does ℤ([₀-₉]+) have/)[0]))
    const distinct = new Set(range(order(G)).map(a => generate(G, [a]).join()))
    return String(distinct.size) // every subgroup of a cyclic group is cyclic
  },
  'cyclic-elements-of-order': ({ prompt }) => {
    const [d, n] = match(prompt, /elements of order (\d+) does ℤ([₀-₉]+)/)
    return String(elementsOfOrder(cyclic(digits(n)), Number(d)))
  },
  'perm-product': ({ prompt }) => {
    const [n, s, t] = match(prompt, /In S([₀-₉]+), let σ = (.+?) and τ = (.+?)\. /)
    const deg = digits(n)
    // σ ∘ τ pointwise, without going through compose.
    const [sigma, tau] = [parseCycles(s, deg)!, parseCycles(t, deg)!]
    return formatViaImages(tau.map(x => sigma[x]))
  },
  'perm-order': ({ prompt }) => {
    const [s, n] = match(prompt, /order of (.+) in S([₀-₉]+)/)
    const p = parseCycles(s, digits(n))!
    let k = 1
    for (let q = p; !isIdentity(q); q = compose(p, q)) k++
    return String(k)
  },
  'perm-sign': ({ prompt }) => {
    const [s, n] = match(prompt, /Is (.+) ∈ S([₀-₉]+) even or odd/)
    const p = parseCycles(s, digits(n))!
    const inversions = p.reduce((acc, x, i) => acc + p.slice(i + 1).filter(y => y < x).length, 0)
    return inversions % 2 === 0 ? '0' : '1'
  },
  'two-line': ({ prompt }) => {
    const row = match(prompt, /to ([\d, ]+) in disjoint/)[0]
    return formatViaImages(parseImages(row)!)
  },
  'aut-cyclic': ({ prompt }) => {
    const G = cyclic(digits(match(prompt, /does ℤ([₀-₉]+) have/)[0]))
    return String(homomorphisms(G, G).filter(f => image(f).length === order(G)).length)
  },
  'units-cyclic': ({ prompt }) => {
    const n = Number(match(prompt, /Is U\((\d+)\) cyclic/)[0])
    return isCyclic(units(n)) ? '0' : '1'
  },
  'euler-power': ({ prompt }) => {
    const [a, e, n] = match(prompt, /Compute (\d+)([⁰¹²³⁴-⁹]+) mod (\d+)/)
    return String(BigInt(a) ** BigInt(digits(e)) % BigInt(n))
  },
  'cyclic-index': ({ prompt }) => {
    const [k, n] = match(prompt, /index of ⟨(\d+)⟩ in ℤ([₀-₉]+)/)
    const G = cyclic(digits(n))
    return String(order(G) / generate(G, [Number(k)]).length)
  },
  'product-order': ({ prompt }) => {
    const [a, b, group] = match(prompt, /order of \((\d+), (\d+)\) in (.+)\./)
    const G = product(...parseOrders(group))
    return String(elementOrder(G, byLabel(G, `(${a}, ${b})`)[0]))
  },
  'product-cyclic': ({ prompt }) => {
    const G = product(...parseOrders(match(prompt, /Is (.+) cyclic/)[0]))
    return isCyclic(G) ? '0' : '1'
  },
  'product-count-order': ({ prompt }) => {
    const [d, group] = match(prompt, /elements of order (\d+) does (.+) have/)
    return String(elementsOfOrder(product(...parseOrders(group)), Number(d)))
  },
  'quotient-order': ({ prompt }) => {
    const [a, k, n] = match(prompt, /order of (\d+) \+ ⟨(\d+)⟩ in ℤ([₀-₉]+)\//)
    const G = cyclic(digits(n))
    const N = generate(G, [Number(k)])
    const Q = quotient(G, N)
    return String(elementOrder(Q, leftCosets(G, N).findIndex(C => C.includes(Number(a)))))
  },
  'product-quotient-size': ({ prompt }) => {
    const [group, a, b] = match(prompt, /order of \((.+)\)\/⟨\((\d+), (\d+)\)⟩/)
    const G = product(...parseOrders(group))
    return String(order(quotient(G, generate(G, byLabel(G, `(${a}, ${b})`)))))
  },
  'hom-count': ({ prompt }) => {
    const [m, n] = match(prompt, /homomorphisms ℤ([₀-₉]+) → ℤ([₀-₉]+)/).map(digits)
    return String(homomorphisms(cyclic(m), cyclic(n)).length)
  },
  'hom-kernel': ({ prompt }) => {
    const [m, n, a] = match(prompt, /φ: ℤ([₀-₉]+) → ℤ([₀-₉]+), φ\(x\) = (\d+)x/).map(digits)
    const [G, H] = [cyclic(m), cyclic(n)]
    const f = range(m).map(x => (Number(a) * x) % n)
    expect(isHomomorphism(G, H, f), prompt).toBe(true)
    return String(kernel(G, H, f).length)
  },
  'hom-onto': ({ prompt }) => {
    const [m, n] = match(prompt, /homomorphisms ℤ([₀-₉]+) → ℤ([₀-₉]+)/).map(digits)
    return String(homomorphisms(cyclic(m), cyclic(n)).filter(f => image(f).length === n).length)
  },
  'abelian-count': ({ prompt }) => {
    let n = Number(match(prompt, /of order (\d+) are there/)[0])
    let total = 1
    for (let p = 2; n > 1; p++) {
      let e = 0
      while (n % p === 0) {
        n /= p
        e++
      }
      total *= partitions(e).length
    }
    return String(total)
  },
  'invariant-factors': ({ prompt, answer }) => {
    const orders = parseOrders(match(prompt, /^Write (.+) as ℤ_/)[0])
    const given = answerInput(answer).split(' + ').map(Number)
    given.slice(1).forEach((f, i) => expect(f % given[i], prompt).toBe(0))
    const stats = (os: number[]) => {
      const counts = new Map<number, number>()
      for (const t of cyclicProductTuples(os)) counts.set(tupleOrder(t, os), (counts.get(tupleOrder(t, os)) ?? 0) + 1)
      return [...counts].sort(([x], [y]) => x - y)
    }
    // Finite abelian groups with the same element-order counts are isomorphic.
    expect(stats(given), prompt).toEqual(stats(orders))
    return answerInput(answer)
  },
  'abelian-order-p': ({ prompt }) => {
    const [p, group] = match(prompt, /elements of order (\d+) does (.+) have/)
    const orders = parseOrders(group)
    return String(cyclicProductTuples(orders).filter(t => tupleOrder(t, orders) === Number(p)).length)
  },
  necklaces: ({ prompt }) => {
    const [n, k] = match(prompt, /necklaces of (\d+) beads in (\d+) colors/).map(Number)
    const seen = new Set<string>()
    for (let code = 0; code < k ** n; code++) {
      const beads = range(n).map(i => Math.floor(code / k ** i) % k)
      seen.add(range(n).map(r => [...beads.slice(r), ...beads.slice(0, r)].join('')).sort()[0])
    }
    return String(seen.size)
  },
  'sn-class-size': ({ prompt }) => {
    const [n, type] = match(prompt, /elements of S([₀-₉]+) have cycle type \(([\d, ]+)\)/)
    const want = type.split(', ').join()
    return String(allPerms(digits(n)).filter(p => cycleType(p).join() === want).length)
  },
  'dihedral-class-equation': ({ prompt }) => {
    const n = digits(match(prompt, /equation of D([₀-₉]+)/)[0])
    return conjugacyClasses(dihedral(n))
      .map(c => c.length)
      .join(' + ')
  },
  'sylow-counts': ({ prompt }) => {
    const [n, p] = match(prompt, /\|G\| = (\d+)\. List every value of n([₀-₉]+)/).map(digits)
    let m = n
    while (m % p === 0) m /= p
    return range(m + 1)
      .filter(d => d > 0 && m % d === 0 && (d - 1) % p === 0)
      .join(', ')
  },
  'sylow-order': ({ prompt }) => {
    const [p, n] = match(prompt, /Sylow (\d+)-subgroup of a group of order (\d+)/).map(Number)
    let pk = 1
    while (n % (pk * p) === 0) pk *= p
    return String(pk)
  },
  'composition-length': ({ prompt }) => {
    let n = digits(match(prompt, /series of ℤ([₀-₉]+)/)[0])
    let length = 0
    for (let p = 2; n > 1; ) {
      if (n % p === 0) {
        n /= p
        length++
      } else p++
    }
    return String(length)
  },
}

/** A permutation's cycle notation built from its image row, independently of formatCycles. */
function formatViaImages(p: readonly number[]): string {
  const parts: string[] = []
  const seen = new Set<number>()
  p.forEach((_, start) => {
    if (seen.has(start) || p[start] === start) return
    const cycle: number[] = []
    for (let x = start; !seen.has(x); x = p[x]) {
      seen.add(x)
      cycle.push(x + 1)
    }
    parts.push(`(${cycle.join(' ')})`)
  })
  return parts.join('') || 'e'
}

/** Some input that must be refused: off by one, or a different option. */
const wrongInput = (answer: Answer): string => {
  switch (answer.kind) {
    case 'int':
      return String(answer.value + 1)
    case 'ints':
      return [...answer.values, 9999].join(', ')
    case 'perm':
      return answer.value === 'e' ? '(1 2)' : 'e'
    case 'choice':
      return String((answer.correct + 1) % answer.options.length)
    case 'text':
      return 'not an element'
  }
}

const allDrills: Drill[] = Object.values(DRILLS).flat()
const SEEDS = 80

describe('drills', () => {
  it('every drill has an independent verifier, and ids are unique', () => {
    const ids = allDrills.map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.filter(id => !(id in VERIFY))).toEqual([])
  })

  it.each(allDrills.map(d => [d.id, d] as const))('%s: answers agree with brute force', (_id, drill) => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const item = drill.make(seeded(seed))
      const label = `${drill.id} seed ${seed}: ${item.prompt}`
      expect(checkAnswer(item.answer, answerInput(item.answer)), label).toBe(true)
      expect(checkAnswer(item.answer, VERIFY[drill.id](item)), label).toBe(true)
      expect(checkAnswer(item.answer, wrongInput(item.answer)), label).toBe(false)
      if (item.answer.kind === 'int') expect(item.solution, label).toContain(String(item.answer.value))
    }
  })

  it('the same seed gives the same problem; different seeds vary', () => {
    for (const drill of allDrills) {
      expect(drill.make(seeded(7)).prompt).toBe(drill.make(seeded(7)).prompt)
      const prompts = new Set(range(20).map(s => drill.make(seeded(s + 1)).prompt))
      expect(prompts.size, drill.id).toBeGreaterThan(1)
    }
  })
})
