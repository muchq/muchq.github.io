import { useEffect, useState } from 'react'
import { DEJA_API_URL, fetchRecent, fetchState, type FetchLike } from './api'
import { applyEvents, emptyTape, withTokenCap, type Tape } from './tape'
import type { DejaEvent, DejaState } from './types'

// connecting: the EventSource is dialling, first time or after the server
// ended a stream (it does after ten minutes, or once a client falls 64
// events behind). live: open. polling: the stream was refused, as it is
// with a 503 once its 256 seats are taken, so /recent is read every
// POLL_MS and the stream tried again every STREAM_RETRY_MS. offline: even
// the polls go unanswered.
export type StreamStatus = 'connecting' | 'live' | 'polling' | 'offline'

export const POLL_MS = 2_000
export const STREAM_RETRY_MS = 30_000
export const STATE_REFRESH_MS = 30_000

// What the hook needs of an EventSource, so a test can hand it a scripted one.
export interface EventSourceLike {
  readonly readyState: number
  onopen: ((ev: Event) => void) | null
  onmessage: ((ev: MessageEvent) => void) | null
  onerror: ((ev: Event) => void) | null
  close(): void
}

export type EventSourceFactory = new (url: string) => EventSourceLike

// A browser gives up on a refused connection and stays CLOSED; after a
// dropped one it reconnects on its own and reads CONNECTING meanwhile.
const CLOSED = 2

export interface StreamDeps {
  EventSource?: EventSourceFactory
  fetch?: FetchLike
}

export interface DejaStream {
  tape: Tape
  status: StreamStatus
  state: DejaState | null
}

// The stream, the gap-fills around it, and the state's slow refresh. The
// server does not honour Last-Event-ID, so every open fetches
// recent?after=lastSeq; the reducer drops what the two overlap on.
export function useDejaStream(deps: StreamDeps = {}): DejaStream {
  const Source = deps.EventSource ?? (globalThis.EventSource as EventSourceFactory | undefined)
  const fetchFn = deps.fetch
  const [tape, setTape] = useState<Tape>(emptyTape)
  const [status, setStatus] = useState<StreamStatus>(Source ? 'connecting' : 'polling')
  const [state, setState] = useState<DejaState | null>(null)

  useEffect(() => {
    let cancelled = false
    let held = emptyTape()
    let source: EventSourceLike | null = null
    let pollTimer: number | undefined
    let retryTimer: number | undefined

    const apply = (events: DejaEvent[]) => {
      const next = applyEvents(held, events)
      if (next === held) return
      held = next
      setTape(held)
    }

    // True when the service answered, whether or not anything was new.
    const fill = async () => {
      const events = await fetchRecent(held.lastSeq, fetchFn)
      if (cancelled || events === null) return false
      apply(events)
      return true
    }

    const stopPolling = () => {
      window.clearInterval(pollTimer)
      window.clearTimeout(retryTimer)
      pollTimer = retryTimer = undefined
    }

    const startPolling = () => {
      setStatus('polling')
      if (pollTimer === undefined) {
        const poll = async () => {
          const answered = await fill()
          // A poll that lands after the stream came back must not demote it.
          if (cancelled || pollTimer === undefined) return
          setStatus(answered ? 'polling' : 'offline')
        }
        void poll()
        pollTimer = window.setInterval(poll, POLL_MS)
      }
      window.clearTimeout(retryTimer)
      if (Source) retryTimer = window.setTimeout(connect, STREAM_RETRY_MS)
    }

    const connect = () => {
      if (!Source) {
        startPolling()
        return
      }
      source?.close()
      const es = new Source(`${DEJA_API_URL}/stream`)
      source = es
      es.onopen = () => {
        stopPolling()
        setStatus('live')
        void fill()
      }
      es.onmessage = (ev) => {
        try {
          apply([JSON.parse(ev.data) as DejaEvent])
        } catch {
          // A frame that is not an event is the server's bug, not a reason to drop the page.
        }
      }
      es.onerror = () => {
        if (es.readyState === CLOSED) startPolling()
        else setStatus('connecting')
      }
    }

    const refreshState = async () => {
      const next = await fetchState(fetchFn)
      if (cancelled || !next) return
      setState(next)
      const capped = withTokenCap(held, next.vocab_cap)
      if (capped !== held) {
        held = capped
        setTape(held)
      }
    }

    connect()
    void refreshState()
    const stateTimer = window.setInterval(refreshState, STATE_REFRESH_MS)

    return () => {
      cancelled = true
      source?.close()
      stopPolling()
      window.clearInterval(stateTimer)
    }
  }, [Source, fetchFn])

  return { tape, status, state }
}
