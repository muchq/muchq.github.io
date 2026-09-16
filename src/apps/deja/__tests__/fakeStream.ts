import { vi } from 'vitest'
import type { DejaEvent, DejaState } from '../types'
import type { EventSourceLike } from '../useDejaStream'

// A scripted EventSource. The browser's reconnects on its own after the
// server ends a stream (readyState back to CONNECTING, the same object
// opens again) and gives up after a refused connection such as the 503
// for a full stream (readyState CLOSED); the two verbs below are those
// two cases.
export class FakeEventSource implements EventSourceLike {
  static instances: FakeEventSource[] = []
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  readyState = FakeEventSource.CONNECTING
  closed = false
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this)
  }

  static reset() {
    FakeEventSource.instances = []
  }

  static last(): FakeEventSource {
    const last = FakeEventSource.instances.at(-1)
    if (!last) throw new Error('no EventSource was opened')
    return last
  }

  open() {
    this.readyState = FakeEventSource.OPEN
    this.onopen?.(new Event('open'))
  }

  emit(event: DejaEvent) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(event) }))
  }

  // The server ended the stream; the browser is already reconnecting.
  drop() {
    this.readyState = FakeEventSource.CONNECTING
    this.onerror?.(new Event('error'))
  }

  // The server refused the connection; the browser will not retry.
  fail() {
    this.readyState = FakeEventSource.CLOSED
    this.onerror?.(new Event('error'))
  }

  close() {
    this.closed = true
    this.readyState = FakeEventSource.CLOSED
  }
}

// A fetch answering the JSON routes from a scripted log: `recent?after=`
// filters `events`, `state` returns `state`. Set `down` to fail every
// request the way a dead network does; set `gate` to hold every answer
// until it resolves, for a request that must land late.
export function fakeDejaFetch(script: {
  events?: DejaEvent[]
  state?: DejaState | null
  down?: boolean
  gate?: Promise<void>
}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    await script.gate
    if (script.down) throw new TypeError('Failed to fetch')
    const url = new URL(String(input))
    if (url.pathname.endsWith('/recent')) {
      const after = Number(url.searchParams.get('after'))
      const events = (script.events ?? []).filter((e) => e.seq > after)
      return new Response(JSON.stringify({ events }), { status: 200 })
    }
    if (url.pathname.endsWith('/state')) {
      if (!script.state) return new Response('', { status: 503 })
      return new Response(JSON.stringify(script.state), { status: 200 })
    }
    return new Response('', { status: 404 })
  })
  const recentCalls = () =>
    fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url.includes('/recent'))
  return { fetchMock, recentCalls, script }
}
