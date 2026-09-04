import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { GolfNetworkAdapter, golfSessionUrl } from '../networkAdapter'
import type { GolfAdapterCallbacks } from '../networkAdapter'
import type { GameState } from '@/types/golf'

type MockedCallbacks = {
  [K in keyof Required<GolfAdapterCallbacks>]: Mock<Required<GolfAdapterCallbacks>[K]>
}

// The adapter against a scripted wire: session mint, the smithy
// JSON-text envelopes, wire-to-UI shape translation, and the local
// take-from-discard emulation.

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

  lastSent(): { event: string; payload: Record<string, unknown> } {
    return JSON.parse(this.sent[this.sent.length - 1])
  }
}

const flushAsync = () => new Promise(resolve => setTimeout(resolve, 0))

describe('GolfNetworkAdapter', () => {
  it('derives the session url from the play url', () => {
    expect(golfSessionUrl()).toBe('https://api.muchq.com/games/v2/session')
  })

  it('follows the play url override, plain http for a plain ws', () => {
    vi.stubEnv('VITE_GOLF_WEBSOCKET_URL', 'ws://localhost:2015/games/v2/golf/play')
    try {
      expect(golfSessionUrl()).toBe('http://localhost:2015/games/v2/session')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  let fetchMock: ReturnType<typeof vi.fn>
  let callbacks: MockedCallbacks

  const sampleView = {
    gameId: 'GAME01',
    phase: 'playing' as const,
    players: [
      {
        playerId: 'alice',
        cards: [{ card: { rank: 'A', suit: '♠' } }, {}, {}, {}],
        revealedIndexes: [0],
        hasPeeked: false
      },
      { playerId: 'bob', cards: [{}, {}, {}, {}], revealedIndexes: [], hasPeeked: true }
    ],
    currentPlayerId: 'bob',
    drawPileCount: 40,
    discardCount: 3,
    discardTop: { rank: 'Q', suit: '♥' },
    allPlayersPeeked: false
  }

  beforeEach(() => {
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket)
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ playerId: 'alice', ticket: 't-123', resumeToken: 'rt-456' })
    })
    vi.stubGlobal('fetch', fetchMock)
    localStorage.clear()
    callbacks = {
      onRoomJoined: vi.fn(),
      onRoomLeft: vi.fn(),
      onGameJoined: vi.fn(),
      onGameStateUpdate: vi.fn(),
      onRoomStateUpdate: vi.fn(),
      onNotification: vi.fn(),
      onConnectionChange: vi.fn(),
      onGameEnded: vi.fn(),
      onNewGameStarted: vi.fn(),
      onReconnecting: vi.fn(),
      onGameError: vi.fn(),
      onChatMessage: vi.fn(),
      onChatHistory: vi.fn()
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const connect = async (): Promise<[GolfNetworkAdapter, FakeWebSocket]> => {
    const adapter = new GolfNetworkAdapter(callbacks)
    adapter.connect()
    await flushAsync()
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.receive('sessionReady', { playerId: 'alice', resumed: false })
    return [adapter, ws]
  }

  it('a disconnect during the mint creates no socket', async () => {
    const adapter = new GolfNetworkAdapter(callbacks)
    adapter.connect()
    // Torn down (a StrictMode remount, a fast navigation) before the mint
    // resolves: nothing may dial afterwards, or a seat nobody can close
    // would be held under the live adapter's playerId.
    adapter.disconnect()
    await flushAsync()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(FakeWebSocket.instances).toHaveLength(0)
    expect(adapter.playerId).toBeNull()
  })

  it('mints a session, stores the resume token, and dials with the ticket', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
    const [, ws] = await connect()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    // A hung mint must time out rather than stall the reconnect loop;
    // the budget is pinned, not just the wiring.
    expect(timeoutSpy).toHaveBeenCalledWith(10_000)
    expect(init.signal).toBe(timeoutSpy.mock.results[0].value)
    expect(url).toContain('/games/v2/session')
    expect(JSON.parse((init as { body: string }).body)).toEqual({})

    expect(ws.url).toContain('?ticket=t-123')
    expect(ws.protocol).toBe('smithy.eventstream.v1+json')
    expect(localStorage.getItem('golf_v2_resume_token')).toBe('rt-456')
  })

  it('re-mints with the stored resume token', async () => {
    localStorage.setItem('golf_v2_resume_token', 'rt-old')
    await connect()
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse((init as { body: string }).body)).toEqual({ resumeToken: 'rt-old' })
  })

  it('announces a room once, then streams updates', async () => {
    const [, ws] = await connect()
    const room = {
      roomId: 'ROOM01',
      players: [
        { playerId: 'alice', connected: true, gamesPlayed: 2, gamesWon: 1, totalScore: 7 }
      ],
      games: [{ gameId: 'GAME01', status: 'waiting', playerCount: 1 }]
    }

    ws.receive('roomState', room)
    expect(callbacks.onRoomJoined).toHaveBeenCalledTimes(1)
    const [playerId, mapped] = callbacks.onRoomJoined.mock.calls[0]
    expect(playerId).toBe('alice')
    expect(mapped.id).toBe('ROOM01')
    expect(mapped.players[0].totalScore).toBe(7)
    expect(mapped.players[0].gamesWon).toBe(1)
    expect(mapped.games['GAME01'].gamePhase).toBe('waiting')
    expect(mapped.games['GAME01'].players).toHaveLength(1)

    ws.receive('roomState', { ...room, games: [] })
    expect(callbacks.onRoomJoined).toHaveBeenCalledTimes(1)
    expect(callbacks.onRoomStateUpdate).toHaveBeenCalledTimes(1)

    ws.receive('roomLeft', { roomId: 'ROOM01' })
    // The leave ack reaches the hook: the permalink detour chains its
    // target join on this (muchq.github.io#260).
    expect(callbacks.onRoomLeft).toHaveBeenCalledWith('ROOM01')
    ws.receive('roomState', room)
    expect(callbacks.onRoomJoined).toHaveBeenCalledTimes(2)
  })

  it('lists only golf tables: a castle table in the room is not a golf game', async () => {
    const [, ws] = await connect()
    ws.receive('roomState', {
      roomId: 'ROOM01',
      players: [],
      games: [
        { gameId: 'GOLF01', game: 'golf', status: 'waiting', playerCount: 1 },
        { gameId: 'CASTLE1', game: 'castle', status: 'waiting', playerCount: 2 },
        // A row from before the field is golf: it predates castle.
        { gameId: 'OLD01', status: 'playing', playerCount: 2 }
      ]
    })
    const [, mapped] = callbacks.onRoomJoined.mock.calls[0]
    expect(Object.keys(mapped.games).sort()).toEqual(['GOLF01', 'OLD01'])
  })

  it("the room's castle announcements are not golf's to read", async () => {
    const [adapter, ws] = await connect()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ws.receive('castle', { update: { gameCreated: { gameId: 'CASTLE1', createdBy: 'bob' } } })
    expect(warn).not.toHaveBeenCalled()
    expect(callbacks.onNewGameStarted).not.toHaveBeenCalled()
    expect(adapter.gameState).toBeNull()
  })

  it('delivers chat as typed state, never as a toast', async () => {
    const [, ws] = await connect()
    const message = { messageId: 7, playerId: 'bob', text: 'nice draw', sentAtUnixMillis: 1700000000000 }

    ws.receive('roomChat', message)
    expect(callbacks.onChatMessage).toHaveBeenCalledWith(message)
    // The old path reduced chat to a transient notification; a durable
    // message must never ride that channel again.
    expect(callbacks.onNotification).not.toHaveBeenCalled()
  })

  it('delivers the history replay as one ordered batch', async () => {
    const [, ws] = await connect()
    const messages = [
      { messageId: 1, playerId: 'alice', text: 'first', sentAtUnixMillis: 1 },
      { messageId: 2, playerId: 'bob', text: 'second', sentAtUnixMillis: 2 }
    ]

    ws.receive('roomChatHistory', { messages })
    expect(callbacks.onChatHistory).toHaveBeenCalledWith(messages)
    expect(callbacks.onChatMessage).not.toHaveBeenCalled()
  })

  it('sends chat as the exact wire command', async () => {
    const [adapter, ws] = await connect()
    adapter.sendChat('hello room')
    expect(ws.lastSent()).toEqual({ event: 'chat', payload: { text: 'hello room' } })
  })

  it('translates game views into the UI shape', async () => {
    const [adapter, ws] = await connect()
    ws.receive('golf', { update: { gameState: { view: sampleView } } })

    const state = adapter.gameState as GameState
    expect(state.id).toBe('GAME01')
    expect(state.currentPlayerIndex).toBe(1) // bob
    expect(state.drawPile).toBe(40)
    expect(state.discardPile).toEqual([{ rank: 'Q', suit: '♥' }])
    expect(state.players[0].cards).toEqual([{ rank: 'A', suit: '♠' }, null, null, null])
    expect(state.players[0].revealedCards).toEqual([0])
    expect(state.players[1].hasPeeked).toBe(true)
    expect(state.drawnCard).toBeNull()
    expect(callbacks.onGameStateUpdate).toHaveBeenCalledTimes(1)
  })

  it('emulates take-from-discard locally and sends on placement', async () => {
    const [adapter, ws] = await connect()
    ws.receive('golf', { update: { gameState: { view: sampleView } } })
    const sentBefore = ws.sent.length

    adapter.takeFromDiscard()
    expect(ws.sent.length).toBe(sentBefore) // nothing left the browser
    expect(adapter.gameState?.drawnCard).toEqual({ rank: 'Q', suit: '♥' })
    expect(adapter.gameState?.discardPile).toHaveLength(0)

    adapter.swapCard(2)
    expect(ws.lastSent()).toEqual({
      event: 'golf',
      payload: { move: { takeFromDiscard: { cardIndex: 2 } } }
    })

    // A fresh server view ends any emulation; a plain swap goes out as-is.
    ws.receive('golf', { update: { gameState: { view: sampleView } } })
    adapter.swapCard(1)
    expect(ws.lastSent()).toEqual({
      event: 'golf',
      payload: { move: { swapCard: { cardIndex: 1 } } }
    })
  })

  it('putting the taken discard back restores the server view silently', async () => {
    const [adapter, ws] = await connect()
    ws.receive('golf', { update: { gameState: { view: sampleView } } })
    const sentBefore = ws.sent.length

    adapter.takeFromDiscard()
    adapter.discardDrawn()
    expect(ws.sent.length).toBe(sentBefore)
    expect(adapter.gameState?.drawnCard).toBeNull()
    expect(adapter.gameState?.discardPile).toEqual([{ rank: 'Q', suit: '♥' }])
  })

  it('swallows its own gameCreated echo by creator id, announces others', async () => {
    const [adapter, ws] = await connect()

    adapter.createGame('ignored-room-id')
    expect(ws.lastSent()).toEqual({ event: 'golf', payload: { move: { createGame: {} } } })
    ws.receive('golf', { update: { gameCreated: { gameId: 'GAME01', createdBy: 'alice' } } })
    expect(callbacks.onNewGameStarted).not.toHaveBeenCalled()

    ws.receive('golf', { update: { gameCreated: { gameId: 'GAME02', createdBy: 'bob' } } })
    expect(callbacks.onNewGameStarted).toHaveBeenCalledWith('GAME02')
  })

  it('maps gameEnded scores and passes the winners list through', async () => {
    const [, ws] = await connect()
    ws.receive('golf', {
      update: {
        gameEnded: {
          winner: 'alice & bob',
          winners: ['alice', 'bob'],
          finalScores: [
            { playerId: 'alice', score: 0 },
            { playerId: 'bob', score: 0 }
          ]
        }
      }
    })
    expect(callbacks.onGameEnded).toHaveBeenCalledWith(
      'alice & bob',
      [
        { playerName: 'alice', score: 0 },
        { playerName: 'bob', score: 0 }
      ],
      ['alice', 'bob']
    )
  })

  it('surfaces rejections in-band and keeps the session', async () => {
    const [, ws] = await connect()
    ws.receive('commandRejected', { reason: 'not your turn' })
    expect(callbacks.onGameError).toHaveBeenCalledWith('not your turn')
    expect(localStorage.getItem('golf_v2_resume_token')).toBe('rt-456')
  })

  it('signals a resumed session', async () => {
    const adapter = new GolfNetworkAdapter(callbacks)
    adapter.connect()
    await flushAsync()
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.receive('sessionReady', { playerId: 'alice', resumed: true, roomId: 'ROOM01' })
    expect(callbacks.onReconnecting).toHaveBeenCalledTimes(1)
    adapter.disconnect()
  })

  it('drops the resume token when refused before admission', async () => {
    const adapter = new GolfNetworkAdapter(callbacks)
    adapter.connect()
    await flushAsync()
    expect(localStorage.getItem('golf_v2_resume_token')).toBe('rt-456')

    // Closed without ever seeing sessionReady: spent ticket or seat
    // conflict — the next dial must mint fresh.
    const ws = FakeWebSocket.instances[0]
    ws.open()
    ws.close()
    expect(localStorage.getItem('golf_v2_resume_token')).toBeNull()
    adapter.disconnect()
  })

  it('sends room commands as bare envelopes and moves inside golf', async () => {
    const [adapter, ws] = await connect()
    adapter.joinRoom('ROOM77')
    expect(ws.lastSent()).toEqual({ event: 'joinRoom', payload: { roomId: 'ROOM77' } })
    adapter.drawCard()
    expect(ws.lastSent()).toEqual({ event: 'golf', payload: { move: { drawCard: {} } } })
    adapter.peekCard(3)
    expect(ws.lastSent()).toEqual({
      event: 'golf',
      payload: { move: { peekCard: { cardIndex: 3 } } }
    })
    adapter.knock()
    expect(ws.lastSent()).toEqual({ event: 'golf', payload: { move: { knock: {} } } })
  })
  it('maps an ended view: knocker, held card, absent current player, empty pile', async () => {
    const [adapter, ws] = await connect()
    ws.receive('golf', {
      update: {
        gameState: {
          view: {
            ...sampleView,
            phase: 'ended',
            currentPlayerId: undefined,
            knockedPlayerId: 'bob',
            drawnCard: { rank: '7', suit: '♦' },
            allPlayersPeeked: true,
            discardTop: undefined,
            discardCount: 0
          }
        }
      }
    })

    const state = adapter.gameState as GameState
    expect(state.gamePhase).toBe('ended')
    expect(state.currentPlayerIndex).toBe(0) // absent current player defaults to seat 0
    expect(state.knockedPlayerId).toBe('bob')
    expect(state.drawnCard).toEqual({ rank: '7', suit: '♦' })
    expect(state.allPlayersPeeked).toBe(true)
    expect(state.discardPile).toEqual([])
  })

  it('delivers gameJoined with the mapped state', async () => {
    const [adapter, ws] = await connect()
    ws.receive('golf', { update: { gameJoined: { view: sampleView } } })
    expect(callbacks.onGameJoined).toHaveBeenCalledTimes(1)
    const [playerId, state] = callbacks.onGameJoined.mock.calls[0]
    expect(playerId).toBe('alice')
    expect(state.id).toBe('GAME01')
    expect(callbacks.onNotification).toHaveBeenCalledWith('Joined game successfully!')
    expect(adapter.gameState?.id).toBe('GAME01')
  })

  it('gameLeft clears the held game state', async () => {
    const [adapter, ws] = await connect()
    ws.receive('golf', { update: { gameState: { view: sampleView } } })
    expect(adapter.gameState).not.toBeNull()
    ws.receive('golf', { update: { gameLeft: { gameId: 'GAME01' } } })
    expect(adapter.gameState).toBeNull()
  })

  it('takeFromDiscard is a no-op with nothing on the pile', async () => {
    const [adapter, ws] = await connect()
    ws.receive('golf', {
      update: { gameState: { view: { ...sampleView, discardTop: undefined, discardCount: 0 } } }
    })
    const updates = callbacks.onGameStateUpdate.mock.calls.length
    adapter.takeFromDiscard()
    expect(callbacks.onGameStateUpdate).toHaveBeenCalledTimes(updates)
    expect(adapter.gameState?.drawnCard).toBeNull()
  })

  it('leaveRoom sends the envelope and re-announces the next room', async () => {
    const [adapter, ws] = await connect()
    const room = { roomId: 'ROOM01', players: [], games: [] }
    ws.receive('roomState', room)
    expect(callbacks.onRoomJoined).toHaveBeenCalledTimes(1)

    adapter.leaveRoom('ROOM01')
    expect(ws.lastSent()).toEqual({ event: 'leaveRoom', payload: {} })

    ws.receive('roomState', room)
    expect(callbacks.onRoomJoined).toHaveBeenCalledTimes(2)
  })

  it('signals connection state on open and close', async () => {
    const [, ws] = await connect()
    expect(callbacks.onConnectionChange).toHaveBeenCalledWith(true)
    ws.close()
    expect(callbacks.onConnectionChange).toHaveBeenLastCalledWith(false)
  })

  it('re-dials with a fresh mint after an abrupt close', async () => {
    vi.useFakeTimers()
    try {
      const adapter = new GolfNetworkAdapter(callbacks)
      adapter.connect()
      await vi.advanceTimersByTimeAsync(0)
      const first = FakeWebSocket.instances[0]
      first.open()
      first.receive('sessionReady', { playerId: 'alice', resumed: false })

      first.close() // abrupt loss
      await vi.advanceTimersByTimeAsync(2000)

      expect(fetchMock).toHaveBeenCalledTimes(2)
      // The re-mint rides the stored resume token, so the seat resumes.
      const [, init] = fetchMock.mock.calls[1]
      expect(JSON.parse((init as { body: string }).body)).toEqual({ resumeToken: 'rt-456' })
      expect(FakeWebSocket.instances).toHaveLength(2)
      adapter.disconnect()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a failed mint schedules a retry', async () => {
    vi.useFakeTimers()
    try {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 503 })
      const adapter = new GolfNetworkAdapter(callbacks)
      adapter.connect()
      await vi.advanceTimersByTimeAsync(0)
      expect(FakeWebSocket.instances).toHaveLength(0)

      await vi.advanceTimersByTimeAsync(2000)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(FakeWebSocket.instances).toHaveLength(1)
      adapter.disconnect()
    } finally {
      vi.useRealTimers()
    }
  })

  it('disconnect stops the reconnect loop', async () => {
    vi.useFakeTimers()
    try {
      const adapter = new GolfNetworkAdapter(callbacks)
      adapter.connect()
      await vi.advanceTimersByTimeAsync(0)
      FakeWebSocket.instances[0].open()

      adapter.disconnect()
      await vi.advanceTimersByTimeAsync(10_000)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(FakeWebSocket.instances).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('gives up with an error after the reconnect budget', async () => {
    vi.useFakeTimers()
    try {
      fetchMock.mockRejectedValue(new Error('down'))
      const adapter = new GolfNetworkAdapter(callbacks)
      adapter.connect()
      await vi.advanceTimersByTimeAsync(0)
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(2000)
      }
      expect(callbacks.onGameError).toHaveBeenCalledWith('Lost connection to the golf server')
      expect(fetchMock).toHaveBeenCalledTimes(11)
      adapter.disconnect()
    } finally {
      vi.useRealTimers()
    }
  })

})
