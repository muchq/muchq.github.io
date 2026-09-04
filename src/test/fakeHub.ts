import { vi } from 'vitest'

// A scripted games hub for client tests: the session mint as a mocked
// fetch, and the play socket as a FakeWebSocket the test drives frame by
// frame with raw JSON, the way networkAdapter.test.ts does for golf.

export class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  static OPEN = 1
  readonly OPEN = 1
  url: string
  protocol: string
  readyState = 0
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(url: string, protocol: string) {
    this.url = url
    this.protocol = protocol
    FakeWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = 3
    this.onclose?.()
  }

  open(): void {
    this.readyState = 1
    this.onopen?.()
  }

  receive(event: string, payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify({ event, payload }) })
  }

  receiveRaw(frame: unknown): void {
    this.onmessage?.({ data: JSON.stringify(frame) })
  }

  sentFrames(): { event: string; payload: Record<string, unknown> }[] {
    return this.sent.map(frame => JSON.parse(frame))
  }

  lastSent(): { event: string; payload: Record<string, unknown> } {
    return JSON.parse(this.sent[this.sent.length - 1])
  }
}

export const flushAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Installs the fake socket and a mint that answers with `session`.
// Returns the fetch mock for tests that inspect the mint request.
export function installFakeHub(session = { playerId: 'alice', ticket: 't-123', resumeToken: 'rt-456' }) {
  FakeWebSocket.instances = []
  vi.stubGlobal('WebSocket', FakeWebSocket)
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(session) })
  vi.stubGlobal('fetch', fetchMock)
  localStorage.clear()
  return fetchMock
}

// The socket the last dial opened, admitted as `playerId`.
export async function admitted(playerId = 'alice', roomId?: string): Promise<FakeWebSocket> {
  await flushAsync()
  const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
  ws.open()
  ws.receive('sessionReady', roomId === undefined ? { playerId, resumed: false } : { playerId, resumed: true, roomId })
  return ws
}
