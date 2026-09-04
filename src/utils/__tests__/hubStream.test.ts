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

  it('rides the golf play socket, override included', () => {
    expect(hubPlayUrl()).toBe('wss://api.muchq.com/games/v2/golf/play')
    vi.stubEnv('VITE_GOLF_WEBSOCKET_URL', 'ws://localhost:2015/games/v2/golf/play')
    expect(hubPlayUrl()).toBe('ws://localhost:2015/games/v2/golf/play')
  })

  it('mints a session, then dials with the ticket and the JSON subprotocol', async () => {
    const [hub, ws] = await connect()
    expect(fetchMock).toHaveBeenCalledWith('https://api.muchq.com/games/v2/session', expect.objectContaining({ method: 'POST' }))
    expect(ws.url).toBe('wss://api.muchq.com/games/v2/golf/play?ticket=t-123')
    expect(ws.protocol).toBe('smithy.eventstream.v1+json')
    expect(hub.isConnected).toBe(true)
    expect(hub.playerId).toBe('alice')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    expect(callbacks.onConnection).toHaveBeenCalledWith(true)
    expect(callbacks.onSessionReady).toHaveBeenCalledWith({ playerId: 'alice', resumed: false })
  })

  it('offers its own resume token, under its own key', async () => {
    localStorage.setItem(TOKEN_KEY, 'rt-old')
    localStorage.setItem('golf_v2_resume_token', 'rt-golf')
    await connect()
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse((init as { body: string }).body)).toEqual({ resumeToken: 'rt-old' })
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

    const [, ws] = await connect()
    ws.close()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('rt-456')
  })

  it('encodes room commands bare and game moves in their envelope', async () => {
    const [hub, ws] = await connect()
    hub.createRoom()
    hub.joinRoom('ROOM01')
    hub.chat('hi')
    hub.move('castle', 'playFromHand', { indexes: [0, 2] })
    hub.move('golf', 'drawCard')
    hub.leaveRoom()
    expect(ws.sentFrames()).toEqual([
      { event: 'createRoom', payload: {} },
      { event: 'joinRoom', payload: { roomId: 'ROOM01' } },
      { event: 'chat', payload: { text: 'hi' } },
      { event: 'castle', payload: { move: { playFromHand: { indexes: [0, 2] } } } },
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

  it('a terminal refusal is lost, not rejected', async () => {
    const [, ws] = await connect()
    ws.receiveRaw({ exception: 'AccessDenied', payload: { message: 'origin not allowed' } })
    expect(callbacks.onLost).toHaveBeenCalledWith('origin not allowed')
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

  it('reconnects on close and gives up after ten tries', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    for (let attempt = 0; attempt < 10; attempt++) {
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

  it('a deliberate disconnect never reconnects', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    hub.disconnect()
    await vi.advanceTimersByTimeAsync(5000)
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(hub.isConnected).toBe(false)
  })
})
