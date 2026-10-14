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
      onVoice: vi.fn(),
      onLost: vi.fn(),
      onSuperseded: vi.fn()
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
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('rt-456')
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
    sessionStorage.setItem(TOKEN_KEY, 'rt-old')
    sessionStorage.setItem('golf_v2_resume_token', 'rt-golf')
    await connect()
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse((init as { body: string }).body)).toEqual({ resumeToken: 'rt-old' })
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    expect(sessionStorage.getItem('golf_v2_resume_token')).toBe('rt-golf')
  })

  // Tabs share localStorage: a token kept there would be offered by a
  // second tab, which would take the first tab's seat. sessionStorage is
  // the tab's own, and survives a reload.
  it("keeps the resume token to this tab, never offering or touching another's", async () => {
    localStorage.setItem(TOKEN_KEY, 'rt-other-tab')
    await connect()
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse((init as { body: string }).body)).toEqual({})
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('rt-other-tab')
  })

  it('a disconnect during the mint creates no socket', async () => {
    const hub = stream()
    hub.connect()
    hub.disconnect()
    await flushAsync()
    expect(FakeWebSocket.instances).toHaveLength(0)
  })

  // The mint swaps a token it cannot resolve for a fresh identity, so a
  // dial that fails before admission (a radio waking up, a restarting hub)
  // never means the token is bad: forgetting it would cost the seat.
  it('a close before admission keeps the resume token, as does one after', async () => {
    const hub = stream()
    hub.connect()
    await flushAsync()
    const refused = FakeWebSocket.instances[0]
    refused.open()
    refused.close()
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    hub.disconnect()

    const [admittedHub, ws] = await connect()
    ws.close()
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    admittedHub.disconnect()
  })

  // The hub refuses a resume while the seat's old session is still
  // unwinding; the identity is good, and the next dial reclaims it.
  it('a SeatConflict refusal keeps the resume token and dials again with it', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    const refused = FakeWebSocket.instances[0]
    refused.open()
    refused.receiveRaw({ exception: 'SeatConflict', payload: { message: 'player already has a live connection' } })
    refused.close()
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    expect(callbacks.onLost).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2000)
    const [, init] = fetchMock.mock.calls[1]
    expect(JSON.parse((init as { body: string }).body)).toEqual({ resumeToken: 'rt-456' })
    hub.disconnect()
  })

  // A refusal arrives after the socket opens; only admission is progress,
  // so a seat that never frees spends the budget instead of looping.
  it('refusals after the socket opens still spend the reconnect budget', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    for (let attempt = 0; attempt <= 10; attempt++) {
      await vi.advanceTimersByTimeAsync(0)
      const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
      ws.open()
      ws.receiveRaw({ exception: 'SeatConflict', payload: { message: 'player already has a live connection' } })
      ws.close()
      await vi.advanceTimersByTimeAsync(2000)
    }
    expect(FakeWebSocket.instances).toHaveLength(11)
    expect(callbacks.onLost).toHaveBeenCalledWith('Lost connection to the games hub')
  })

  // A socket's close can land after a disconnect and reconnect replaced
  // it; it speaks for that socket only.
  it('a replaced socket closing late neither dials again nor reports a drop', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    const old = FakeWebSocket.instances[0]
    old.open()
    old.receive('sessionReady', { playerId: 'alice', resumed: false })
    const lateClose = old.onclose
    old.onclose = null
    hub.disconnect()
    hub.connect()
    // Late enough to beat the next socket, as well as after it.
    lateClose?.({ code: 1006 })
    await vi.advanceTimersByTimeAsync(0)
    const current = FakeWebSocket.instances[1]
    current.open()
    current.receive('sessionReady', { playerId: 'alice', resumed: true })
    callbacks.onConnection.mockClear()
    lateClose?.({ code: 1006 })
    await vi.advanceTimersByTimeAsync(5000)
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(callbacks.onConnection).not.toHaveBeenCalled()
    expect(hub.isConnected).toBe(true)
    hub.disconnect()
  })

  // A dial takes the seat from any other socket holding the identity, and
  // the hub closes the one it took over with 4001: a duplicated tab, say.
  // Redialing would take the seat straight back, so the stream stops and
  // says so; connect() is the player choosing to play here instead.
  it('a 4001 close is superseded: no redial until connect, and the identity is kept', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    const kicked = FakeWebSocket.instances[0]
    kicked.open()
    kicked.receive('sessionReady', { playerId: 'alice', resumed: false })
    kicked.close(4001)
    expect(callbacks.onSuperseded).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(callbacks.onLost).not.toHaveBeenCalled()

    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeWebSocket.instances).toHaveLength(2)
    const [, init] = fetchMock.mock.calls[1]
    expect(JSON.parse((init as { body: string }).body)).toEqual({ resumeToken: 'rt-456' })
    hub.disconnect()
  })

  // Play here clicked twice, or while a redial waits: one dial, not two
  // sockets racing for the seat.
  it('connect while a dial is under way or a redial waits dials once', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeWebSocket.instances).toHaveLength(1)

    FakeWebSocket.instances[0].close()  // a redial is now 2s away
    hub.connect()
    await vi.advanceTimersByTimeAsync(5000)
    expect(FakeWebSocket.instances).toHaveLength(2)
    hub.disconnect()
  })

  // A socket a newer dial replaced speaks for nothing: its frames are not
  // the session's.
  it("a replaced socket's frames are ignored", async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    const old = FakeWebSocket.instances[0]
    old.open()
    old.receive('sessionReady', { playerId: 'alice', resumed: false })
    const lateMessage = old.onmessage
    old.close(4001)
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    callbacks.onRoom.mockClear()
    lateMessage?.({ data: JSON.stringify({ event: 'roomState', payload: { roomId: 'R1', players: [], games: [] } }) })
    expect(callbacks.onRoom).not.toHaveBeenCalled()
    hub.disconnect()
  })

  // Playing here is a fresh start: ten tries, whatever the last outage spent.
  it('connect gives the next outage the whole reconnect budget', async () => {
    vi.useFakeTimers()
    fetchMock.mockRejectedValue(new Error('down'))
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    for (let attempt = 0; attempt < 10; attempt++) await vi.advanceTimersByTimeAsync(2000)
    expect(callbacks.onLost).toHaveBeenCalledTimes(1)
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    for (let attempt = 0; attempt < 9; attempt++) await vi.advanceTimersByTimeAsync(2000)
    expect(callbacks.onLost).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2000)
    expect(callbacks.onLost).toHaveBeenCalledTimes(2)
  })

  it('any other close redials as before', async () => {
    vi.useFakeTimers()
    const hub = stream()
    hub.connect()
    await vi.advanceTimersByTimeAsync(0)
    FakeWebSocket.instances[0].open()
    FakeWebSocket.instances[0].receive('sessionReady', { playerId: 'alice', resumed: false })
    FakeWebSocket.instances[0].close(1000)
    await vi.advanceTimersByTimeAsync(2000)
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(callbacks.onSuperseded).not.toHaveBeenCalled()
    hub.disconnect()
  })

  it('a deliberate disconnect before admission keeps the identity', async () => {
    const hub = stream()
    hub.connect()
    await flushAsync()
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('rt-456')
    hub.disconnect()
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('rt-456')
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

  // A raw roomChat frame with bot: true reaches the chat callback intact
  // (MoonBase#1591) — the stream does not strip unknown-to-older-clients
  // optional fields.
  it('hands a bot roomChat frame through with bot: true intact', async () => {
    const [, ws] = await connect()
    const botMessage = {
      messageId: 8,
      playerId: 'microgpt',
      text: 'forty-two',
      sentAtUnixMillis: 2,
      bot: true
    }
    ws.receive('roomChat', botMessage)
    expect(callbacks.onChat).toHaveBeenCalledWith(botMessage)
    ws.receive('roomChatHistory', { messages: [botMessage] })
    expect(callbacks.onChatHistory).toHaveBeenCalledWith([botMessage])
  })

  // mithril's reply exactly as MoonBase's golf_wire_test pins it
  // (AWordchainReplyCarriesItsLadderOnTheWire): the ladder reaches the chat
  // callbacks intact, live and replayed.
  it('hands a wordchain roomChat frame through with its ladder intact', async () => {
    const [, ws] = await connect()
    const ladder = JSON.parse(
      '{"bot":true,"messageId":2,"playerId":"mithril","sentAtUnixMillis":3,' +
        '"text":"cold → cord → card → ward → warm",' +
        '"wordchain":{"end":"warm","path":["cold","cord","card","ward","warm"],"start":"cold"}}'
    )
    ws.receive('roomChat', ladder)
    expect(callbacks.onChat).toHaveBeenCalledWith(ladder)
    expect(callbacks.onChat.mock.calls[0][0].wordchain?.path).toEqual(['cold', 'cord', 'card', 'ward', 'warm'])
    ws.receive('roomChatHistory', { messages: [ladder] })
    expect(callbacks.onChatHistory).toHaveBeenCalledWith([ladder])
  })

  it('hands each game envelope through by name, contents untouched', async () => {
    const [, ws] = await connect()
    ws.receive('castle', { update: { turnChanged: { playerId: 'bob' } } })
    expect(callbacks.onGame).toHaveBeenCalledWith('castle', { turnChanged: { playerId: 'bob' } })
    ws.receive('golf', { update: { gameStarted: {} } })
    expect(callbacks.onGame).toHaveBeenCalledWith('golf', { gameStarted: {} })
    ws.receive('rummy', { update: { gameLeft: { playerId: 'bob' } } })
    expect(callbacks.onGame).toHaveBeenCalledWith('rummy', { gameLeft: { playerId: 'bob' } })
    ws.receive('chess', { update: { gameEnded: { result: { ending: 'stalemate' } } } })
    expect(callbacks.onGame).toHaveBeenCalledWith('chess', { gameEnded: { result: { ending: 'stalemate' } } })
    ws.receive('pong', { update: { frame: { gameId: 'P1', tick: 3 } } })
    expect(callbacks.onGame).toHaveBeenCalledWith('pong', { frame: { gameId: 'P1', tick: 3 } })
    ws.receive('spades', { update: { gameStarted: {} } })
    expect(callbacks.onGame).toHaveBeenCalledWith('spades', { gameStarted: {} })
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

  // The frames MoonBase's voice_wire_test pins, byte for byte.
  it('carries the voice envelope both ways: actions up, updates down', async () => {
    const [hub, ws] = await connect()
    hub.voice('join')
    hub.voice('signal', { to: 'player-1', toEpoch: 1, description: { type: 'offer', sdp: 'v=0' } })
    hub.voice('leave')
    expect(ws.sent).toEqual([
      '{"event":"voice","payload":{"action":{"join":{}}}}',
      '{"event":"voice","payload":{"action":{"signal":{"to":"player-1","toEpoch":1,"description":{"type":"offer","sdp":"v=0"}}}}}',
      '{"event":"voice","payload":{"action":{"leave":{}}}}'
    ])
    ws.receiveRaw(
      JSON.parse(
        '{"event":"voice","payload":{"update":{"roster":{"epoch":2,"iceServers":[{"urls":["stun:stun.example:3478"]}],' +
          '"members":[{"epoch":1,"playerId":"player-1"}]}}}}'
      )
    )
    expect(callbacks.onVoice).toHaveBeenCalledWith({
      roster: { epoch: 2, iceServers: [{ urls: ['stun:stun.example:3478'] }], members: [{ epoch: 1, playerId: 'player-1' }] }
    })
    expect(callbacks.onLobby).not.toHaveBeenCalled()
  })

  // One deja event on the glass, as the hub fans it out (lobby.smithy's
  // TapeSplat): the frame the hub really sends, not a shape of our own.
  it('carries a tape splat, and a snapshot that arrives with the glass already full', async () => {
    const [hub, ws] = await connect()
    const wire = {
      seq: 41,
      wall: 2,
      u: 0.25,
      v: 0.5,
      ts: 1_700_000_000.5,
      context: ['GET /a', 'GET /b'],
      actual: 'GET /c',
      verdict: 'anomaly',
      bigram: { token: 'GET /b', p: 0.42 },
    }
    ws.receive('lobby', { update: { tape: wire } })
    expect(callbacks.onLobby).toHaveBeenCalledWith({ tape: wire })
    ws.receive('lobby', { update: { worldState: { players: [], geometry: { plane: {} }, tape: [wire] } } })
    expect(callbacks.onLobby).toHaveBeenLastCalledWith({
      worldState: { players: [], geometry: { plane: {} }, tape: [wire] },
    })
    expect(hub.isConnected).toBe(true)
  })
})
