import type { Length, Mode, Move, Puzzle } from '../../src/apps/wordchains/solo/contract.ts'
import { createDictionary, makePuzzle, scoreFor, validateWord } from './puzzles.ts'
import { endpoints, words } from './words.ts'

export const MAX_SOLO_BODY = 96_000
const MAX_WORDS = 10_000
const wordPattern = /^[a-z]{3,5}$/
let dictionary: ReturnType<typeof createDictionary> | undefined

const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

const invalid = () => json({ error: 'Invalid Word Chains request' }, 400)
const isMode = (value: unknown): value is Mode => value === 'quick' || value === 'daily' || value === 'sprint'
const isLength = (value: unknown): value is Length => value === 3 || value === 4 || value === 5
const isWord = (value: unknown): value is string => typeof value === 'string' && wordPattern.test(value)

function isPuzzle(value: unknown): value is Puzzle {
  return !!value && typeof value === 'object' && 'start' in value && 'target' in value
    && isWord(value.start) && isWord(value.target)
    && value.start.length === value.target.length && value.start !== value.target
}

export async function readSoloRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  if (!request.body) return invalid()

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_SOLO_BODY) {
        await reader.cancel()
        return json({ error: 'Request too large' }, 413)
      }
      text += decoder.decode(value, { stream: true })
    }
    return handleSolo(JSON.parse(text + decoder.decode()))
  } catch {
    return invalid()
  } finally {
    reader.releaseLock()
  }
}

export function handleSolo(value: unknown): Response {
  if (typeof value !== 'object' || value === null) return invalid()
  const body = value as Record<string, unknown>
  if (body.action === 'start') {
    if (!isMode(body.mode) || !isLength(body.length)) return invalid()
    const lexicon = dictionary ??= createDictionary(words, endpoints)
    const puzzle = makePuzzle(lexicon, body.mode, body.length)
    if (!puzzle) return json({ error: 'Could not generate a puzzle' }, 503)
    return json({ start: puzzle.start, target: puzzle.target })
  }
  if (body.action !== 'play' && body.action !== 'hint') return invalid()
  if (body.action === 'hint' && body.mode !== 'quick') return invalid()
  const { puzzle, chain } = body
  if (!isPuzzle(puzzle) || !Array.isArray(chain) || chain.length > MAX_WORDS || chain[0] !== puzzle.start) return invalid()

  const lexicon = dictionary ??= createDictionary(words, endpoints)
  if (!lexicon.has(puzzle.start) || !lexicon.has(puzzle.target)) return invalid()
  const seen = new Set([puzzle.start])
  for (let index = 1; index < chain.length; index++) {
    const word = chain[index]
    if (!isWord(word) || word === puzzle.target || seen.has(word) || validateWord(lexicon, [chain[index - 1]], word)) return invalid()
    seen.add(word)
  }

  if (body.action === 'hint') {
    const path = lexicon.path(chain[chain.length - 1], puzzle.target, chain.slice(0, -1))
    return json({ word: path?.[1] ?? null })
  }

  if (typeof body.word !== 'string' || body.word.length > 64) return invalid()
  const feedback = validateWord(lexicon, chain, body.word)
  if (feedback) return json({ status: 'rejected', feedback } satisfies Move)
  if (body.word !== puzzle.target) return json({ status: 'accepted' } satisfies Move)
  const path = lexicon.path(puzzle.start, puzzle.target)
  if (!path) return invalid()
  const optimalSteps = path.length - 1
  return json({ status: 'solved', result: { optimalSteps, points: scoreFor(chain.length, optimalSteps) } } satisfies Move)
}
