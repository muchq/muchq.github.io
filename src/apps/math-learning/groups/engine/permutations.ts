import { lcmAll } from './numbers'

// A permutation of {1, …, n} stored 0-based: p[i] is the image of i + 1,
// minus one. Everything user-facing is 1-based; only the array is not.
export type Perm = readonly number[]

export const identityPerm = (n: number): Perm => Array.from({ length: n }, (_, i) => i)

/** s ∘ t: apply t first, then s — the course's right-to-left convention. */
export const compose = (s: Perm, t: Perm): Perm => t.map(x => s[x])

export const invert = (p: Perm): Perm => {
  const q = new Array<number>(p.length)
  p.forEach((image, x) => {
    q[image] = x
  })
  return q
}

export const isIdentity = (p: Perm): boolean => p.every((image, x) => image === x)

export const permEquals = (a: Perm, b: Perm): boolean => a.length === b.length && a.every((x, i) => x === b[i])

/** Disjoint cycles, 1-based, fixed points dropped, each led by its least element. */
export const cycles = (p: Perm): number[][] => {
  const seen = new Array<boolean>(p.length).fill(false)
  const out: number[][] = []
  for (let start = 0; start < p.length; start++) {
    if (seen[start]) continue
    const cycle: number[] = []
    for (let x = start; !seen[x]; x = p[x]) {
      seen[x] = true
      cycle.push(x + 1)
    }
    if (cycle.length > 1) out.push(cycle)
  }
  return out
}

export const formatCycles = (p: Perm): string => {
  const cs = cycles(p)
  return cs.length === 0 ? 'e' : cs.map(c => `(${c.join(' ')})`).join('')
}

/** Cycle lengths including fixed points, descending: a partition of n. */
export const cycleType = (p: Perm): number[] => {
  const moved = cycles(p).map(c => c.length)
  const fixed = p.length - moved.reduce((a, b) => a + b, 0)
  return [...moved, ...new Array<number>(fixed).fill(1)].sort((a, b) => b - a)
}

export const permOrder = (p: Perm): number => lcmAll(cycles(p).map(c => c.length))

/** sgn(σ) = (−1)^(n − number of cycles, fixed points counted). */
export const sign = (p: Perm): 1 | -1 => ((p.length - cycleType(p).length) % 2 === 0 ? 1 : -1)

export const power = (p: Perm, k: number): Perm => {
  const base = k < 0 ? invert(p) : p
  let result = identityPerm(p.length)
  for (let i = 0; i < Math.abs(k); i++) result = compose(base, result)
  return result
}

/** All permutations of {1, …, n} in lexicographic order of their image rows. */
export const allPerms = (n: number): Perm[] => {
  if (n === 0) return [[]]
  const out: Perm[] = []
  const walk = (prefix: number[], rest: number[]) => {
    if (rest.length === 0) {
      out.push(prefix)
      return
    }
    rest.forEach((x, i) => walk([...prefix, x], [...rest.slice(0, i), ...rest.slice(i + 1)]))
  }
  walk([], identityPerm(n) as number[])
  return out
}

const IDENTITY_WORDS = /^(e|id|identity|ε|ι)$/i

/**
 * Parses cycle notation in Sₙ — "(1 2 3)(4 5)", "(1,2,3)", or "(123)(45)"
 * when n ≤ 9 — into a permutation. Cycles needn't be disjoint; they are
 * multiplied right to left. "e", "id", and "()" are the identity.
 * Returns null for anything that isn't a permutation of {1, …, n}.
 */
export const parseCycles = (input: string, n: number): Perm | null => {
  const text = input.trim()
  if (IDENTITY_WORDS.test(text)) return identityPerm(n)
  if (!/^(\s*\([^()]*\)\s*)+$/.test(text)) return null
  let result = identityPerm(n)
  for (const [, body] of text.matchAll(/\(([^()]*)\)/g)) {
    const inner = body.trim()
    if (inner === '') continue
    const tokens = /[\s,]/.test(inner) ? inner.split(/[\s,]+/).filter(Boolean) : n <= 9 ? [...inner] : [inner]
    if (!tokens.every(t => /^\d+$/.test(t))) return null
    const points = tokens.map(Number)
    if (points.some(x => x < 1 || x > n) || new Set(points).size !== points.length) return null
    const cycle = identityPerm(n) as number[]
    points.forEach((x, i) => {
      cycle[x - 1] = points[(i + 1) % points.length] - 1
    })
    result = compose(result, cycle)
  }
  return result
}

/** Parses the bottom row of two-line notation, "2 3 1", into a permutation. */
export const parseImages = (input: string): Perm | null => {
  const tokens = input.trim().split(/[\s,]+/).filter(Boolean)
  if (tokens.length === 0 || !tokens.every(t => /^\d+$/.test(t))) return null
  const images = tokens.map(t => Number(t) - 1)
  const n = images.length
  if (images.some(x => x < 0 || x >= n) || new Set(images).size !== n) return null
  return images
}
