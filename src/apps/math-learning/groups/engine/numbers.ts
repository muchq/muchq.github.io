// Elementary number theory the course leans on: orders in ℤₙ, φ(n),
// divisor counts, and the partition counts behind the abelian-group tally.

export const mod = (a: number, n: number): number => ((a % n) + n) % n

export const gcd = (a: number, b: number): number => {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) [x, y] = [y, x % y]
  return x
}

export const lcm = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : Math.abs((a / gcd(a, b)) * b))

export const lcmAll = (xs: readonly number[]): number => xs.reduce(lcm, 1)

export const divisors = (n: number): number[] => {
  const out: number[] = []
  for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d)
  return out
}

/** Prime factorization as [prime, exponent] pairs, primes ascending. */
export const factorize = (n: number): Array<[number, number]> => {
  const out: Array<[number, number]> = []
  let m = n
  for (let p = 2; p * p <= m; p++) {
    let e = 0
    while (m % p === 0) {
      m /= p
      e++
    }
    if (e > 0) out.push([p, e])
  }
  if (m > 1) out.push([m, 1])
  return out
}

export const isPrime = (n: number): boolean => {
  const f = factorize(n)
  return n >= 2 && f.length === 1 && f[0][1] === 1
}

/** Euler's φ: how many of 1..n are coprime to n. */
export const totient = (n: number): number =>
  factorize(n).reduce((acc, [p, e]) => acc * (p - 1) * p ** (e - 1), 1)

/** Number of integer partitions of k. */
export const partitionCount = (k: number): number => {
  const ways = new Array<number>(k + 1).fill(0)
  ways[0] = 1
  for (let part = 1; part <= k; part++) {
    for (let total = part; total <= k; total++) ways[total] += ways[total - part]
  }
  return ways[k]
}

/** Integer partitions of k, each as a descending list of parts. */
export const partitions = (k: number, max: number = k): number[][] => {
  if (k === 0) return [[]]
  const out: number[][] = []
  for (let first = Math.min(k, max); first >= 1; first--) {
    for (const rest of partitions(k - first, first)) out.push([first, ...rest])
  }
  return out
}

/** Abelian groups of order n up to isomorphism: ∏ p(eᵢ) over n = ∏ pᵢ^eᵢ. */
export const abelianGroupCount = (n: number): number =>
  factorize(n).reduce((acc, [, e]) => acc * partitionCount(e), 1)

export const powMod = (base: number, exp: number, n: number): number => {
  let result = 1 % n
  let b = mod(base, n)
  let e = exp
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % n
    b = (b * b) % n
    e = Math.floor(e / 2)
  }
  return result
}

/**
 * Invariant factors of ℤ_{a₁} × … × ℤ_{a_k}, ascending, each dividing the
 * next, ones dropped. The trivial group has none.
 */
export const invariantFactors = (orders: readonly number[]): number[] => {
  // Elementary divisors grouped by prime, largest power first.
  const byPrime = new Map<number, number[]>()
  for (const a of orders) {
    for (const [p, e] of factorize(a)) {
      const powers = byPrime.get(p) ?? []
      powers.push(p ** e)
      byPrime.set(p, powers)
    }
  }
  const columns = [...byPrime.values()].map(powers => powers.sort((x, y) => y - x))
  const length = Math.max(0, ...columns.map(c => c.length))
  const factors: number[] = []
  for (let i = 0; i < length; i++) {
    factors.push(columns.reduce((acc, col) => acc * (col[i] ?? 1), 1))
  }
  return factors.reverse()
}
