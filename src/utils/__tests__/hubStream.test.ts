import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { HubStream, hubPlayUrl } from '../hubStream'
import type { HubStreamCallbacks } from '../hubStream'
import { FakeWebSocket, admitted, flushAsync, installFakeHub } from '@/test/fakeHub'

type MockedCallbacks = {
  [K in keyof Required<HubStreamCallbacks>]: Mock<Required<HubStreamCallbacks>[K]>
}

// The room stream against a scripted wire: the mint, the socket, the
// room and chat frames, and a game envelope handed through untouched.

const TOKEN_KEY = 'test_resume_token'

describe('HubStream', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let callbacks: MockedCallbacks

  beforeEach(() => {
    fetchMock = installFakeHub()
    callbacks = {
      onConnection: vi.fn(),
      onSessionReady: vi.fn(),
      onRoom: vi.fn(),
      onRoomLeft: vi.fn(),
      onChat: vi.fn(),
      onChatHistory: vi.fn(),
      onRejected: vi.fn(),
      onGame: vi.fn(),
      onLobby: vi.fn(),
      onLost: vi.fn()
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const stream = () => new HubStream({ playUrl: hubPlayUrl(), resumeTokenKey: TOKEN_KEY, callbacks })

  const connect = async (): Promise<[HubStream, FakeWebSocket]> => {
    const hub = stream()
    hub.connect()
    const ws = await admitted()
    return [hub, ws]
  }

  it('rides the one play socket, override included', () => {
    expect(hubPlayUrl()).toBe('wss://api.muchq.com/games/v2/play')
    vi.stubEnv('VITE_HUB_WEBSOCKET_URL', 'ws://localhost:2015/games/v2/play')
    expect(hubPlayUrl()).toBe('ws://localhost:2015/games/v2/play')
  })

  it('mints a session, then dials with the ticket and the JSON subprotocol', async () => {
    const [hub, ws] = await connect()
    expect(fetchMock).toHaveBeenCalledWith('https://api.muchq.com/games/v2/session', expect.objectContaining({ method: 'POST' }))
    expect(ws.url).toBe('wss://api.muchq.com/games/v2/play?ticket=t-123')
    expect(ws.protocol).toBe('smithy.eventstream.v1+json')
    expect(hub.isConnected).toBe(true)
    expect(hub.playerId).toBe('alice')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    expect(callbacks.onConnection).toHaveBeenCalledWith(true)
    expect(callbacks.onSessionReady).toHaveBeenCalledWith({ playerId: 'alice', resumed: false })
  })

  it('abandons a hung mint after ten seconds', async () => {
    // A hung mint counts as a failed attempt; without the budget the
    // reconnect loop would stall on it forever.
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
    await connect()
    expect(timeoutSpy).toHaveBeenCalledWith(10_000)
    expect(fetchMock.mock.calls[0][1].signal).toBe(timeoutSpy.mock.results[0].value)
  })

  it('a refused mint retries on the reconnect cadence and spends its budget', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 })
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeWebSocket.instances).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(2000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(FakeWebSocket.instances).toHaveLength(1)
    hub.disconnect()

    fetchMock.mockRejectedValue(new Error('down'))
    const down = stream()
    down.connect()
    await vi.advanceTimersByTimeAsync(0)
    for (let attempt = 0; attempt < 10; attempt++) {
      await vi.advanceTimersByTimeAsync(2000)
    }
    expect(callbacks.onLost).toHaveBeenCalledWith('Lost connection to the games hub')
    expect(fetchMock).toHaveBeenCalledTimes(2 + 11)
    down.disconnect()
  })

  it('offers its own resume token, under its own key, and writes only there', async () => {
    localStorage.setItem(TOKEN_KEY, 'rt-old')
    localStorage.setItem('golf_v2_resume_token', 'rt-golf')
    await connect()
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse((init as { body: string }).body)).toEqual({ resumeToken: 'rt-old' })
    expect(localStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    expect(localStorage.getItem('golf_v2_resume_token')).toBe('rt-golf')
  })

  it('a disconnect during the mint creates no socket', async () => {
    const hub = stream()
    hub.connect()
    hub.disconnect()
    await flushAsync()
    expect(FakeWebSocket.instances).toHaveLength(0)
  })

  it('a close before admission forgets the resume token; one after keeps it', async () => {
    const hub = stream()
    hub.connect()
    await flushAsync()
    const refused = FakeWebSocket.instances[0]
    refused.open()
    refused.close()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    hub.disconnect()

    const [admittedHub, ws] = await connect()
    ws.close()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    admittedHub.disconnect()
  })

  it('a deliberate disconnect before admission keeps the identity', async () => {
    const hub = stream()
    hub.connect()
    await flushAsync()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    hub.disconnect()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('rt-456')
  })

  it('encodes room commands bare and game moves in their envelope', async () => {
    const [hub, ws] = await connect()
    hub.createRoom()
    hub.joinRoom('ROOM01')
    hub.chat('hi')
    hub.move('castle', 'playFromHand', { cards: [{ rank: 'K', suit: '♣' }, { rank: 'K', suit: '♦' }] })
    hub.move('golf', 'drawCard')
    hub.leaveRoom()
    expect(ws.sentFrames()).toEqual([
      { event: 'createRoom', payload: {} },
      { event: 'joinRoom', payload: { roomId: 'ROOM01' } },
      { event: 'chat', payload: { text: 'hi' } },
      { event: 'castle', payload: { move: { playFromHand: { cards: [{ rank: 'K', suit: '♣' }, { rank: 'K', suit: '♦' }] } } } },
      { event: 'golf', payload: { move: { drawCard: {} } } },
      { event: 'leaveRoom', payload: {} }
    ])
  })

  it('sends nothing before the socket is open', async () => {
    const hub = stream()
    hub.connect()
    await flushAsync()
    hub.createRoom()
    expect(FakeWebSocket.instances[0].sent).toEqual([])
  })

  it('hands room, chat and refusal frames to their callbacks', async () => {
    const [, ws] = await connect()
    const room = { roomId: 'ROOM01', players: [], games: [{ gameId: 'G1', game: 'castle', status: 'waiting', playerCount: 1 }] }
    ws.receive('roomState', room)
    expect(callbacks.onRoom).toHaveBeenCalledWith(room)
    ws.receive('roomLeft', { roomId: 'ROOM01' })
    expect(callbacks.onRoomLeft).toHaveBeenCalledWith('ROOM01')
    const message = { messageId: 7, playerId: 'bob', text: 'nice', sentAtUnixMillis: 1 }
    ws.receive('roomChat', message)
    expect(callbacks.onChat).toHaveBeenCalledWith(message)
    ws.receive('roomChatHistory', { messages: [message] })
    expect(callbacks.onChatHistory).toHaveBeenCalledWith([message])
    ws.receive('commandRejected', { reason: 'still setting up' })
    expect(callbacks.onRejected).toHaveBeenCalledWith('still setting up')
    expect(callbacks.onLost).not.toHaveBeenCalled()
  })

  it('hands each game envelope through by name, contents untouched', async () => {
    const [, ws] = await connect()
    ws.receive('castle', { update: { turnChanged: { playerId: 'bob' } } })
    expect(callbacks.onGame).toHaveBeenCalledWith('castle', { turnChanged: { playerId: 'bob' } })
    ws.receive('golf', { update: { gameStarted: {} } })
    expect(callbacks.onGame).toHaveBeenCalledWith('golf', { gameStarted: {} })
  })

  it('a terminal refusal is lost, not rejected, named by its shape when it says nothing', async () => {
    const [, ws] = await connect()
    ws.receiveRaw({ exception: 'AccessDenied', payload: { message: 'origin not allowed' } })
    expect(callbacks.onLost).toHaveBeenCalledWith('origin not allowed')
    ws.receiveRaw({ exception: 'ThrottlingException', payload: {} })
    expect(callbacks.onLost).toHaveBeenCalledWith('ThrottlingException')
    expect(callbacks.onRejected).not.toHaveBeenCalled()
  })

  it('an unreadable frame is dropped, not fatal', async () => {
    const [hub, ws] = await connect()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    ws.onmessage?.({ data: 'not json' })
    expect(error).toHaveBeenCalled()
    expect(hub.isConnected).toBe(true)
    expect(callbacks.onLost).not.toHaveBeenCalled()
  })

  it('reconnects two seconds after a close and gives up after ten tries', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    FakeWebSocket.instances[0].close()
    await vi.advanceTimersByTimeAsync(1999)
    expect(FakeWebSocket.instances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(FakeWebSocket.instances).toHaveLength(2)
    for (let attempt = 1; attempt < 10; attempt++) {
      FakeWebSocket.instances[attempt].close()
      await vi.advanceTimersByTimeAsync(2000)
    }
    expect(FakeWebSocket.instances).toHaveLength(11)
    expect(callbacks.onLost).not.toHaveBeenCalled()
    FakeWebSocket.instances[10].close()
    await vi.advanceTimersByTimeAsync(2000)
    expect(FakeWebSocket.instances).toHaveLength(11)
    expect(callbacks.onLost).toHaveBeenCalledWith('Lost connection to the games hub')
  })

  it('an admitted socket resets the reconnect budget', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    // Three sessions that each got in and then dropped...
    for (let session = 0; session < 3; session++) {
      await vi.advanceTimersByTimeAsync(0)
      const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
      ws.open()
      ws.receive('sessionReady', { playerId: 'alice', resumed: true })
      ws.close()
      await vi.advanceTimersByTimeAsync(2000)
    }
    // ...leave the full ten tries for the outage that follows: the
    // dial after the last drop was the first, nine more come, and the
    // tenth failure is the end.
    expect(FakeWebSocket.instances).toHaveLength(4)
    for (let attempt = 0; attempt < 9; attempt++) {
      FakeWebSocket.instances[FakeWebSocket.instances.length - 1].close()
      await vi.advanceTimersByTimeAsync(2000)
    }
    expect(FakeWebSocket.instances).toHaveLength(13)
    expect(callbacks.onLost).not.toHaveBeenCalled()
    FakeWebSocket.instances[12].close()
    await vi.advanceTimersByTimeAsync(2000)
    expect(FakeWebSocket.instances).toHaveLength(13)
    expect(callbacks.onLost).toHaveBeenCalled()
  })

  it('a deliberate disconnect never reconnects', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.receive('sessionReady', { playerId: 'alice', resumed: false })
    expect(hub.isConnected).toBe(true)
    hub.disconnect()
    await vi.advanceTimersByTimeAsync(5000)
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(hub.isConnected).toBe(false)
  })

  it('carries the lobby envelope both ways: actions up, updates down', async () => {
    const [hub, ws] = await connect()
    hub.lobby('join', { position: [10, 0, -5], color: [0.8, 0.2, 0.6], shape: 0 })
    hub.lobby('move', { position: [11, 0, -5] })
    hub.lobby('leave')
    expect(ws.sentFrames()).toEqual([
      { event: 'lobby', payload: { action: { join: { position: [10, 0, -5], color: [0.8, 0.2, 0.6], shape: 0 } } } },
      { event: 'lobby', payload: { action: { move: { position: [11, 0, -5] } } } },
      { event: 'lobby', payload: { action: { leave: {} } } }
    ])
    ws.receive('lobby', { update: { playerLeft: { playerId: 'bob' } } })
    expect(callbacks.onLobby).toHaveBeenCalledWith({ playerLeft: { playerId: 'bob' } })
    expect(callbacks.onGame).not.toHaveBeenCalled()
  })
})
