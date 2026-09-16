import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POLL_MS, STATE_REFRESH_MS, STREAM_RETRY_MS, useDejaStream } from '../useDejaStream'
import type { DejaEvent } from '../types'
import { PINNED_EVENT_JSON, eventOf, stateOf } from './fixtures'
import { FakeEventSource, fakeDejaFetch } from './fakeStream'

const events = [1, 2, 3, 4, 5].map((seq) => eventOf({ seq }))

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

beforeEach(() => {
  vi.useFakeTimers()
  FakeEventSource.reset()
})

afterEach(() => {
  vi.useRealTimers()
})

// `noSource` is a browser without EventSource, as jsdom is.
const mount = (script: Parameters<typeof fakeDejaFetch>[0], { noSource = false } = {}) => {
  const fake = fakeDejaFetch(script)
  const EventSource = noSource ? undefined : FakeEventSource
  const hook = renderHook(() => useDejaStream({ EventSource, fetch: fake.fetchMock }))
  return { ...hook, ...fake }
}

describe('useDejaStream', () => {
  it('connects, backfills on open, then applies live events in order', async () => {
    const { result, recentCalls } = mount({ events: events.slice(0, 2), state: stateOf() })
    expect(result.current.status).toBe('connecting')
    expect(FakeEventSource.instances).toHaveLength(1)
    expect(FakeEventSource.last().url).toMatch(/\/deja\/v1\/stream$/)
    // Nothing is fetched until the stream is up: a refused stream polls instead.
    expect(recentCalls()).toEqual([])

    await act(async () => FakeEventSource.last().open())
    await tick(0)
    expect(result.current.status).toBe('live')
    expect(recentCalls()).toEqual(['https://api.muchq.com/deja/v1/recent?after=0'])
    expect(result.current.tape.rows.map((r) => r.event.seq)).toEqual([2, 1])

    act(() => {
      FakeEventSource.last().emit(events[2])
      FakeEventSource.last().emit(events[3])
    })
    expect(result.current.tape.rows.map((r) => r.event.seq)).toEqual([4, 3, 2, 1])
    expect(result.current.tape.lastSeq).toBe(4)
  })

  it('after the server ends the stream, the reconnect fills only the gap', async () => {
    const { result, recentCalls, script } = mount({ events: events.slice(0, 2), state: stateOf() })
    await act(async () => FakeEventSource.last().open())
    await tick(0)
    act(() => FakeEventSource.last().emit(events[2]))
    expect(result.current.tape.lastSeq).toBe(3)

    // Ten minutes are up: the browser reconnects, and the log has moved on.
    script.events = events
    act(() => FakeEventSource.last().drop())
    expect(result.current.status).toBe('connecting')
    // The same EventSource comes back; the page opened no second one.
    expect(FakeEventSource.instances).toHaveLength(1)
    await act(async () => FakeEventSource.last().open())
    await tick(0)
    expect(result.current.status).toBe('live')
    expect(recentCalls().at(-1)).toBe('https://api.muchq.com/deja/v1/recent?after=3')
    expect(result.current.tape.rows.map((r) => r.event.seq)).toEqual([5, 4, 3, 2, 1])
    // The reconnect landed, so the wait for it is over: nothing polls later.
    const fetched = recentCalls().length
    await tick(STREAM_RETRY_MS * 2)
    expect(result.current.status).toBe('live')
    expect(recentCalls()).toHaveLength(fetched)
  })

  it('a dropped stream that never reopens falls to polling after the retry wait', async () => {
    const { result, recentCalls, script } = mount({ events: events.slice(0, 2), state: stateOf() })
    await act(async () => FakeEventSource.last().open())
    await tick(0)
    const fetched = recentCalls().length
    script.events = events
    act(() => FakeEventSource.last().drop())
    expect(result.current.status).toBe('connecting')
    await tick(STREAM_RETRY_MS - 1)
    // The browser is still dialling; the page gives it the whole wait.
    expect(result.current.status).toBe('connecting')
    expect(recentCalls()).toHaveLength(fetched)
    await tick(1)
    expect(result.current.status).toBe('polling')
    expect(recentCalls().at(-1)).toBe('https://api.muchq.com/deja/v1/recent?after=2')
    expect(result.current.tape.rows.map((r) => r.event.seq)).toEqual([5, 4, 3, 2, 1])

    // Once polling, a stream still redialling no longer moves the status —
    // the poll covers that wait — and the retry it armed still comes.
    act(() => FakeEventSource.last().drop())
    expect(result.current.status).toBe('polling')
    await tick(STREAM_RETRY_MS)
    expect(FakeEventSource.instances).toHaveLength(2)
    expect(result.current.status).toBe('polling')
  })

  it('the pinned wire frame lands as a row; a frame that is not JSON changes nothing', async () => {
    const { result } = mount({ events: [], state: stateOf() })
    await act(async () => FakeEventSource.last().open())
    await tick(0)
    act(() => FakeEventSource.last().emitRaw(PINNED_EVENT_JSON))
    expect(result.current.tape.rows.map((r) => [r.event.seq, r.outcome])).toEqual([[2, 'warmup']])
    const before = result.current.tape
    act(() => FakeEventSource.last().emitRaw('{'))
    expect(result.current.tape).toBe(before)
    expect(result.current.status).toBe('live')
  })

  it('a poll body mixing a good event and a bad one keeps the good one and the page', async () => {
    const bad = { seq: 2, verdict: 'expected' } as DejaEvent
    const { result, script } = mount({ events: [events[0], bad], state: stateOf() })
    act(() => FakeEventSource.last().fail())
    await tick(0)
    expect(result.current.tape.rows.map((r) => r.event.seq)).toEqual([1])
    expect(result.current.status).toBe('polling')
    // The bad event comes back on every poll; the good ones after it still land.
    script.events = [events[0], bad, events[2]]
    await tick(POLL_MS)
    expect(result.current.tape.rows.map((r) => r.event.seq)).toEqual([3, 1])
    expect(result.current.status).toBe('polling')
  })

  it('a refused stream falls back to polling every 2 s and retries the stream later', async () => {
    const { result, recentCalls, script } = mount({ events: events.slice(0, 1), state: stateOf() })
    act(() => FakeEventSource.last().fail())
    expect(result.current.status).toBe('polling')
    await tick(0)
    expect(recentCalls()).toEqual(['https://api.muchq.com/deja/v1/recent?after=0'])
    expect(result.current.tape.lastSeq).toBe(1)

    script.events = events.slice(0, 3)
    await tick(POLL_MS)
    expect(recentCalls().at(-1)).toBe('https://api.muchq.com/deja/v1/recent?after=1')
    expect(result.current.tape.rows.map((r) => r.event.seq)).toEqual([3, 2, 1])
    expect(FakeEventSource.instances).toHaveLength(1)

    await tick(STREAM_RETRY_MS)
    expect(FakeEventSource.instances).toHaveLength(2)
    expect(result.current.status).toBe('polling')
    const before = recentCalls().length
    await act(async () => FakeEventSource.last().open())
    await tick(0)
    expect(result.current.status).toBe('live')
    // The open backfilled once; polling has stopped.
    expect(recentCalls()).toHaveLength(before + 1)
    await tick(POLL_MS * 3)
    expect(recentCalls()).toHaveLength(before + 1)
  })

  it('a poll that lands after the stream came back does not demote it', async () => {
    const { result, script } = mount({ events, state: stateOf() })
    act(() => FakeEventSource.last().fail())
    await tick(0)
    expect(result.current.status).toBe('polling')
    let release!: () => void
    script.gate = new Promise<void>((resolve) => (release = resolve))
    await tick(POLL_MS)
    // That poll is now waiting on the gate; the retried stream opens meanwhile.
    await tick(STREAM_RETRY_MS - POLL_MS)
    await act(async () => FakeEventSource.last().open())
    expect(result.current.status).toBe('live')
    await act(async () => {
      release()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.status).toBe('live')
  })

  it('a second refusal keeps polling rather than piling up sources', async () => {
    const { result } = mount({ events, state: stateOf() })
    act(() => FakeEventSource.last().fail())
    await tick(STREAM_RETRY_MS)
    act(() => FakeEventSource.last().fail())
    expect(result.current.status).toBe('polling')
    await tick(STREAM_RETRY_MS)
    expect(FakeEventSource.instances).toHaveLength(3)
    expect(FakeEventSource.instances.filter((es) => !es.closed)).toHaveLength(1)
  })

  it('is offline while polling cannot reach the service, and back once it can', async () => {
    const { result, script } = mount({ events, state: stateOf() })
    act(() => FakeEventSource.last().fail())
    await tick(0)
    expect(result.current.status).toBe('polling')
    script.down = true
    await tick(POLL_MS)
    expect(result.current.status).toBe('offline')
    script.down = false
    await tick(POLL_MS)
    expect(result.current.status).toBe('polling')
  })

  it('polls from the start where there is no EventSource at all', async () => {
    const { result, recentCalls } = mount({ events, state: stateOf() }, { noSource: true })
    expect(result.current.status).toBe('polling')
    await tick(0)
    expect(recentCalls()).toHaveLength(1)
    expect(result.current.tape.lastSeq).toBe(5)
  })

  it('reads the state on mount and every 30 s, and sizes the token set to its vocab cap', async () => {
    const { result, fetchMock, script } = mount({ events: [], state: stateOf({ vocab_cap: 3 }) })
    await tick(0)
    expect(result.current.state?.vocab_cap).toBe(3)
    expect(result.current.tape.tokenCap).toBe(3)
    const stateCalls = () => fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/state'))
    expect(stateCalls()).toHaveLength(1)
    script.state = stateOf({ vocab_cap: 4, anomalies: 7 })
    await tick(STATE_REFRESH_MS)
    expect(stateCalls()).toHaveLength(2)
    expect(result.current.state?.anomalies).toBe(7)
    expect(result.current.tape.tokenCap).toBe(4)
    // A failed refresh keeps the last state rather than blanking the counters.
    script.state = null
    await tick(STATE_REFRESH_MS)
    expect(result.current.state?.anomalies).toBe(7)
  })

  it('closes the stream and stops every timer on unmount', async () => {
    const { unmount, recentCalls } = mount({ events, state: stateOf() })
    act(() => FakeEventSource.last().fail())
    await tick(0)
    const polled = recentCalls().length
    unmount()
    expect(FakeEventSource.instances.every((es) => es.closed)).toBe(true)
    await tick(STREAM_RETRY_MS * 2)
    expect(recentCalls()).toHaveLength(polled)
    expect(FakeEventSource.instances).toHaveLength(1)
  })
})
