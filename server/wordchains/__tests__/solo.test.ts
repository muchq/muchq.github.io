import { afterEach, describe, expect, it } from 'vitest'
import { scoreFor } from '../puzzles.ts'
import { MAX_SOLO_BODY, handleSolo, readSoloRequest } from '../service.ts'

const url = 'http://localhost/api/wordchains/solo'
const catToDog = { start: 'cat', target: 'dog' }

const bodyOf = async (response: Response) => response.json()

const postRequest = (payload: string) => readSoloRequest(new Request(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: payload,
}))

describe('scoring', () => {
  it('pays 150 for the optimal ladder, 10 less per extra step, and never less than 10', () => {
    expect(scoreFor(3, 3)).toBe(150)
    expect(scoreFor(4, 3)).toBe(90)
    expect(scoreFor(12, 3)).toBe(10)
    expect(scoreFor(30, 3)).toBe(10)
  })
})

describe('a solo request', () => {
  const previousTz = process.env.TZ
  afterEach(() => {
    if (previousTz === undefined) delete process.env.TZ
    else process.env.TZ = previousTz
  })

  it('repeats a daily puzzle through a UTC day and rolls it at UTC midnight', async () => {
    process.env.TZ = 'America/New_York'
    const morning = new Date('2026-11-26T15:00:00Z')
    const stillThatUtcDay = new Date('2026-11-26T23:30:00Z')
    // 10pm in New York on the 26th, which is already the next UTC day.
    const sameLocalDay = new Date('2026-11-27T03:00:00Z')
    const first = await bodyOf(handleSolo({ action: 'start', mode: 'daily', length: 3 }, morning))
    const second = await bodyOf(handleSolo({ action: 'start', mode: 'daily', length: 3 }, morning))
    const later = await bodyOf(handleSolo({ action: 'start', mode: 'daily', length: 3 }, stillThatUtcDay))
    const nextUtcDay = await bodyOf(handleSolo({ action: 'start', mode: 'daily', length: 3 }, sameLocalDay))

    expect(first).toEqual({ start: 'vie', target: 'ban' })
    expect(second).toEqual(first)
    expect(later).toEqual(first)
    expect(nextUtcDay).not.toEqual(first)
    expect(Object.keys(first).sort()).toEqual(['start', 'target'])
  })

  it('rejects a hint unless the request says Quick Play', async () => {
    const quick = await handleSolo({ action: 'hint', mode: 'quick', puzzle: catToDog, chain: ['cat'] })
    expect(quick.status).toBe(200)
    expect(await bodyOf(quick)).toEqual({ word: 'cot' })

    const daily = await handleSolo({ action: 'hint', mode: 'daily', puzzle: catToDog, chain: ['cat'] })
    expect(daily.status).toBe(400)
    const sprint = await handleSolo({ action: 'hint', mode: 'sprint', puzzle: catToDog, chain: ['cat'] })
    expect(sprint.status).toBe(400)
    const omitted = await handleSolo({ action: 'hint', puzzle: catToDog, chain: ['cat'] })
    expect(omitted.status).toBe(400)
  })

  it('scores an optimal cat to dog at 150 and a longer ladder lower', async () => {
    const puzzle = catToDog
    const play = (chain: string[], word: string) => bodyOf(handleSolo({ action: 'play', puzzle, chain, word }))

    expect(await play(['cat'], 'cot')).toEqual({ status: 'accepted' })
    expect(await play(['cat', 'cot'], 'dot')).toEqual({ status: 'accepted' })
    expect(await play(['cat', 'cot', 'dot'], 'dog')).toEqual({
      status: 'solved',
      result: { optimalSteps: 3, points: 150 },
    })
    expect(await play(['cat'], 'hat')).toEqual({ status: 'accepted' })
    expect(await play(['cat', 'hat'], 'hot')).toEqual({ status: 'accepted' })
    expect(await play(['cat', 'hat', 'hot'], 'dot')).toEqual({ status: 'accepted' })
    expect(await play(['cat', 'hat', 'hot', 'dot'], 'dog')).toEqual({
      status: 'solved',
      result: { optimalSteps: 3, points: 90 },
    })
  })

  it('rejects a move for the reason the board says, and a chain that never happened', async () => {
    const play = (chain: string[], word: string) => bodyOf(handleSolo({ action: 'play', puzzle: catToDog, chain, word }))
    expect(await play(['cat'], 'cats')).toEqual({ status: 'rejected', feedback: 'Must be 3 letters' })
    expect(await play(['cat'], 'cat')).toEqual({ status: 'rejected', feedback: 'Already in the chain' })
    expect(await play(['cat'], 'zzz')).toEqual({ status: 'rejected', feedback: 'Not in dictionary' })
    expect(await play(['cat'], 'CAT')).toEqual({ status: 'rejected', feedback: 'Not in dictionary' })
    expect(await play(['cat'], 'dog')).toEqual({ status: 'rejected', feedback: 'Change exactly one letter' })

    expect((await handleSolo({ action: 'play', puzzle: catToDog, chain: ['cot'], word: 'dot' })).status).toBe(400)
    expect((await handleSolo({ action: 'play', puzzle: catToDog, chain: ['cat', 'dog'], word: 'dot' })).status).toBe(400)
    expect((await handleSolo({ action: 'start', mode: 'quick' })).status).toBe(400)
    expect((await handleSolo({ action: 'nope' })).status).toBe(400)
  })

  it('refuses a body over the limit and answers anything but POST with 405', async () => {
    const small = JSON.stringify({ action: 'start', mode: 'quick', length: 4 })
    const allowed = await postRequest(small)
    expect(allowed.status).toBe(200)
    expect(allowed.headers.get('Cache-Control')).toBe('no-store')
    const started = await bodyOf(allowed)
    expect(started.start).toHaveLength(4)
    expect(started.target).toHaveLength(4)
    expect(started.start).not.toBe(started.target)

    const padded = JSON.stringify({ action: 'start', mode: 'quick', length: 4, pad: 'x'.repeat(MAX_SOLO_BODY) })
    expect(new TextEncoder().encode(padded).byteLength).toBeGreaterThan(MAX_SOLO_BODY)
    expect((await postRequest(padded)).status).toBe(413)

    const get = await readSoloRequest(new Request(url, { method: 'GET' }))
    expect(get.status).toBe(405)
    expect(get.headers.get('Allow')).toBe('POST')
    expect((await postRequest('not json')).status).toBe(400)
  })
})
