export const DIFFICULTIES = {
  3: { label: 'Easy', seconds: 90 },
  4: { label: 'Medium', seconds: 120 },
  5: { label: 'Hard', seconds: 180 },
} as const

export const LENGTHS = [3, 4, 5] as const
export type Length = typeof LENGTHS[number]
export type Mode = 'quick' | 'daily' | 'sprint'

export interface Puzzle {
  start: string
  target: string
  optimalSteps: number
}

export function createDictionary(wordList: string, endpointList: string) {
  const words = new Set(wordList.trim().split(/\s+/).filter(word => /^[a-z]{3,5}$/.test(word)))
  const endpoints = [...new Set(endpointList.trim().split(/\s+/))].filter(word => words.has(word)).sort()
  if (!endpoints.length) throw new Error('Could not read the puzzle words')

  const patterns = new Map<string, string[]>()
  const patternsFor = (word: string) =>
    Array.from(word, (_, index) => word.slice(0, index) + '*' + word.slice(index + 1))

  for (const word of words) {
    for (const pattern of patternsFor(word)) {
      const group = patterns.get(pattern)
      if (group) group.push(word)
      else patterns.set(pattern, [word])
    }
  }

  function path(start: string, target: string, excluded: readonly string[] = []): string[] | null {
    if (start.length !== target.length || !words.has(start) || !words.has(target)) return null
    const parents = new Map<string, string | null>(excluded.map(word => [word, null]))
    const queue = [start]
    const visitedPatterns = new Set<string>()
    parents.set(start, null)

    for (let head = 0; head < queue.length; head++) {
      const word = queue[head]
      if (word === target) {
        const chain: string[] = []
        for (let at: string | null = word; at !== null; at = parents.get(at) ?? null) chain.push(at)
        return chain.reverse()
      }
      for (const pattern of patternsFor(word)) {
        if (visitedPatterns.has(pattern)) continue
        visitedPatterns.add(pattern)
        for (const next of patterns.get(pattern) ?? []) {
          if (parents.has(next)) continue
          queue.push(next)
          parents.set(next, word)
        }
      }
    }
    return null
  }

  function puzzle(length: Length, nextIndex: (size: number) => number): Puzzle | null {
    const candidates = endpoints.filter(word => word.length === length)
    if (candidates.length < 2) return null
    let fallback: Puzzle | null = null
    for (let attempt = 0; attempt < 150; attempt++) {
      const start = candidates[nextIndex(candidates.length)]
      const target = candidates[nextIndex(candidates.length)]
      if (start === target) continue
      const chain = path(start, target)
      if (!chain) continue
      const found = { start, target, optimalSteps: chain.length - 1 }
      if (chain.length >= 3 && chain.length <= 8) return found
      fallback ??= found
    }
    return fallback
  }

  return { has: (word: string) => words.has(word), path, puzzle }
}

export type Dictionary = ReturnType<typeof createDictionary>

// Use the iOS generator's 64-bit LCG and its count of whole calendar days
// from the Unix epoch to the start of today in the player's time zone.
export function dailyIndex(length: Length, date: Date): (size: number) => number {
  const epoch = new Date(0)
  const calendarDay = (value: Date) =>
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000
  const startsAtMidnight = epoch.getHours() === 0 && epoch.getMinutes() === 0 && epoch.getSeconds() === 0
  const days = calendarDay(date) - calendarDay(epoch) - (startsAtMidnight ? 0 : 1)
  let seed = BigInt.asUintN(64, BigInt(days) * 2654435761n + BigInt(length) * 7919n)
  return size => {
    seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n)
    return Number((seed >> 33n) % BigInt(size))
  }
}

export function makePuzzle(dictionary: Dictionary, mode: Mode, length: Length, date = new Date()): Puzzle | null {
  return dictionary.puzzle(length, mode === 'daily' ? dailyIndex(length, date) : size => Math.floor(Math.random() * size))
}

export function validateWord(dictionary: Dictionary, chain: string[], word: string): string | null {
  const previous = chain[chain.length - 1]
  if (word.length !== previous.length) return `Must be ${previous.length} letters`
  if (chain.includes(word)) return 'Already in the chain'
  if (!dictionary.has(word)) return 'Not in dictionary'
  const changes = Array.from(word).filter((letter, index) => letter !== previous[index]).length
  return changes === 1 ? null : 'Change exactly one letter'
}

export function scoreFor(moves: number, optimal: number): number {
  return moves === optimal ? 150 : Math.max(10, 100 - (moves - optimal) * 10)
}
