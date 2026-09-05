import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { GolfNetworkAdapter } from '../networkAdapter'
import type { GolfAdapterCallbacks } from '../networkAdapter'
import type { GameState } from '@/types/golf'
import { FakeWebSocket, flushAsync, installFakeHub } from '@/test/fakeHub'

type MockedCallbacks = {
  [K in keyof Required<GolfAdapterCallbacks>]: Mock<Required<GolfAdapterCallbacks>[K]>
}

// Golf's client against a scripted wire: what it adds on top of
// hubStream (whose own suite pins the mint, the socket and the reconnect
// loop): the golf envelope, wire-to-UI shape translation, and the local
// take-from-discard emulation.

describe('GolfNetworkAdapter', () => {
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
    fetchMock = installFakeHub()
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

  it('keeps its seat under the identity key the lobby shares', async () => {
    localStorage.setItem('golf_v2_resume_token', 'rt-old')
    await connect()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse((init as { body: string }).body)).toEqual({ resumeToken: 'rt-old' })
    expect(localStorage.getItem('golf_v2_resume_token')).toBe('rt-456')
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

    // Server state is authoritative: a fresh view ends a take that was
    // still pending, and the placement goes out as a plain swap.
    adapter.takeFromDiscard()
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
    // The UI drew the take; it must draw the put-back too.
    expect(callbacks.onGameStateUpdate).toHaveBeenLastCalledWith(adapter.gameState)
    expect(callbacks.onGameStateUpdate).toHaveBeenCalledTimes(3)
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

  it('a rejection is an error first and a toast second, and keeps the session', async () => {
    // useGolfGame's error handler settles a permalink join attempt on the
    // refusal, and its toast handler then decides whether the same
    // reason is news; in the other order the toast would be swallowed.
    const order: string[] = []
    callbacks.onGameError.mockImplementation(() => order.push('error'))
    callbacks.onNotification.mockImplementation(() => order.push('toast'))
    const [, ws] = await connect()
    ws.receive('commandRejected', { reason: 'not your turn' })
    expect(order).toEqual(['error', 'toast'])
    expect(callbacks.onGameError).toHaveBeenCalledWith('not your turn')
    expect(localStorage.getItem('golf_v2_resume_token')).toBe('rt-456')
  })

  it('signals a resume only when the seat lands back in a room', async () => {
    const resume = async (ready: Record<string, unknown>) => {
      const adapter = new GolfNetworkAdapter(callbacks)
      adapter.connect()
      await flushAsync()
      const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
      ws.open()
      ws.receive('sessionReady', { playerId: 'alice', ...ready })
      adapter.disconnect()
    }
    await resume({ resumed: true, roomId: 'ROOM01' })
    expect(callbacks.onReconnecting).toHaveBeenCalledTimes(1)
    // A resumed identity that is nowhere, and a fresh one already seated
    // (the hub's roomId on a first sessionReady): neither is a reconnect
    // the UI should announce.
    await resume({ resumed: true })
    await resume({ resumed: false, roomId: 'ROOM01' })
    expect(callbacks.onReconnecting).toHaveBeenCalledTimes(1)
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

  it('gameLeft clears the held game state and any pending take', async () => {
    const [adapter, ws] = await connect()
    ws.receive('golf', { update: { gameState: { view: sampleView } } })
    expect(adapter.gameState).not.toBeNull()
    adapter.takeFromDiscard()
    ws.receive('golf', { update: { gameLeft: { gameId: 'GAME01' } } })
    expect(adapter.gameState).toBeNull()
    // The take left with the table: a placement now is a plain swap, and
    // a put-back has no old view to resurrect.
    adapter.swapCard(1)
    expect(ws.lastSent()).toEqual({ event: 'golf', payload: { move: { swapCard: { cardIndex: 1 } } } })
    adapter.discardDrawn()
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

  it('the leave ack drops the room state before the UI hears of it', async () => {
    // useGolfGame clears its room and game on onRoomLeft only when the
    // adapter no longer holds a room, so the order is load-bearing.
    const [adapter, ws] = await connect()
    ws.receive('roomState', { roomId: 'ROOM01', players: [], games: [] })
    callbacks.onRoomLeft.mockImplementation(() => {
      expect(adapter.roomState).toBeNull()
    })
    ws.receive('roomLeft', { roomId: 'ROOM01' })
    expect(callbacks.onRoomLeft).toHaveBeenCalledWith('ROOM01')
    expect(adapter.roomState).toBeNull()
  })

  // What riding hubStream bought (muchq.github.io#297): a terminal
  // refusal reaches the UI instead of the console.
  it('a terminal refusal frame is an error the UI hears', async () => {
    const [, ws] = await connect()
    ws.receiveRaw({ exception: 'AccessDenied', payload: { message: 'origin not allowed' } })
    expect(callbacks.onGameError).toHaveBeenCalledWith('origin not allowed')
    expect(callbacks.onNotification).not.toHaveBeenCalled()
  })
})
