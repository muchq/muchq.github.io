// A finite group as its Cayley table. Elements are the indices 0…n−1;
// labels are for people. Every structural question the course asks of a
// small group — orders, subgroups, cosets, normality, quotients,
// conjugacy — is answered here by brute force over the table, which is
// both obviously correct and fast enough for groups of order ≤ 60.

export interface FiniteGroup {
  readonly name: string
  readonly labels: readonly string[]
  /** table[a][b] is the index of a·b */
  readonly table: readonly (readonly number[])[]
  readonly identity: number
  readonly inverses: readonly number[]
}

export type Subset = readonly number[]

/**
 * Builds the Cayley table of `elements` under `op`. Throws if the set is
 * not closed or has no identity or inverses; associativity is the
 * caller's to guarantee (and the catalog's tests check it).
 */
export const fromOperation = <T>(
  name: string,
  elements: readonly T[],
  op: (a: T, b: T) => T,
  key: (a: T) => string,
  label: (a: T) => string
): FiniteGroup => {
  const index = new Map(elements.map((x, i) => [key(x), i]))
  if (index.size !== elements.length) throw new Error(`${name}: duplicate elements`)
  const table = elements.map(a =>
    elements.map(b => {
      const i = index.get(key(op(a, b)))
      if (i === undefined) throw new Error(`${name}: not closed`)
      return i
    })
  )
  return fromTable(name, elements.map(label), table)
}

export const fromTable = (name: string, labels: readonly string[], table: readonly (readonly number[])[]): FiniteGroup => {
  const n = labels.length
  const all = range(n)
  const identity = all.find(e => all.every(a => table[e][a] === a && table[a][e] === a))
  if (identity === undefined) throw new Error(`${name}: no identity`)
  const inverses = all.map(a => {
    const b = all.find(x => table[a][x] === identity && table[x][a] === identity)
    if (b === undefined) throw new Error(`${name}: ${labels[a]} has no inverse`)
    return b
  })
  return { name, labels, table, identity, inverses }
}

export const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i)

export const order = (G: FiniteGroup): number => G.labels.length

export const mul = (G: FiniteGroup, a: number, b: number): number => G.table[a][b]

export const pow = (G: FiniteGroup, a: number, k: number): number => {
  const base = k < 0 ? G.inverses[a] : a
  let result = G.identity
  for (let i = 0; i < Math.abs(k); i++) result = G.table[result][base]
  return result
}

export const elementOrder = (G: FiniteGroup, a: number): number => {
  let k = 1
  for (let x = a; x !== G.identity; x = G.table[x][a]) k++
  return k
}

export const isAssociative = (G: FiniteGroup): boolean => {
  const n = order(G)
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++)
      for (let c = 0; c < n; c++) if (G.table[G.table[a][b]][c] !== G.table[a][G.table[b][c]]) return false
  return true
}

export const isAbelian = (G: FiniteGroup): boolean =>
  G.table.every((row, a) => row.every((ab, b) => ab === G.table[b][a]))

export const isCyclic = (G: FiniteGroup): boolean => range(order(G)).some(a => elementOrder(G, a) === order(G))

/** How many elements have each order: {1: 1, 2: 3, …}. An isomorphism invariant. */
export const orderStatistics = (G: FiniteGroup): Map<number, number> => {
  const stats = new Map<number, number>()
  for (const a of range(order(G))) {
    const k = elementOrder(G, a)
    stats.set(k, (stats.get(k) ?? 0) + 1)
  }
  return new Map([...stats.entries()].sort(([x], [y]) => x - y))
}

const sorted = (xs: Iterable<number>): number[] => [...xs].sort((a, b) => a - b)

const keyOf = (s: Subset): string => s.join(',')

/** The subgroup ⟨gens⟩, sorted. In a finite group, closing under products suffices. */
export const generate = (G: FiniteGroup, gens: Subset): number[] => {
  const members = new Set([G.identity])
  const queue = [G.identity]
  for (let i = 0; i < queue.length; i++) {
    for (const g of gens) {
      const y = G.table[queue[i]][g]
      if (!members.has(y)) {
        members.add(y)
        queue.push(y)
      }
    }
  }
  return sorted(members)
}

export const isSubgroup = (G: FiniteGroup, H: Subset): boolean => {
  const members = new Set(H)
  return H.length > 0 && H.every(a => H.every(b => members.has(G.table[a][G.inverses[b]])))
}

/**
 * Every subgroup, sorted by order and then lexicographically. Each subgroup
 * is reached from {e} by adjoining one element at a time, so closing the
 * family under "adjoin an element" finds them all.
 */
export const subgroups = (G: FiniteGroup): number[][] => {
  const found = new Map<string, number[]>()
  const trivial = [G.identity]
  found.set(keyOf(trivial), trivial)
  const queue = [trivial]
  for (let i = 0; i < queue.length; i++) {
    const H = queue[i]
    const inH = new Set(H)
    for (const g of range(order(G))) {
      if (inH.has(g)) continue
      const K = generate(G, [...H, g])
      const k = keyOf(K)
      if (!found.has(k)) {
        found.set(k, K)
        queue.push(K)
      }
    }
  }
  return [...found.values()].sort((a, b) => a.length - b.length || compareLex(a, b))
}

const compareLex = (a: Subset, b: Subset): number => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]
  return a.length - b.length
}

export const center = (G: FiniteGroup): number[] => centralizer(G, range(order(G)))

export const centralizer = (G: FiniteGroup, S: Subset): number[] =>
  range(order(G)).filter(g => S.every(s => G.table[g][s] === G.table[s][g]))

/** g·x·g⁻¹ */
export const conjugate = (G: FiniteGroup, g: number, x: number): number => G.table[G.table[g][x]][G.inverses[g]]

export const conjugateSet = (G: FiniteGroup, g: number, H: Subset): number[] => sorted(new Set(H.map(h => conjugate(G, g, h))))

export const normalizer = (G: FiniteGroup, H: Subset): number[] => {
  const k = keyOf(sorted(H))
  return range(order(G)).filter(g => keyOf(conjugateSet(G, g, H)) === k)
}

export const isNormal = (G: FiniteGroup, H: Subset): boolean => normalizer(G, H).length === order(G)

export const normalSubgroups = (G: FiniteGroup): number[][] => subgroups(G).filter(H => isNormal(G, H))

/** Conjugacy classes, the identity's first, each sorted, ordered by least element. */
export const conjugacyClasses = (G: FiniteGroup): number[][] => {
  const seen = new Set<number>()
  const classes: number[][] = []
  for (const x of [G.identity, ...range(order(G))]) {
    if (seen.has(x)) continue
    const cls = sorted(new Set(range(order(G)).map(g => conjugate(G, g, x))))
    cls.forEach(m => seen.add(m))
    classes.push(cls)
  }
  return classes
}

export const leftCoset = (G: FiniteGroup, g: number, H: Subset): number[] => sorted(H.map(h => G.table[g][h]))

export const rightCoset = (G: FiniteGroup, H: Subset, g: number): number[] => sorted(H.map(h => G.table[h][g]))

const cosets = (G: FiniteGroup, coset: (g: number) => number[]): number[][] => {
  const seen = new Set<number>()
  const out: number[][] = []
  // H itself first, then by least element.
  for (const g of [G.identity, ...range(order(G))]) {
    if (seen.has(g)) continue
    const C = coset(g)
    C.forEach(c => seen.add(c))
    out.push(C)
  }
  return out
}

export const leftCosets = (G: FiniteGroup, H: Subset): number[][] => cosets(G, g => leftCoset(G, g, H))

export const rightCosets = (G: FiniteGroup, H: Subset): number[][] => cosets(G, g => rightCoset(G, H, g))

/**
 * G/N for a normal subgroup N. Each coset is labeled by its least-index
 * representative, so the identity coset reads as N itself.
 */
export const quotient = (G: FiniteGroup, N: Subset, nName = 'N'): FiniteGroup => {
  if (!isSubgroup(G, N) || !isNormal(G, N)) throw new Error(`${nName} is not a normal subgroup of ${G.name}`)
  const classes = leftCosets(G, N)
  const which = new Map<number, number>()
  classes.forEach((C, i) => C.forEach(g => which.set(g, i)))
  const labels = classes.map(C => (C.includes(G.identity) ? nName : `${G.labels[C[0]]}${nName}`))
  const table = classes.map(A => classes.map(B => which.get(G.table[A[0]][B[0]])!))
  return fromTable(`${G.name}/${nName}`, labels, table)
}

/** The commutator (derived) subgroup G′ = ⟨aba⁻¹b⁻¹⟩. */
export const commutatorSubgroup = (G: FiniteGroup): number[] => {
  const commutators = new Set<number>()
  for (const a of range(order(G)))
    for (const b of range(order(G))) commutators.add(G.table[G.table[a][b]][G.inverses[G.table[b][a]]])
  return generate(G, [...commutators])
}

/** Restricts G to a subgroup H, relabeling nothing. */
export const subgroupAsGroup = (G: FiniteGroup, H: Subset, name: string): FiniteGroup => {
  if (!isSubgroup(G, H)) throw new Error(`${name} is not a subgroup of ${G.name}`)
  const position = new Map(H.map((h, i) => [h, i]))
  return fromTable(
    name,
    H.map(h => G.labels[h]),
    H.map(a => H.map(b => position.get(G.table[a][b])!))
  )
}

/** Componentwise product G₁ × … × G_k, elements labeled "(a, b, …)". */
export const directProduct = (factors: readonly FiniteGroup[], name?: string): FiniteGroup => {
  const tuples: number[][] = factors.reduce<number[][]>(
    (acc, F) => acc.flatMap(t => range(order(F)).map(x => [...t, x])),
    [[]]
  )
  return fromOperation(
    name ?? factors.map(F => F.name).join(' × '),
    tuples,
    (a, b) => a.map((x, i) => factors[i].table[x][b[i]]),
    t => t.join(','),
    t => `(${t.map((x, i) => factors[i].labels[x]).join(', ')})`
  )
}

/** Whether f (indexed by G's elements, valued in H's) is a homomorphism. */
export const isHomomorphism = (G: FiniteGroup, H: FiniteGroup, f: readonly number[]): boolean =>
  range(order(G)).every(a => range(order(G)).every(b => f[G.table[a][b]] === H.table[f[a]][f[b]]))

/** Every homomorphism G → H, by brute force over maps of a generating set. */
export const homomorphisms = (G: FiniteGroup, H: FiniteGroup): number[][] => {
  const gens = smallGeneratingSet(G)
  const out: number[][] = []
  const assign = (images: number[]) => {
    if (images.length === gens.length) {
      const f = extend(G, H, gens, images)
      if (f !== null) out.push(f)
      return
    }
    for (const h of range(order(H))) assign([...images, h])
  }
  assign([])
  return out
}

/** A generating set for G, built greedily: adjoin elements until the whole group is reached. */
export const smallGeneratingSet = (G: FiniteGroup): number[] => generatorsOf(G, range(order(G)))

/** A short generating set for the subgroup H, highest-order elements first. */
export const generatorsOf = (G: FiniteGroup, H: Subset): number[] => {
  const gens: number[] = []
  let span = [G.identity]
  const byOrder = [...H].sort((a, b) => elementOrder(G, b) - elementOrder(G, a) || a - b)
  for (const g of byOrder) {
    if (span.length === H.length) break
    if (!span.includes(g)) {
      gens.push(g)
      span = generate(G, gens)
    }
  }
  return gens
}

/** "⟨r, s⟩", "{e}", or the group's own name for G itself. */
export const subgroupName = (G: FiniteGroup, H: Subset): string => {
  if (H.length === 1) return `{${G.labels[G.identity]}}`
  if (H.length === order(G)) return G.name
  return `⟨${generatorsOf(G, H)
    .map(g => G.labels[g])
    .join(', ')}⟩`
}

/** Extends gens ↦ images to a map on all of G if that defines a homomorphism. */
const extend = (G: FiniteGroup, H: FiniteGroup, gens: Subset, images: Subset): number[] | null => {
  const f = new Array<number>(order(G)).fill(-1)
  f[G.identity] = H.identity
  const queue = [G.identity]
  for (let i = 0; i < queue.length; i++) {
    const x = queue[i]
    gens.forEach((g, j) => {
      const y = G.table[x][g]
      const fy = H.table[f[x]][images[j]]
      if (f[y] === -1) {
        f[y] = fy
        queue.push(y)
      }
    })
  }
  return isHomomorphism(G, H, f) ? f : null
}

export const kernel = (G: FiniteGroup, H: FiniteGroup, f: readonly number[]): number[] =>
  range(order(G)).filter(g => f[g] === H.identity)

export const image = (f: readonly number[]): number[] => sorted(new Set(f))

/** Looks up elements by label; throws on an unknown label so typos in content fail loudly. */
export const byLabel = (G: FiniteGroup, ...labels: string[]): number[] =>
  labels.map(l => {
    const i = G.labels.indexOf(l)
    if (i < 0) throw new Error(`${G.name} has no element labeled ${l}`)
    return i
  })
