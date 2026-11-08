import { dihedralLabel, sub, sup } from '../engine/catalog'
import {
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
import { compose, cycles, formatCycles, identityPerm, isIdentity, permOrder, sign, type Perm } from '../engine/permutations'
import { choice, dihedralElement, int, list, perm, set, sum, yesNo } from './answers'
import { pick, randInt, shuffle } from './rng'
import type { Drill, Rng } from './types'

// Every drill derives its answer from the parameters it draws; the tests
// re-derive each one independently (by brute force over the actual group
// where one exists) for hundreds of seeds.

const Z = (n: number) => `ℤ${sub(n)}`
const productName = (orders: readonly number[]) => orders.map(Z).join(' × ')
const withExponent = (base: string | number, e: number) => (e === 1 ? `${base}` : `${base}${sup(e)}`)
const factorText = (n: number) => factorize(n).map(([p, e]) => withExponent(p, e)).join(' · ')
const coprimesTo = (n: number) => Array.from({ length: n }, (_, k) => k).filter(k => k > 0 && gcd(k, n) === 1)
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1))

const totientWork = (n: number) => {
  const parts = factorize(n)
  if (parts.length === 1 && parts[0][1] === 1) return `φ(${n}) = ${n} − 1 = ${totient(n)}`
  const terms = parts.map(([p, e]) => `φ(${withExponent(p, e)})`).join(' · ')
  const values = parts.map(([p, e]) => p ** (e - 1) * (p - 1)).join(' · ')
  return `${n} = ${factorText(n)}, so φ(${n}) = ${terms} = ${values} = ${totient(n)}`
}

/** The order of a in ℤₙ. */
const cyclicElementOrder = (a: number, n: number) => n / gcd(a, n)

const randomPerm = (rng: Rng, n: number): Perm => {
  let p: Perm = identityPerm(n)
  while (isIdentity(p)) p = shuffle(rng, identityPerm(n))
  return p
}

// ── Chapter 1: groups ────────────────────────────────────────────────

const UNIT_MODULI = [7, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26]

export const unitOrder: Drill = {
  id: 'unit-order',
  title: 'Orders in U(n)',
  make: rng => {
    const n = pick(rng, UNIT_MODULI)
    const a = pick(
      rng,
      coprimesTo(n).filter(x => x !== 1)
    )
    const powers = [a]
    while (powers[powers.length - 1] !== 1) powers.push((powers[powers.length - 1] * a) % n)
    return {
      prompt: `Find the order of ${a} in U(${n}).`,
      answer: int(powers.length),
      solution: `Multiply by ${a} mod ${n} until you reach 1: ${powers.map((x, i) => `${withExponent(a, i + 1)} ≡ ${x}`).join(', ')}. So |${a}| = ${powers.length}.`,
    }
  },
}

export const unitInverse: Drill = {
  id: 'unit-inverse',
  title: 'Inverses in U(n)',
  make: rng => {
    const n = pick(rng, UNIT_MODULI)
    const a = pick(rng, coprimesTo(n))
    const b = coprimesTo(n).find(x => (a * x) % n === 1)!
    return {
      prompt: `Find the inverse of ${a} in U(${n}).`,
      answer: int(b),
      solution: `${a} · ${b} = ${a * b} = ${Math.floor((a * b) / n)} · ${n} + 1 ≡ 1 (mod ${n}), so ${a}⁻¹ = ${b}.`,
    }
  },
}

export const dihedralProduct: Drill = {
  id: 'dihedral-product',
  title: 'Products in Dₙ',
  make: rng => {
    const n = randInt(rng, 3, 6)
    const [a, i, b, j] = [randInt(rng, 0, 1), randInt(rng, 0, n - 1), randInt(rng, 0, 1), randInt(rng, 0, n - 1)]
    const x = dihedralLabel(a, i)
    const y = dihedralLabel(b, j)
    const turn = mod(b === 0 ? i + j : j - i, n)
    const result = dihedralLabel((a + b) % 2, turn)
    const lead = a === 1 ? 's' : ''
    const work =
      b === 0
        ? `The rotations add: (${x})(${y}) = ${lead}r^(${i} + ${j}) = ${result}, using r${sup(n)} = e.`
        : `Move the rotation past s using rⁱs = sr⁻ⁱ: (${x})(${y}) = ${lead}r^${i} · s r^${j} = ${lead}${lead ? '·' : ''}s r^(${j} − ${i}) = ${result}, using ${a === 1 ? 's² = e and ' : ''}r${sup(n)} = e.`
    return {
      prompt: `In D${sub(n)}, where r${sup(n)} = s² = e and rs = sr⁻¹, compute (${x})(${y}). Write the answer as e, rᵏ, or srᵏ.`,
      answer: dihedralElement(result),
      solution: work,
    }
  },
}

// ── Chapter 2: subgroups and cyclic groups ────────────────────────────

export const cyclicOrder: Drill = {
  id: 'cyclic-order',
  title: 'Orders in ℤₙ',
  make: rng => {
    const n = randInt(rng, 6, 40)
    const k = randInt(rng, 1, n - 1)
    const g = gcd(n, k)
    return {
      prompt: `Find the order of ${k} in ${Z(n)}.`,
      answer: int(n / g),
      solution: `|${k}| = ${n} / gcd(${n}, ${k}) = ${n} / ${g} = ${n / g}.`,
    }
  },
}

export const cyclicGenerators: Drill = {
  id: 'cyclic-generators',
  title: 'Counting generators',
  make: rng => {
    const n = randInt(rng, 6, 60)
    return {
      prompt: `How many generators does ${Z(n)} have?`,
      answer: int(totient(n)),
      solution: `k generates ${Z(n)} exactly when gcd(k, ${n}) = 1, so there are φ(${n}) of them. ${totientWork(n)}.`,
    }
  },
}

export const cyclicSubgroupCount: Drill = {
  id: 'cyclic-subgroups',
  title: 'Counting subgroups of ℤₙ',
  make: rng => {
    const n = randInt(rng, 6, 72)
    const ds = divisors(n)
    return {
      prompt: `How many subgroups does ${Z(n)} have?`,
      answer: int(ds.length),
      solution: `A cyclic group of order ${n} has exactly one subgroup for each divisor of ${n}: ${ds.join(', ')}. That is ${ds.length} subgroups.`,
    }
  },
}

export const cyclicElementsOfOrder: Drill = {
  id: 'cyclic-elements-of-order',
  title: 'Elements of a given order in ℤₙ',
  make: rng => {
    const n = randInt(rng, 8, 60)
    const d = pick(
      rng,
      divisors(n).filter(x => x > 1)
    )
    return {
      prompt: `How many elements of order ${d} does ${Z(n)} have?`,
      answer: int(totient(d)),
      solution: `${Z(n)} has exactly one subgroup of order ${d}, and it is cyclic, so the elements of order ${d} are its φ(${d}) generators. ${totientWork(d)}.`,
    }
  },
}

// ── Chapter 3: permutations ───────────────────────────────────────────

export const permutationProduct: Drill = {
  id: 'perm-product',
  title: 'Composing permutations',
  make: rng => {
    const n = randInt(rng, 4, 6)
    const s = randomPerm(rng, n)
    const t = randomPerm(rng, n)
    const st = compose(s, t)
    const trace = identityPerm(n)
      .map(x => `${x + 1} → ${t[x] + 1} → ${s[t[x]] + 1}`)
      .join('; ')
    return {
      prompt: `In S${sub(n)}, let σ = ${formatCycles(s)} and τ = ${formatCycles(t)}. Compute στ (apply τ first).`,
      answer: perm(n, formatCycles(st)),
      solution: `Follow each point through τ, then σ: ${trace}. So στ = ${formatCycles(st)}.`,
    }
  },
}

export const permutationOrder: Drill = {
  id: 'perm-order',
  title: 'Order of a permutation',
  make: rng => {
    const n = randInt(rng, 6, 9)
    const p = randomPerm(rng, n)
    const lengths = cycles(p).map(c => c.length)
    return {
      prompt: `Find the order of ${formatCycles(p)} in S${sub(n)}.`,
      answer: int(permOrder(p)),
      solution: `Disjoint cycles commute, so σᵏ = e exactly when every cycle length divides k. The lengths are ${lengths.join(', ')}, so |σ| = lcm(${lengths.join(', ')}) = ${permOrder(p)}.`,
    }
  },
}

export const permutationSign: Drill = {
  id: 'perm-sign',
  title: 'Even or odd?',
  make: rng => {
    const n = randInt(rng, 5, 8)
    const p = randomPerm(rng, n)
    const lengths = cycles(p).map(c => c.length)
    const transpositions = lengths.reduce((acc, k) => acc + k - 1, 0)
    return {
      prompt: `Is ${formatCycles(p)} ∈ S${sub(n)} even or odd?`,
      answer: choice(['Even', 'Odd'], sign(p) === 1 ? 'Even' : 'Odd'),
      solution: `A k-cycle is a product of k − 1 transpositions. Here that is ${lengths.map(k => k - 1).join(' + ')} = ${transpositions} transpositions, which is ${transpositions % 2 === 0 ? 'even' : 'odd'}.`,
    }
  },
}

export const twoLineToCycles: Drill = {
  id: 'two-line',
  title: 'Two-line to cycle notation',
  make: rng => {
    const n = randInt(rng, 5, 7)
    const p = randomPerm(rng, n)
    return {
      prompt: `Write the permutation of {1, …, ${n}} sending 1, 2, …, ${n} to ${p.map(x => x + 1).join(', ')} in disjoint cycle notation.`,
      answer: perm(n, formatCycles(p)),
      solution: `Start at the least unused point and follow it until it returns: ${cycles(p)
        .map(c => [...c, c[0]].join(' → '))
        .join('; ')}. Fixed points are omitted, giving ${formatCycles(p)}.`,
    }
  },
}

// ── Chapter 4: isomorphisms ───────────────────────────────────────────

export const automorphismsOfCyclic: Drill = {
  id: 'aut-cyclic',
  title: '|Aut(ℤₙ)|',
  make: rng => {
    const n = randInt(rng, 5, 60)
    return {
      prompt: `How many automorphisms does ${Z(n)} have?`,
      answer: int(totient(n)),
      solution: `An automorphism is determined by the image of 1, which must again be a generator, and every generator works: Aut(${Z(n)}) ≅ U(${n}). ${totientWork(n)}.`,
    }
  },
}

/** U(n) is cyclic exactly when n is 1, 2, 4, pᵏ, or 2pᵏ for an odd prime p. */
export const unitsAreCyclic = (n: number): boolean => {
  const f = factorize(n)
  if (n === 1 || n === 2 || n === 4) return true
  if (f.length === 1) return f[0][0] !== 2
  return f.length === 2 && f[0][0] === 2 && f[0][1] === 1
}

const unitOrderOf = (a: number, n: number) => {
  let k = 1
  for (let x = a % n; x !== 1 % n; x = (x * a) % n) k++
  return k
}

export const cyclicUnits: Drill = {
  id: 'units-cyclic',
  title: 'Is U(n) cyclic?',
  make: rng => {
    const n = randInt(rng, 5, 50)
    const cyclic = unitsAreCyclic(n)
    const orders = coprimesTo(n).map(a => unitOrderOf(a, n))
    const best = Math.max(...orders)
    const witness = coprimesTo(n).find(a => unitOrderOf(a, n) === totient(n))
    return {
      prompt: `Is U(${n}) cyclic?`,
      answer: yesNo(cyclic),
      solution: cyclic
        ? `Yes. U(n) is cyclic exactly when n is 2, 4, pᵏ, or 2pᵏ for an odd prime p, and ${n} = ${factorText(n)} is. For instance ${witness} has order φ(${n}) = ${totient(n)}.`
        : `No. U(n) is cyclic exactly when n is 2, 4, pᵏ, or 2pᵏ for an odd prime p, and ${n} = ${factorText(n)} is not. Its largest element order is ${best}, less than |U(${n})| = ${totient(n)}.`,
    }
  },
}

// ── Chapter 5: cosets and Lagrange ────────────────────────────────────

const EULER_MODULI = [7, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 23, 25, 26]

export const eulerPower: Drill = {
  id: 'euler-power',
  title: 'Powers mod n via Euler',
  make: rng => {
    const n = pick(rng, EULER_MODULI)
    const a = pick(
      rng,
      coprimesTo(n).filter(x => x > 1)
    )
    const e = randInt(rng, 50, 999)
    const f = totient(n)
    const r = e % f
    return {
      prompt: `Compute ${a}${sup(e)} mod ${n}.`,
      answer: int(powMod(a, e, n)),
      solution: `Since gcd(${a}, ${n}) = 1, Lagrange in U(${n}) gives ${a}^φ(${n}) ≡ 1, and φ(${n}) = ${f}. As ${e} = ${Math.floor(e / f)} · ${f} + ${r}, ${a}${sup(e)} ≡ ${a}${sup(r)} ≡ ${powMod(a, e, n)} (mod ${n}).`,
    }
  },
}

export const cyclicIndex: Drill = {
  id: 'cyclic-index',
  title: 'Index in ℤₙ',
  make: rng => {
    const n = randInt(rng, 6, 48)
    const k = randInt(rng, 1, n - 1)
    const g = gcd(n, k)
    return {
      prompt: `What is the index of ⟨${k}⟩ in ${Z(n)}?`,
      answer: int(g),
      solution: `|⟨${k}⟩| = ${n} / gcd(${n}, ${k}) = ${n / g}, so by Lagrange the index is ${n} / ${n / g} = ${g}.`,
    }
  },
}

// ── Chapter 6: direct products ────────────────────────────────────────

export const productElementOrder: Drill = {
  id: 'product-order',
  title: 'Orders in ℤₘ × ℤₙ',
  make: rng => {
    const m = randInt(rng, 2, 20)
    const n = randInt(rng, 2, 20)
    let [a, b] = [0, 0]
    while (a === 0 && b === 0) [a, b] = [randInt(rng, 0, m - 1), randInt(rng, 0, n - 1)]
    const [p, q] = [cyclicElementOrder(a, m), cyclicElementOrder(b, n)]
    return {
      prompt: `Find the order of (${a}, ${b}) in ${productName([m, n])}.`,
      answer: int(lcm(p, q)),
      solution: `|${a}| = ${p} in ${Z(m)} and |${b}| = ${q} in ${Z(n)}, so |(${a}, ${b})| = lcm(${p}, ${q}) = ${lcm(p, q)}.`,
    }
  },
}

export const productIsCyclic: Drill = {
  id: 'product-cyclic',
  title: 'Is ℤₘ × ℤₙ cyclic?',
  make: rng => {
    const m = randInt(rng, 2, 24)
    const n = randInt(rng, 2, 24)
    const g = gcd(m, n)
    return {
      prompt: `Is ${productName([m, n])} cyclic?`,
      answer: yesNo(g === 1),
      solution:
        g === 1
          ? `Yes: gcd(${m}, ${n}) = 1, so (1, 1) has order lcm(${m}, ${n}) = ${m * n}, and ${productName([m, n])} ≅ ${Z(m * n)}.`
          : `No: gcd(${m}, ${n}) = ${g}, so every element has order dividing lcm(${m}, ${n}) = ${lcm(m, n)} < ${m * n}.`,
    }
  },
}

export const productCountOfOrder: Drill = {
  id: 'product-count-order',
  title: 'Counting elements of a given order',
  make: rng => {
    const m = randInt(rng, 2, 20)
    const n = randInt(rng, 2, 20)
    const d = pick(
      rng,
      divisors(lcm(m, n)).filter(x => x > 1)
    )
    const terms: string[] = []
    let count = 0
    for (const p of divisors(m))
      for (const q of divisors(n))
        if (lcm(p, q) === d) {
          count += totient(p) * totient(q)
          terms.push(`φ(${p})·φ(${q})`)
        }
    return {
      prompt: `How many elements of order ${d} does ${productName([m, n])} have?`,
      answer: int(count),
      solution: `(a, b) has order lcm(|a|, |b|), and ${Z(m)} has φ(p) elements of order p for each p | ${m}. Sum over orders p | ${m}, q | ${n} with lcm(p, q) = ${d}: ${terms.join(' + ')} = ${count}.`,
    }
  },
}

// ── Chapter 7: quotients ──────────────────────────────────────────────

export const quotientElementOrder: Drill = {
  id: 'quotient-order',
  title: 'Orders in ℤₙ/⟨k⟩',
  make: rng => {
    let [n, k] = [0, 0]
    while (gcd(n, k) < 2) {
      n = randInt(rng, 8, 40)
      k = randInt(rng, 1, n - 1)
    }
    const g = gcd(n, k)
    const a = randInt(rng, 1, n - 1)
    const r = a % g
    const answer = g / gcd(r, g)
    return {
      prompt: `Find the order of ${a} + ⟨${k}⟩ in ${Z(n)}/⟨${k}⟩.`,
      answer: int(answer),
      solution: `⟨${k}⟩ = ⟨${g}⟩ has order ${n / g}, so the quotient has order ${g}; in fact ${Z(n)}/⟨${g}⟩ ≅ ${Z(g)} by a + ⟨${g}⟩ ↦ a mod ${g}. Here ${a} mod ${g} = ${r}, whose order in ${Z(g)} is ${g}/gcd(${r}, ${g}) = ${answer}.`,
    }
  },
}

export const productQuotientOrder: Drill = {
  id: 'product-quotient-size',
  title: 'Size of (ℤₘ × ℤₙ)/⟨(a, b)⟩',
  make: rng => {
    const m = randInt(rng, 2, 12)
    const n = randInt(rng, 2, 12)
    let [a, b] = [0, 0]
    while (a === 0 && b === 0) [a, b] = [randInt(rng, 0, m - 1), randInt(rng, 0, n - 1)]
    const k = lcm(cyclicElementOrder(a, m), cyclicElementOrder(b, n))
    return {
      prompt: `What is the order of (${productName([m, n])})/⟨(${a}, ${b})⟩?`,
      answer: int((m * n) / k),
      solution: `|(${a}, ${b})| = lcm(${cyclicElementOrder(a, m)}, ${cyclicElementOrder(b, n)}) = ${k}, so the quotient has ${m * n} / ${k} = ${(m * n) / k} elements.`,
    }
  },
}

// ── Chapter 8: homomorphisms ──────────────────────────────────────────

export const homomorphismCount: Drill = {
  id: 'hom-count',
  title: 'Counting homomorphisms ℤₘ → ℤₙ',
  make: rng => {
    const m = randInt(rng, 2, 40)
    const n = randInt(rng, 2, 40)
    const g = gcd(m, n)
    return {
      prompt: `How many homomorphisms ${Z(m)} → ${Z(n)} are there?`,
      answer: int(g),
      solution: `A homomorphism is fixed by φ(1) = a, and a works exactly when ${m}a ≡ 0 (mod ${n}), i.e. when |a| divides ${m}. The elements of ${Z(n)} whose order divides ${m} form the subgroup of order gcd(${m}, ${n}) = ${g}.`,
    }
  },
}

export const homomorphismKernel: Drill = {
  id: 'hom-kernel',
  title: 'Kernels of maps ℤₘ → ℤₙ',
  make: rng => {
    let [m, n] = [0, 0]
    while (gcd(m, n) < 2) [m, n] = [randInt(rng, 4, 36), randInt(rng, 2, 36)]
    const step = n / gcd(m, n)
    const a = step * randInt(rng, 1, gcd(m, n) - 1)
    const imageSize = cyclicElementOrder(a, n)
    return {
      prompt: `φ: ${Z(m)} → ${Z(n)}, φ(x) = ${a}x, is a homomorphism. How many elements are in ker φ?`,
      answer: int(m / imageSize),
      solution: `The image is ⟨${a}⟩ ≤ ${Z(n)}, of order ${n}/gcd(${a}, ${n}) = ${imageSize}. By the First Isomorphism Theorem |ker φ| = ${m} / ${imageSize} = ${m / imageSize}.`,
    }
  },
}

export const surjectionCount: Drill = {
  id: 'hom-onto',
  title: 'Counting surjections ℤₘ → ℤₙ',
  make: rng => {
    const n = randInt(rng, 2, 20)
    const m = rng() < 0.7 ? n * randInt(rng, 1, 4) : randInt(rng, 2, 40)
    const onto = m % n === 0
    return {
      prompt: `How many surjective homomorphisms ${Z(m)} → ${Z(n)} are there?`,
      answer: int(onto ? totient(n) : 0),
      solution: onto
        ? `φ is onto exactly when φ(1) generates ${Z(n)}, and every generator is allowed because ${n} | ${m}. That is φ(${n}) = ${totient(n)} maps.`
        : `None (0): the image of ${Z(m)} has order dividing ${m}, and ${n} ∤ ${m}.`,
    }
  },
}

// ── Chapter 9: finite abelian groups ──────────────────────────────────

export const abelianCount: Drill = {
  id: 'abelian-count',
  title: 'How many abelian groups?',
  make: rng => {
    let n = 1
    let parts: Array<[number, number]> = []
    while (n === 1 || parts.every(([, e]) => e < 2) || n > 5000) {
      parts = [2, 3, 5, 7].map(p => [p, pick(rng, [0, 0, 1, 2, 3, 4])] as [number, number]).filter(([, e]) => e > 0)
      n = parts.reduce((acc, [p, e]) => acc * p ** e, 1)
    }
    const counts = parts.map(([, e]) => partitionCount(e))
    return {
      prompt: `How many abelian groups of order ${n} are there, up to isomorphism?`,
      answer: int(counts.reduce((a, b) => a * b, 1)),
      solution: `${n} = ${factorText(n)}. Each p-part is chosen independently, one per partition of its exponent: ${parts
        .map(([p, e], i) => `p(${e}) = ${counts[i]} for ${withExponent(p, e)}`)
        .join('; ')}. The total is ${counts.join(' · ')} = ${counts.reduce((a, b) => a * b, 1)}.`,
    }
  },
}

const SMALL_CYCLIC = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20]

export const toInvariantFactors: Drill = {
  id: 'invariant-factors',
  title: 'Invariant factors',
  make: rng => {
    const orders = Array.from({ length: randInt(rng, 2, 3) }, () => pick(rng, SMALL_CYCLIC))
    const factors = invariantFactors(orders)
    const elementary = orders.flatMap(a => factorize(a).map(([p, e]) => p ** e)).sort((x, y) => x - y)
    return {
      prompt: `Write ${productName(orders)} as ℤ_{n₁} × ⋯ × ℤ_{n_k} with n₁ | n₂ | ⋯ | n_k. Enter n₁, …, n_k.`,
      answer: list(...factors),
      solution: `Split into prime powers: ${productName(elementary)}. Build the last factor from the largest power of each prime, the one before from the next largest, and so on: ${productName(factors)}.`,
    }
  },
}

export const elementsOfPrimeOrder: Drill = {
  id: 'abelian-order-p',
  title: 'Elements of order p',
  make: rng => {
    const orders = Array.from({ length: randInt(rng, 2, 3) }, () => pick(rng, SMALL_CYCLIC))
    const primes = [...new Set(orders.flatMap(a => factorize(a).map(([p]) => p)))]
    const p = pick(rng, primes)
    const solutions = orders.map(a => gcd(p, a))
    const total = solutions.reduce((x, y) => x * y, 1)
    return {
      prompt: `How many elements of order ${p} does ${productName(orders)} have?`,
      answer: int(total - 1),
      solution: `px = 0 has gcd(${p}, a) solutions in ℤₐ, so ${solutions.join(' · ')} = ${total} solutions in the product. Every one except 0 has order ${p}: ${total - 1}.`,
    }
  },
}

// ── Chapter 10: group actions ─────────────────────────────────────────

export const necklaceCount: Drill = {
  id: 'necklaces',
  title: 'Necklaces by Burnside',
  make: rng => {
    const n = randInt(rng, 3, 8)
    const k = randInt(rng, 2, 3)
    const terms = Array.from({ length: n }, (_, j) => k ** gcd(j, n))
    const total = terms.reduce((a, b) => a + b, 0)
    return {
      prompt: `How many necklaces of ${n} beads in ${k} colors are there, counting two the same when one is a rotation of the other?`,
      answer: int(total / n),
      solution: `Burnside: average the fixed colorings over the ${n} rotations. Rotation by j fixes ${k}^gcd(j, ${n}) colorings: ${terms.join(' + ')} = ${total}. Divide by ${n}: ${total / n}.`,
    }
  },
}

export const symmetricClassSize: Drill = {
  id: 'sn-class-size',
  title: 'Conjugacy classes in Sₙ',
  make: rng => {
    const n = randInt(rng, 4, 7)
    const type = pick(
      rng,
      partitions(n).filter(t => t[0] > 1)
    )
    const multiplicity = new Map<number, number>()
    type.forEach(k => multiplicity.set(k, (multiplicity.get(k) ?? 0) + 1))
    const z = [...multiplicity].reduce((acc, [k, m]) => acc * k ** m * factorial(m), 1)
    const zText = [...multiplicity].map(([k, m]) => `${withExponent(k, m)}·${m}!`).join(' · ')
    const shown = type.filter(k => k > 1).join(', ')
    return {
      prompt: `How many elements of S${sub(n)} have cycle type (${type.join(', ')}) — that is, disjoint cycles of lengths ${shown}${type.includes(1) ? ' and the rest fixed' : ''}?`,
      answer: int(factorial(n) / z),
      solution: `Write the ${n} points in a row (${n}! ways) and bracket them into cycles of the given lengths. Each k-cycle can start at any of its k points, and equal-length cycles can be permuted, so each permutation is counted ${zText} = ${z} times: ${factorial(n)} / ${z} = ${factorial(n) / z}.`,
    }
  },
}

export const dihedralClassEquation: Drill = {
  id: 'dihedral-class-equation',
  title: 'Class equation of Dₙ',
  make: rng => {
    const n = randInt(rng, 3, 10)
    const sizes =
      n % 2 === 1
        ? [1, ...new Array<number>((n - 1) / 2).fill(2), n]
        : [1, 1, ...new Array<number>(n / 2 - 1).fill(2), n / 2, n / 2]
    return {
      prompt: `Give the class equation of D${sub(n)} (order ${2 * n}): the sizes of its conjugacy classes.`,
      answer: sum(...sizes),
      solution:
        n % 2 === 1
          ? `Conjugating rᵏ gives r^(±k), so the rotations ≠ e pair off into ${(n - 1) / 2} classes {rᵏ, r⁻ᵏ}. Since n is odd, all ${n} reflections are conjugate. ${sizes.join(' + ')} = ${2 * n}.`
          : `e and r^${n / 2} are central. The other rotations pair off into ${n / 2 - 1} classes {rᵏ, r⁻ᵏ}. The reflections split by parity: {srᵏ : k even} and {srᵏ : k odd}, ${n / 2} each. ${sizes.join(' + ')} = ${2 * n}.`,
    }
  },
}

// ── Chapter 11: Sylow ─────────────────────────────────────────────────

const SYLOW_ORDERS = [12, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 56, 60, 63, 72, 75, 84, 90, 96, 100, 105, 120, 132, 144, 168, 180, 200]

const sylowSplit = (n: number, p: number) => {
  let pk = 1
  while (n % (pk * p) === 0) pk *= p
  return { pk, m: n / pk }
}

export const sylowCounts: Drill = {
  id: 'sylow-counts',
  title: 'Allowed values of nₚ',
  make: rng => {
    const n = pick(rng, SYLOW_ORDERS)
    const p = pick(
      rng,
      factorize(n).map(([q]) => q)
    )
    const { pk, m } = sylowSplit(n, p)
    const allowed = divisors(m).filter(d => d % p === 1)
    return {
      prompt: `Let |G| = ${n}. List every value of n${sub(p)} that the Sylow theorems allow.`,
      answer: set(...allowed),
      solution: `${n} = ${pk} · ${m} with ${p} ∤ ${m}. n${sub(p)} divides ${m} — so lies in {${divisors(m).join(', ')}} — and n${sub(p)} ≡ 1 (mod ${p}). That leaves {${allowed.join(', ')}}.`,
    }
  },
}

export const sylowOrder: Drill = {
  id: 'sylow-order',
  title: 'Order of a Sylow subgroup',
  make: rng => {
    const n = pick(rng, [...SYLOW_ORDERS, 720, 5040, 1000, 2016])
    const p = pick(
      rng,
      factorize(n).map(([q]) => q)
    )
    const { pk, m } = sylowSplit(n, p)
    return {
      prompt: `What is the order of a Sylow ${p}-subgroup of a group of order ${n}?`,
      answer: int(pk),
      solution: `${n} = ${factorText(n)}; the largest power of ${p} dividing it is ${pk} (and ${p} ∤ ${m}).`,
    }
  },
}

// ── Chapter 12: simple and solvable groups ────────────────────────────

export const compositionLength: Drill = {
  id: 'composition-length',
  title: 'Composition length of ℤₙ',
  make: rng => {
    let n = 1
    while (n === 1 || isPrime(n)) n = randInt(rng, 6, 400)
    const omega = factorize(n).reduce((acc, [, e]) => acc + e, 0)
    return {
      prompt: `How many factors are in a composition series of ${Z(n)}?`,
      answer: int(omega),
      solution: `The composition factors of an abelian group are cyclic of prime order, and their orders multiply to ${n} = ${factorText(n)}. Counting primes with multiplicity gives ${omega}.`,
    }
  },
}

export const DRILLS = {
  groups: [unitOrder, unitInverse, dihedralProduct],
  subgroups: [cyclicOrder, cyclicGenerators, cyclicSubgroupCount, cyclicElementsOfOrder],
  permutations: [permutationProduct, permutationOrder, permutationSign, twoLineToCycles],
  isomorphisms: [automorphismsOfCyclic, cyclicUnits],
  lagrange: [eulerPower, cyclicIndex],
  products: [productElementOrder, productIsCyclic, productCountOfOrder],
  quotients: [quotientElementOrder, productQuotientOrder],
  homomorphisms: [homomorphismCount, homomorphismKernel, surjectionCount],
  abelian: [abelianCount, toInvariantFactors, elementsOfPrimeOrder],
  actions: [necklaceCount, symmetricClassSize, dihedralClassEquation],
  sylow: [sylowCounts, sylowOrder],
  simple: [compositionLength],
} as const satisfies Record<string, readonly Drill[]>
