import { directProduct, fromOperation, type FiniteGroup } from './finiteGroup'
import { gcd, mod } from './numbers'
import { allPerms, compose, formatCycles, sign, type Perm } from './permutations'

const SUB = '₀₁₂₃₄₅₆₇₈₉'
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
export const sub = (n: number): string => [...String(n)].map(d => SUB[Number(d)]).join('')
export const sup = (n: number): string => [...String(n)].map(d => SUP[Number(d)]).join('')

export const cyclic = (n: number): FiniteGroup =>
  fromOperation(
    `ℤ${sub(n)}`,
    Array.from({ length: n }, (_, k) => k),
    (a, b) => (a + b) % n,
    String,
    String
  )

/** U(n): the units mod n under multiplication. */
export const units = (n: number): FiniteGroup =>
  fromOperation(
    `U(${n})`,
    Array.from({ length: n }, (_, k) => k).filter(k => gcd(k, n) === 1 && (n > 1 || k === 0)),
    (a, b) => (a * b) % n,
    String,
    String
  )

const rotation = (i: number): string => (i === 0 ? '' : i === 1 ? 'r' : `r${sup(i)}`)

/** sᶠʳᵗ written the way the course writes it: e, r, r², …, s, sr, sr², … */
export const dihedralLabel = (flip: number, turn: number): string =>
  flip === 0 ? rotation(turn) || 'e' : `s${rotation(turn)}`

/**
 * Dₙ, the 2n symmetries of a regular n-gon: rotations rⁱ and reflections
 * srⁱ, with rⁿ = s² = e and rs = sr⁻¹. (Some books call this D₂ₙ.)
 */
export const dihedral = (n: number): FiniteGroup => {
  type D = readonly [flip: number, turn: number]
  const elements: D[] = []
  for (const flip of [0, 1]) for (let turn = 0; turn < n; turn++) elements.push([flip, turn])
  return fromOperation<D>(
    `D${sub(n)}`,
    elements,
    // (sᵃrⁱ)(sᵇrʲ) = sᵃ⁺ᵇ r^(±i + j): moving rⁱ past sᵇ inverts it when b = 1.
    ([a, i], [b, j]) => [(a + b) % 2, mod(b === 0 ? i + j : j - i, n)],
    ([f, t]) => `${f},${t}`,
    ([f, t]) => dihedralLabel(f, t)
  )
}

export const symmetric = (n: number): FiniteGroup =>
  fromOperation<Perm>(`S${sub(n)}`, allPerms(n), compose, p => p.join(','), formatCycles)

export const alternating = (n: number): FiniteGroup =>
  fromOperation<Perm>(
    `A${sub(n)}`,
    allPerms(n).filter(p => sign(p) === 1),
    compose,
    p => p.join(','),
    formatCycles
  )

// Q₈ = {±1, ±i, ±j, ±k}: an element is [sign, unit] with units 1, i, j, k.
const UNIT = ['1', 'i', 'j', 'k']
// UNIT_PRODUCT[u][v] = [sign, unit] of u·v; i² = j² = k² = ijk = −1.
const UNIT_PRODUCT: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[1, 0], [1, 1], [1, 2], [1, 3]],
  [[1, 1], [-1, 0], [1, 3], [-1, 2]],
  [[1, 2], [-1, 3], [-1, 0], [1, 1]],
  [[1, 3], [1, 2], [-1, 1], [-1, 0]],
]

export const quaternion = (): FiniteGroup => {
  type Q = readonly [sign: number, unit: number]
  const elements: Q[] = [0, 1, 2, 3].flatMap(u => [[1, u] as const, [-1, u] as const])
  return fromOperation<Q>(
    'Q₈',
    elements,
    ([s, u], [t, v]) => {
      const [w, unit] = UNIT_PRODUCT[u][v]
      return [s * t * w, unit]
    },
    ([s, u]) => `${s},${u}`,
    ([s, u]) => `${s < 0 ? '−' : ''}${UNIT[u]}`
  )
}

export const product = (...orders: number[]): FiniteGroup => directProduct(orders.map(cyclic))

export interface CatalogEntry {
  readonly id: string
  readonly name: string
  readonly family: string
  readonly build: () => FiniteGroup
}

// Built on first use and kept: A₅'s table is 3600 cells.
const entry = (id: string, family: string, build: () => FiniteGroup): CatalogEntry => {
  let memo: FiniteGroup | undefined
  const lazy = () => (memo ??= build())
  return {
    id,
    family,
    build: lazy,
    get name() {
      return lazy().name
    },
  }
}

/** The small groups the lab offers, grouped for the picker. */
export const CATALOG: readonly CatalogEntry[] = [
  ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => entry(`Z${n}`, 'Cyclic', () => cyclic(n))),
  ...[8, 9, 10, 12, 15, 16, 20].map(n => entry(`U${n}`, 'Units mod n', () => units(n))),
  ...[3, 4, 5, 6].map(n => entry(`D${n}`, 'Dihedral', () => dihedral(n))),
  entry('S3', 'Symmetric & alternating', () => symmetric(3)),
  entry('S4', 'Symmetric & alternating', () => symmetric(4)),
  entry('A4', 'Symmetric & alternating', () => alternating(4)),
  entry('A5', 'Symmetric & alternating', () => alternating(5)),
  entry('Q8', 'Other', quaternion),
  entry('Z2xZ2', 'Products', () => product(2, 2)),
  entry('Z2xZ4', 'Products', () => product(2, 4)),
  entry('Z2xZ2xZ2', 'Products', () => product(2, 2, 2)),
  entry('Z3xZ3', 'Products', () => product(3, 3)),
  entry('Z2xZ6', 'Products', () => product(2, 6)),
  entry('Z4xZ4', 'Products', () => product(4, 4)),
]

export const catalogGroup = (id: string): FiniteGroup => {
  const found = CATALOG.find(e => e.id === id)
  if (!found) throw new Error(`no group ${id} in the catalog`)
  return found.build()
}
