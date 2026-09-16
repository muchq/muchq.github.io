import { describe, expect, it, vi } from 'vitest'
import { DEJA_API_URL, askNext, fetchRecent, fetchState } from '../api'
import { PINNED_EVENT_JSON, PINNED_STATE_JSON } from './fixtures'

const respond = (status: number, body: string) =>
  vi.fn().mockResolvedValue(new Response(body, { status, headers: { 'Content-Type': 'application/json' } }))

describe('askNext', () => {
  it('POSTs the context as JSON and returns both predictors', async () => {
    const fetchMock = respond(
      200,
      '{"predictions":{"bigram":[{"token":"a","p":0.5}],"net":[{"token":"b","p":0.4}]}}'
    )
    const result = await askNext(['x', 'y'], fetchMock)
    expect(result).toEqual({
      kind: 'ok',
      predictions: { bigram: [{ token: 'a', p: 0.5 }], net: [{ token: 'b', p: 0.4 }] },
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${DEJA_API_URL}/next`)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', Accept: 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ context: ['x', 'y'] })
  })

  it('a 400 is a rejection carrying the server message', async () => {
    const result = await askNext(['nope'], respond(400, '{"message":"unknown token: nope"}'))
    expect(result).toEqual({ kind: 'rejected', message: 'unknown token: nope' })
  })

  it('a 400 without a JSON message still reads as a rejection', async () => {
    const result = await askNext(['nope'], respond(400, 'unknown token'))
    expect(result).toEqual({ kind: 'rejected', message: 'unknown token' })
  })

  it('404 and 405 mean the route is not deployed yet, not an error', async () => {
    expect(await askNext(['a'], respond(404, 'not found'))).toEqual({ kind: 'not-deployed' })
    expect(await askNext(['a'], respond(405, ''))).toEqual({ kind: 'not-deployed' })
  })

  it('a network failure and a 5xx are unavailable, distinct from a rejection', async () => {
    const dead = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await askNext(['a'], dead)).toEqual({ kind: 'unavailable' })
    expect(await askNext(['a'], respond(500, 'boom'))).toEqual({ kind: 'unavailable' })
  })

  it('a 200 without the predictions shape is unavailable rather than a crash', async () => {
    expect(await askNext(['a'], respond(200, '{"playerId":"alice"}'))).toEqual({ kind: 'unavailable' })
  })
})

describe('fetchRecent', () => {
  it('asks for everything after the seq with a JSON Accept and returns the events', async () => {
    const fetchMock = respond(200, `{"events":[${PINNED_EVENT_JSON}]}`)
    const events = await fetchRecent(1, fetchMock)
    expect(events).toEqual([JSON.parse(PINNED_EVENT_JSON)])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${DEJA_API_URL}/recent?after=1`)
    expect(init.headers).toMatchObject({ Accept: 'application/json' })
  })

  it('is null on a failed request or a body without events, never an empty list', async () => {
    expect(await fetchRecent(0, respond(503, 'stream is full'))).toBeNull()
    expect(await fetchRecent(0, vi.fn().mockRejectedValue(new TypeError('offline')))).toBeNull()
    expect(await fetchRecent(0, respond(200, '{"playerId":"alice"}'))).toBeNull()
    expect(await fetchRecent(0, respond(200, '{"events":[]}'))).toEqual([])
  })
})

describe('fetchState', () => {
  it('returns the state, or null when the service is away', async () => {
    const fetchMock = respond(200, PINNED_STATE_JSON)
    expect(await fetchState(fetchMock)).toEqual(JSON.parse(PINNED_STATE_JSON))
    expect(fetchMock.mock.calls[0][0]).toBe(`${DEJA_API_URL}/state`)
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ Accept: 'application/json' })
    expect(await fetchState(respond(502, ''))).toBeNull()
    expect(await fetchState(respond(200, '{"nope":1}'))).toBeNull()
  })
})
