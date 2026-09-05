import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NetworkManager, thoughtsPlayUrl } from '../networkSystem'
import { hubSessionUrl } from '../hubSession'
import { GameState } from '../gameClasses'
import { ShapeType } from '@/types/game'

// The thoughts NetworkManager against a scripted hub wire: the session
// mint, the JSON-text envelopes both ways, and what each inbound event
// does to the GameState the renderer reads. Frames are raw JSON, so a
// regeneration that renames what the hub sends fails here.

class FakeWebSocket {
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
  onerror: ((error: unknown) => void) | null = null

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

  // A world update in the lobby envelope, as the hub sends it.
  update(name: string, payload: unknown): void {
    this.receive('lobby', { update: { [name]: payload } })
  }

  frames(): { event: string; payload: Record<string, unknown> }[] {
    return this.sent.map(raw => JSON.parse(raw))
  }
}

const flushAsync = () => new Promise(resolve => setTimeout(resolve, 0))

const PLAY_URL = 'wss://api.muchq.com/games/v2/play'
const PLAYER = 'bouncy-coral-quokka-x9k2'

describe('thoughts on the hub wire', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let gameState: GameState
  let manager: NetworkManager
  let statuses: string[]
  let ids: string[]

  beforeEach(() => {
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket)
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ playerId: PLAYER, ticket: 't-123', resumeToken: 'rt-456' })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    gameState = new GameState()
    gameState.localPlayerId = 'local-temp'
    gameState.addPlayer('local-temp', [10, 0, -5], [0.8, 0.2, 0.6], ShapeType.SPHERE)
    manager = new NetworkManager(gameState)
    statuses = []
    ids = []
    manager.onConnectionStateChange = status => statuses.push(status)
    manager.onPlayerIdReceived = id => ids.push(id)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // Mint, dial, open, sessionReady: the preamble every session runs.
  async function connectReady(): Promise<FakeWebSocket> {
    manager.connect(PLAY_URL)
    await flushAsync()
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
    ws.open()
    ws.receive('sessionReady', { playerId: PLAYER, resumed: false })
    return ws
  }

  it('defaults to the production play url and follows the override', () => {
    expect(thoughtsPlayUrl()).toBe(PLAY_URL)
    vi.stubEnv('VITE_HUB_WEBSOCKET_URL', 'ws://localhost:2015/games/v2/play')
    expect(thoughtsPlayUrl()).toBe('ws://localhost:2015/games/v2/play')
    expect(hubSessionUrl(thoughtsPlayUrl())).toBe('http://localhost:2015/games/v2/session')
  })

  it('mints a fresh session beside the play url and dials with the ticket', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
    manager.connect(PLAY_URL)
    expect(statuses).toEqual(['connecting'])
    await flushAsync()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.muchq.com/games/v2/session')
    expect(init.method).toBe('POST')
    // Always a fresh identity: no resume token goes up.
    expect(init.body).toBe('{}')
    // A hung mint must time out rather than stall the reconnect loop;
    // the budget is pinned, not just the wiring.
    expect(timeoutSpy).toHaveBeenCalledWith(10_000)
    expect(init.signal).toBe(timeoutSpy.mock.results[0].value)

    const ws = FakeWebSocket.instances[0]
    expect(ws.url).toBe(`${PLAY_URL}?ticket=t-123`)
    expect(ws.protocol).toBe('smithy.eventstream.v1+json')
    // An open socket is not yet "connected": the join needs the server
    // id, and the hub refuses a move before a join.
    ws.open()
    manager.sendPositionUpdate([11, 0, -5])
    manager.sendShapeUpdate(ShapeType.CUBE)
    expect(ws.sent).toEqual([])
    expect(manager.isConnected).toBe(false)
    expect(statuses).toEqual(['connecting'])
  })

  it('sessionReady re-keys the local player under the server id, joins, and only then is connected', async () => {
    const ws = await connectReady()

    expect(gameState.localPlayerId).toBe(PLAYER)
    expect(gameState.players.has('local-temp')).toBe(false)
    expect(gameState.getLocalPlayer()?.position).toEqual([10, 0, -5])
    expect(ids).toEqual([PLAYER])
    expect(manager.isConnected).toBe(true)
    expect(statuses).toEqual(['connecting', 'connected'])
    // The join, byte for byte what thoughts.smithy's JoinWorld wants in
    // the lobby envelope — no roomId (this page is the plaza's), and no
    // v1 timestamp.
    expect(ws.frames()).toEqual([
      {
        event: 'lobby',
        payload: { action: { join: { position: [10, 0, -5], color: [0.8, 0.2, 0.6], shape: 0 } } }
      }
    ])
  })

  it('applies the world and its changes to everyone but the local player', async () => {
    const ws = await connectReady()

    ws.update('worldState', {
      players: [
        { playerId: 'zesty-mint-wombat-ab12', position: [20, 0, 15], color: [0.3, 0.9, 0.4], shape: 1 },
        // The hub never lists the joiner; if it did, the local player must
        // not be replaced by a copy of itself.
        { playerId: PLAYER, position: [0, 0, 0], color: [0, 0, 0], shape: 2 }
      ]
    })
    expect(gameState.players.size).toBe(2)
    expect(gameState.players.get('zesty-mint-wombat-ab12')?.shape).toBe(ShapeType.CUBE)
    expect(gameState.getLocalPlayer()?.position).toEqual([10, 0, -5])

    ws.update('playerJoined', {
      player: { playerId: 'jolly-teal-bilby-cd34', position: [-3, 0, 4], color: [1, 1, 1], shape: 0 }
    })
    expect(gameState.players.get('jolly-teal-bilby-cd34')?.position).toEqual([-3, 0, 4])

    ws.update('playerMoved', { playerId: 'zesty-mint-wombat-ab12', position: [21, 0, 16] })
    expect(gameState.players.get('zesty-mint-wombat-ab12')?.position).toEqual([21, 0, 16])
    ws.update('playerMoved', { playerId: PLAYER, position: [0, 0, 0] })
    expect(gameState.getLocalPlayer()?.position).toEqual([10, 0, -5])

    ws.update('shapeChanged', { playerId: 'zesty-mint-wombat-ab12', shape: 2 })
    expect(gameState.players.get('zesty-mint-wombat-ab12')?.shape).toBe(ShapeType.PYRAMID)
    ws.update('shapeChanged', { playerId: PLAYER, shape: 2 })
    expect(gameState.getLocalPlayer()?.shape).toBe(ShapeType.SPHERE)

    ws.update('playerLeft', { playerId: 'zesty-mint-wombat-ab12' })
    expect(gameState.players.has('zesty-mint-wombat-ab12')).toBe(false)
    ws.update('playerLeft', { playerId: PLAYER })
    expect(gameState.getLocalPlayer()).toBeDefined()
    // A leave for someone never seen is a no-op, not an error.
    ws.update('playerLeft', { playerId: 'nobody' })
    expect(gameState.players.size).toBe(2)
  })

  it('worldState is a snapshot: players it no longer lists are gone', async () => {
    const ws = await connectReady()
    ws.update('playerJoined', {
      player: { playerId: 'zesty-mint-wombat-ab12', position: [1, 0, 1], color: [1, 0, 0], shape: 0 }
    })
    ws.update('playerJoined', {
      player: { playerId: 'jolly-teal-bilby-cd34', position: [2, 0, 2], color: [0, 1, 0], shape: 0 }
    })
    // Their playerLeft went out while we were off the wire; the next
    // snapshot (a rejoin's) is the truth.
    ws.update('worldState', {
      players: [{ playerId: 'jolly-teal-bilby-cd34', position: [3, 0, 3], color: [0, 1, 0], shape: 1 }]
    })
    expect([...gameState.players.keys()].sort()).toEqual([PLAYER, 'jolly-teal-bilby-cd34'])
    expect(gameState.players.get('jolly-teal-bilby-cd34')?.position).toEqual([3, 0, 3])
    expect(gameState.getLocalPlayer()?.position).toEqual([10, 0, -5])
  })

  it('a rejection, a malformed frame, and a stray bare world event change nothing', async () => {
    const ws = await connectReady()
    const before = gameState.players.size
    ws.receive('commandRejected', { reason: 'position out of bounds (±50)' })
    ws.onmessage?.({ data: 'not json' })
    // The pre-lobby wire's bare event: unknown here, and dropped.
    ws.receive('playerJoined', {
      player: { playerId: 'stray-bare-event', position: [2, 0, 2], color: [0, 1, 0], shape: 0 }
    })
    expect(gameState.players.size).toBe(before)
    expect(manager.isConnected).toBe(true)
    expect(statuses).toEqual(['connecting', 'connected'])
  })

  it('sends moves throttled, shapes, and the leave as the hub commands', async () => {
    // Connect on real timers (the mint resolves through the event loop),
    // then freeze the clock for the throttle.
    const ws = await connectReady()
    ws.sent = []
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    try {
      manager.sendPositionUpdate([11, 0, -5])
      // Inside the throttle window: dropped.
      vi.advanceTimersByTime(10)
      manager.sendPositionUpdate([12, 0, -5])
      // Past the window but under the 0.1-unit deadband: dropped.
      vi.advanceTimersByTime(100)
      manager.sendPositionUpdate([11.05, 0, -5])
      // Past both: sent.
      manager.sendPositionUpdate([13, 0, -5])
      manager.sendShapeUpdate(ShapeType.CUBE)
      manager.sendLeave()

      expect(ws.frames()).toEqual([
        { event: 'lobby', payload: { action: { move: { position: [11, 0, -5] } } } },
        { event: 'lobby', payload: { action: { move: { position: [13, 0, -5] } } } },
        { event: 'lobby', payload: { action: { shape: { shape: 1 } } } },
        { event: 'lobby', payload: { action: { leave: {} } } }
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('a failed mint is offline, a closed socket is disconnected', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 })
    manager.connect(PLAY_URL)
    await flushAsync()
    expect(FakeWebSocket.instances).toEqual([])
    expect(manager.connectionStatus).toBe('failed')
    expect(manager.connectionError).toBe('Connection failed - Playing offline')
    expect(statuses).toEqual(['connecting', 'failed'])

    statuses = []
    const ws = await connectReady()
    ws.update('playerJoined', {
      player: { playerId: 'jolly-teal-bilby-cd34', position: [2, 0, 2], color: [0, 1, 0], shape: 0 }
    })
    expect(gameState.players.has('jolly-teal-bilby-cd34')).toBe(true)
    ws.close()
    expect(manager.isConnected).toBe(false)
    expect(statuses).toEqual(['connecting', 'connected', 'disconnected'])
    // Off the wire, the peers are gone too: no frozen avatars until a
    // snapshot that may never come.
    expect([...gameState.players.keys()]).toEqual([PLAYER])
  })

  it('disconnect forgets the peers and keeps the local player', async () => {
    const ws = await connectReady()
    ws.update('playerJoined', {
      player: { playerId: 'jolly-teal-bilby-cd34', position: [2, 0, 2], color: [0, 1, 0], shape: 0 }
    })
    expect(gameState.players.has('jolly-teal-bilby-cd34')).toBe(true)
    manager.disconnect()
    expect([...gameState.players.keys()]).toEqual([PLAYER])
    expect(gameState.getLocalPlayer()?.position).toEqual([10, 0, -5])
  })

  it('a refusal stays failed through the close that follows it', async () => {
    // The hub's terminal exception frame (a spent ticket, a second live
    // socket), then its clean close: the reason survives, and "offline"
    // does not overwrite it.
    manager.connect(PLAY_URL)
    await flushAsync()
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.onmessage?.({
      data: JSON.stringify({ exception: 'Unauthenticated', payload: { message: 'ticket expired or already spent' } })
    })
    ws.close()
    expect(manager.isConnected).toBe(false)
    expect(manager.connectionStatus).toBe('failed')
    expect(manager.connectionError).toBe('ticket expired or already spent')
    expect(statuses).toEqual(['connecting', 'failed'])
    expect(ws.sent).toEqual([])

    // The browser's own error-then-close pair reads the same way.
    statuses = []
    const again = await connectReady()
    again.onerror?.(new Event('error'))
    again.close()
    expect(manager.connectionStatus).toBe('failed')
    expect(manager.connectionError).toBe('Connection failed - Playing offline')
    expect(statuses).toEqual(['connecting', 'connected', 'failed'])
  })

  it('reconnect mints again, and the old socket can no longer speak for the manager', async () => {
    vi.useFakeTimers()
    try {
      manager.connect(PLAY_URL)
      await vi.advanceTimersByTimeAsync(0)
      const first = FakeWebSocket.instances[0]
      first.open()
      first.receive('sessionReady', { playerId: PLAYER, resumed: false })

      manager.reconnect()
      // Retired at once: closed, and not "connected" while the new dial
      // is pending.
      expect(first.readyState).toBe(3)
      expect(manager.isConnected).toBe(false)
      await vi.advanceTimersByTimeAsync(200)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      // The reconnect mints afresh too: the first mint handed back a
      // resume token, and it stays unused.
      await expect(fetchMock.mock.results[0].value.then((r: { json: () => Promise<unknown> }) => r.json()))
        .resolves.toMatchObject({ resumeToken: 'rt-456' })
      expect(fetchMock.mock.calls[1][1].body).toBe('{}')
      const second = FakeWebSocket.instances[1]
      expect(second).toBeDefined()
      second.open()
      // A late close on the retired socket must not flip the live status.
      first.onclose?.()
      expect(manager.connectionStatus).toBe('connecting')

      // The hub forgot us with the first socket, so the new session joins
      // afresh under whatever id it minted.
      second.receive('sessionReady', { playerId: 'peppy-jade-galah-ef56', resumed: false })
      expect(gameState.localPlayerId).toBe('peppy-jade-galah-ef56')
      expect(second.frames()[0]).toMatchObject({ event: 'lobby', payload: { action: { join: {} } } })
      expect(manager.connectionStatus).toBe('connected')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a disconnect during the reconnect delay leaves no socket behind', async () => {
    vi.useFakeTimers()
    try {
      manager.connect(PLAY_URL)
      await vi.advanceTimersByTimeAsync(0)
      manager.reconnect()
      // Leaving the page inside the delay: nothing may dial afterwards, or
      // a session nobody can close would join the world.
      manager.disconnect()
      await vi.advanceTimersByTimeAsync(500)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(FakeWebSocket.instances).toHaveLength(1)
      expect(statuses.at(-1)).toBe('disconnected')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a disconnect during the mint creates no socket', async () => {
    manager.connect(PLAY_URL)
    manager.disconnect()
    await flushAsync()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(FakeWebSocket.instances).toEqual([])
    expect(statuses).toEqual(['connecting', 'disconnected'])
  })

  it('a connect over a live socket retires it', async () => {
    const first = await connectReady()
    manager.connect(PLAY_URL)
    // The old session is closed, not left joined under an id nobody holds.
    expect(first.readyState).toBe(3)
    await flushAsync()
    const second = FakeWebSocket.instances[1]
    expect(second).toBeDefined()
    second.open()
    second.receive('sessionReady', { playerId: 'peppy-jade-galah-ef56', resumed: false })
    expect(gameState.localPlayerId).toBe('peppy-jade-galah-ef56')
    expect(gameState.players.has(PLAYER)).toBe(false)
  })

  it('disconnect closes and reports without a mint or a frame', async () => {
    const ws = await connectReady()
    ws.sent = []
    manager.disconnect()
    expect(ws.readyState).toBe(3)
    expect(ws.sent).toEqual([])
    expect(statuses.at(-1)).toBe('disconnected')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
