import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useLobby } from '../useLobby'
import type { UseLobbyProps } from '../useLobby'
import { FakeWebSocket, admitted, flushAsync, installFakeHub } from '@/test/fakeHub'
import { GameState } from '@/utils/gameClasses'
import { HUB_RESUME_TOKEN_KEY } from '@/utils/hubSession'
import { ShapeType } from '@/types/game'
import type { CastleView } from '@/apps/castle/wire'
import type { GolfView } from '@/apps/golf/wire'
import type { HubRoom } from '@/utils/hubStream'

// The lobby hook against a scripted hub: the world it joins and re-joins,
// the tables of either game that swap in and out, and the share links,
// with the URL steered alongside.

const waitingView = (gameId = 'G1'): CastleView => ({
  gameId,
  phase: 'waiting',
  players: [{ playerId: 'alice', ready: false, handCount: 0, hand: [], faceUp: [], faceDownCount: 0, out: false, canPlay: false }],
  drawPileCount: 0,
  pileCount: 0,
  run: [],
  finished: []
})

const golfView = (gameId = 'G7'): GolfView => ({
  gameId,
  phase: 'waiting',
  players: [{ playerId: 'alice', cards: [{}, {}, {}, {}], revealedIndexes: [], hasPeeked: false }],
  drawPileCount: 0,
  discardCount: 0,
  allPlayersPeeked: false
})

const roomState = (roomId: string, games: HubRoom['games'] = []): HubRoom => ({
  roomId,
  players: [{ playerId: 'alice', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 }],
  games
})

describe('useLobby', () => {
  beforeEach(() => {
    installFakeHub()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const mount = (props: UseLobbyProps = {}, path = '/games') => {
    let location = { pathname: path }
    const Probe = () => {
      location = useLocation()
      return null
    }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[path]}>
        <Probe />
        {children}
      </MemoryRouter>
    )
    const hook = renderHook(() => useLobby(props), { wrapper })
    return { ...hook, pathname: () => location.pathname }
  }

  // The renderer's canvas: a GameState with the local player spawned,
  // attached to the hook's world link the way ThoughtsGame does.
  const attachWorld = (hook: ReturnType<typeof mount>) => {
    const gameState = new GameState()
    gameState.localPlayerId = 'local-temp'
    gameState.addPlayer('local-temp', [10, 0, -5], [0.8, 0.2, 0.6], ShapeType.SPHERE)
    act(() => {
      hook.result.current.world.attach(gameState)
    })
    return gameState
  }

  const open = async (props: UseLobbyProps = {}, path = '/games', roomId?: string) => {
    const hook = mount(props, path)
    const gameState = attachWorld(hook)
    let ws!: FakeWebSocket
    await act(async () => {
      ws = await admitted('alice', roomId)
    })
    return { ...hook, ws, gameState }
  }

  const lobbyFrames = (ws: FakeWebSocket) => ws.sentFrames().filter(frame => frame.event === 'lobby')

  it("dials with golf's identity and joins the plaza's world once the session is ready", async () => {
    localStorage.setItem(HUB_RESUME_TOKEN_KEY, 'rt-golf')
    const onPlayerIdChange = vi.fn()
    const { result, ws, gameState, pathname } = await open({ onPlayerIdChange })
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    expect(fetchMock.mock.calls[0][1].body).toBe('{"resumeToken":"rt-golf"}')
    expect(onPlayerIdChange).toHaveBeenCalledWith('alice')
    expect(result.current.playerId).toBe('alice')
    expect(gameState.localPlayerId).toBe('alice')
    // The join names no room: the hub knows the session's world.
    expect(lobbyFrames(ws)).toEqual([
      { event: 'lobby', payload: { action: { join: { position: [10, 0, -5], color: [0.8, 0.2, 0.6], shape: 0 } } } }
    ])
    expect(result.current.world.isConnected).toBe(true)
    expect(pathname()).toBe('/games')
    // The world's updates reach the renderer's state.
    act(() => ws.receive('lobby', { update: { playerJoined: { player: { playerId: 'bob', position: [1, 0, 1], color: [1, 1, 1], shape: 1 } } } }))
    expect(gameState.players.get('bob')?.shape).toBe(ShapeType.CUBE)
    expect(result.current.room).toBeNull()
  })

  it("a seat resumed in a room joins that room's world once, and the URL names the room", async () => {
    const { result, ws, pathname } = await open({}, '/games', 'R1')
    expect(lobbyFrames(ws)).toHaveLength(1)
    act(() => ws.receive('roomState', roomState('R1')))
    expect(result.current.room?.roomId).toBe('R1')
    expect(pathname()).toBe('/games/room/R1')
    // The roomState that follows a resume is not a room change: the hub
    // would refuse a second join as already in the world.
    expect(lobbyFrames(ws)).toHaveLength(1)
    expect(result.current.notice).toBe('')
  })

  it('a room change re-joins the world, and the URL follows the room', async () => {
    const { result, ws, pathname } = await open()
    act(() => result.current.createRoom())
    expect(ws.lastSent()).toEqual({ event: 'createRoom', payload: {} })
    act(() => ws.receive('roomState', roomState('R1')))
    expect(pathname()).toBe('/games/room/R1')
    expect(result.current.room?.roomId).toBe('R1')
    // One join for the plaza, one for the room's world.
    expect(lobbyFrames(ws).filter(frame => 'join' in (frame.payload.action as object))).toHaveLength(2)
    // Members changing is not a room change.
    act(() => ws.receive('roomState', { ...roomState('R1'), players: [] }))
    expect(lobbyFrames(ws)).toHaveLength(2)

    act(() => result.current.leaveRoom())
    act(() => ws.receive('roomLeft', { roomId: 'R1' }))
    expect(pathname()).toBe('/games')
    expect(result.current.room).toBeNull()
    expect(lobbyFrames(ws)).toHaveLength(3)
  })

  it('a castle table swaps in on gameJoined and out on gameLeft, the URL naming the table', async () => {
    const { result, ws, pathname } = await open()
    act(() => ws.receive('roomState', roomState('R1')))
    act(() => result.current.castle.createTable())
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { createGame: {} } } })
    act(() => ws.receive('castle', { update: { gameJoined: { view: waitingView() } } }))
    expect(result.current.castle.view?.gameId).toBe('G1')
    expect(pathname()).toBe('/games/room/R1/table/G1')
    // The world is still up underneath.
    expect(result.current.world.isConnected).toBe(true)

    act(() => result.current.castle.leaveTable())
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { leaveGame: {} } } })
    act(() => ws.receive('castle', { update: { gameLeft: { gameId: 'G1' } } }))
    expect(result.current.castle.view).toBeNull()
    expect(pathname()).toBe('/games/room/R1')
  })

  it('a golf table swaps in the same way, on its own envelope, and the world stays up', async () => {
    const { result, ws, pathname } = await open()
    act(() => ws.receive('roomState', roomState('R1')))
    act(() => result.current.golf.createTable())
    expect(ws.lastSent()).toEqual({ event: 'golf', payload: { move: { createGame: {} } } })
    act(() => ws.receive('golf', { update: { gameJoined: { view: golfView('G9') } } }))
    expect(result.current.golf.view?.id).toBe('G9')
    expect(result.current.castle.view).toBeNull()
    expect(pathname()).toBe('/games/room/R1/table/G9')
    expect(result.current.world.isConnected).toBe(true)

    act(() => result.current.golf.leaveTable())
    expect(ws.lastSent()).toEqual({ event: 'golf', payload: { move: { leaveGame: {} } } })
    act(() => ws.receive('golf', { update: { gameLeft: { gameId: 'G9' } } }))
    expect(result.current.golf.view).toBeNull()
    expect(pathname()).toBe('/games/room/R1')
  })

  it('joining a listed golf table sends its join, and the table answers', async () => {
    const { result, ws } = await open()
    act(() => ws.receive('roomState', roomState('R1', [{ gameId: 'G7', game: 'golf', status: 'waiting', playerCount: 1 }])))
    act(() => result.current.golf.joinTable('G7'))
    expect(ws.lastSent()).toEqual({ event: 'golf', payload: { move: { joinGame: { gameId: 'G7' } } } })
  })

  it('a resume that finds a golf seat held puts the table up, and leaving the room takes it down', async () => {
    const { result, ws, pathname } = await open({}, '/games', 'R1')
    act(() => ws.receive('golf', { update: { gameJoined: { view: golfView('G7') } } }))
    expect(result.current.golf.view?.id).toBe('G7')
    expect(pathname()).toBe('/games/room/R1/table/G7')
    act(() => ws.receive('roomLeft', { roomId: 'R1' }))
    expect(result.current.golf.view).toBeNull()
    expect(pathname()).toBe('/games')
  })

  it('a share link joins the room, then sits at its castle table', async () => {
    const { ws, pathname } = await open({ permalinkRoomId: 'R1', permalinkGameId: 'G1' }, '/games/room/R1/table/G1')
    expect(ws.lastSent()).toEqual({ event: 'joinRoom', payload: { roomId: 'R1' } })
    // No plaza join while the link is pending: the room's world is next.
    expect(lobbyFrames(ws)).toHaveLength(0)
    act(() => ws.receive('roomState', roomState('R1', [{ gameId: 'G1', game: 'castle', status: 'waiting', playerCount: 1 }])))
    expect(lobbyFrames(ws)).toHaveLength(1)
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { joinGame: { gameId: 'G1' } } } })
    act(() => ws.receive('castle', { update: { gameJoined: { view: waitingView() } } }))
    expect(pathname()).toBe('/games/room/R1/table/G1')
  })

  it('a share link to a golf table sits at it; to a table in play or gone, it stays in the room and says so', async () => {
    const golf = await open({ permalinkRoomId: 'R1', permalinkGameId: 'G7' }, '/games/room/R1/table/G7')
    act(() => golf.ws.receive('roomState', roomState('R1', [{ gameId: 'G7', game: 'golf', status: 'waiting', playerCount: 1 }])))
    expect(golf.ws.lastSent()).toEqual({ event: 'golf', payload: { move: { joinGame: { gameId: 'G7' } } } })
    act(() => golf.ws.receive('golf', { update: { gameJoined: { view: golfView('G7') } } }))
    expect(golf.result.current.golf.view?.id).toBe('G7')
    expect(golf.pathname()).toBe('/games/room/R1/table/G7')
    golf.unmount()

    installFakeHub()
    const gone = await open({ permalinkRoomId: 'R2', permalinkGameId: 'G2' }, '/games/room/R2/table/G2')
    act(() => gone.ws.receive('roomState', roomState('R2', [{ gameId: 'G2', game: 'castle', status: 'playing', playerCount: 2 }])))
    expect(gone.result.current.notice).toBe('Table G2 is in play')
    expect(gone.pathname()).toBe('/games/room/R2')
    expect(gone.ws.sentFrames().some(frame => frame.event === 'castle')).toBe(false)
    gone.unmount()

    installFakeHub()
    const busy = await open({ permalinkRoomId: 'R3', permalinkGameId: 'G3' }, '/games/room/R3/table/G3')
    act(() => busy.ws.receive('roomState', roomState('R3', [{ gameId: 'G3', game: 'golf', status: 'playing', playerCount: 2 }])))
    expect(busy.result.current.notice).toBe('Table G3 is in play')
    expect(busy.ws.sentFrames().some(frame => frame.event === 'golf')).toBe(false)
  })

  it('a share link into the room the seat resumed in keeps the seat: no leave, one join, then the table', async () => {
    const { ws, pathname } = await open({ permalinkRoomId: 'R1', permalinkGameId: 'G1' }, '/games/room/R1/table/G1', 'R1')
    expect(ws.sentFrames().some(frame => frame.event === 'leaveRoom' || frame.event === 'joinRoom')).toBe(false)
    expect(lobbyFrames(ws)).toHaveLength(1)
    act(() => ws.receive('roomState', roomState('R1', [{ gameId: 'G1', game: 'castle', status: 'waiting', playerCount: 1 }])))
    expect(lobbyFrames(ws)).toHaveLength(1)
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { joinGame: { gameId: 'G1' } } } })
    // The link's URL stands until the table answers.
    expect(pathname()).toBe('/games/room/R1/table/G1')
  })

  it("a resumed session in another room leaves it for the linked one, through the hub's own order", async () => {
    const { result, ws, pathname } = await open({ permalinkRoomId: 'R2' }, '/games/room/R2', 'R1')
    expect(ws.lastSent()).toEqual({ event: 'leaveRoom', payload: {} })
    // The hub projects the resumed room before it reads the leave: that
    // is where the session is, not where it is going.
    act(() => ws.receive('roomState', roomState('R1')))
    expect(result.current.room?.roomId).toBe('R1')
    expect(pathname()).toBe('/games/room/R2')
    expect(lobbyFrames(ws)).toHaveLength(0)
    act(() => ws.receive('roomLeft', { roomId: 'R1' }))
    expect(ws.lastSent()).toEqual({ event: 'joinRoom', payload: { roomId: 'R2' } })
    expect(lobbyFrames(ws)).toHaveLength(0)
    act(() => ws.receive('roomState', roomState('R2')))
    expect(result.current.room?.roomId).toBe('R2')
    expect(pathname()).toBe('/games/room/R2')
    expect(lobbyFrames(ws)).toHaveLength(1)
    expect(result.current.notice).toBe('')
  })

  it('a share link the hub refuses lands in the plaza, its world joined', async () => {
    const { result, ws, pathname } = await open({ permalinkRoomId: 'BOGUS0' }, '/games/room/BOGUS0')
    expect(ws.lastSent()).toEqual({ event: 'joinRoom', payload: { roomId: 'BOGUS0' } })
    expect(lobbyFrames(ws)).toHaveLength(0)
    act(() => ws.receive('commandRejected', { reason: 'room unavailable or already in a room' }))
    expect(pathname()).toBe('/games')
    expect(lobbyFrames(ws)).toHaveLength(1)
    expect(result.current.world.isConnected).toBe(true)
    // The hub's reason is for a seat still in a room; this one is not.
    expect(result.current.notice).toBe('Room BOGUS0 is gone')
    expect(result.current.chat.rejection?.reason).toBe('room unavailable or already in a room')
    // Creating a room from here is an ordinary room change.
    act(() => ws.receive('roomState', roomState('R1')))
    expect(lobbyFrames(ws)).toHaveLength(2)
  })

  it('a seat reaped while away rejoins the room its link names, world and all', async () => {
    // In R1, the socket drops, and the seat is gone by the time the
    // redial lands: the new session starts in the plaza.
    const { result, ws, pathname } = await open({ permalinkRoomId: 'R1' }, '/games/room/R1', 'R1')
    act(() => ws.receive('roomState', roomState('R1')))
    expect(lobbyFrames(ws)).toHaveLength(1)
    act(() => ws.close())
    expect(result.current.world.isConnected).toBe(false)
    act(() => result.current.world.reconnect())
    let again!: FakeWebSocket
    await act(async () => {
      again = await admitted('alice')
    })
    expect(again.lastSent()).toEqual({ event: 'joinRoom', payload: { roomId: 'R1' } })
    expect(lobbyFrames(again)).toHaveLength(0)
    act(() => again.receive('roomState', roomState('R1')))
    expect(lobbyFrames(again)).toHaveLength(1)
    expect(result.current.world.isConnected).toBe(true)
    expect(pathname()).toBe('/games/room/R1')
  })

  it('a reload at a table waits for the seat to come back rather than sitting twice', async () => {
    const { result, ws, pathname } = await open({ permalinkRoomId: 'R1', permalinkGameId: 'G1' }, '/games/room/R1/table/G1', 'R1')
    const seated = roomState('R1', [{ gameId: 'G1', game: 'castle', status: 'playing', playerCount: 2 }])
    seated.players[0] = { ...seated.players[0], table: { game: 'castle', gameId: 'G1' } }
    act(() => ws.receive('roomState', seated))
    expect(ws.sentFrames().some(frame => frame.event === 'castle')).toBe(false)
    expect(result.current.notice).toBe('')
    act(() => ws.receive('castle', { update: { gameJoined: { view: { ...waitingView(), phase: 'playing' } } } }))
    expect(result.current.castle.view?.gameId).toBe('G1')
    expect(pathname()).toBe('/games/room/R1/table/G1')
    expect(lobbyFrames(ws)).toHaveLength(1)
  })

  it('chat appears only once the wire delivers it, merged by id, and is the room\'s', async () => {
    const { result, ws } = await open()
    act(() => ws.receive('roomState', roomState('R1')))
    expect(result.current.chat.available).toBe(false)
    const message = { messageId: 3, playerId: 'bob', text: 'hi', sentAtUnixMillis: 1 }
    act(() => ws.receive('roomChatHistory', { messages: [message] }))
    expect(result.current.chat.available).toBe(true)
    expect(result.current.chat.replayUpTo).toBe(3)
    act(() => ws.receive('roomChat', message))
    expect(result.current.chat.messages).toHaveLength(1)
    act(() => result.current.sendChat('hello'))
    expect(ws.lastSent()).toEqual({ event: 'chat', payload: { text: 'hello' } })
    act(() => ws.receive('commandRejected', { reason: 'slow down' }))
    expect(result.current.chat.rejection).toEqual({ seq: 1, reason: 'slow down' })
    act(() => ws.receive('roomState', roomState('R2')))
    expect(result.current.chat).toEqual({ messages: [], available: false, replayUpTo: 0, rejection: null })
    act(() => ws.receive('roomChat', message))
    act(() => ws.receive('roomLeft', { roomId: 'R2' }))
    expect(result.current.chat.messages).toEqual([])
  })

  it('a session ready without a seat drops the table it had', async () => {
    vi.useFakeTimers()
    try {
      const { result } = mount()
      let ws!: FakeWebSocket
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
        ws = FakeWebSocket.instances[0]
        ws.open()
        ws.receive('sessionReady', { playerId: 'alice', resumed: false })
      })
      act(() => ws.receive('roomState', roomState('R1')))
      act(() => ws.receive('golf', { update: { gameJoined: { view: golfView('G7') } } }))
      expect(result.current.golf.view).not.toBeNull()
      act(() => ws.close())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })
      // The next admission finds the grace expired and the seat gone,
      // so no gameJoined follows.
      const next = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
      act(() => {
        next.open()
        next.receive('sessionReady', { playerId: 'alice', resumed: true, roomId: 'R1' })
      })
      expect(result.current.golf.view).toBeNull()
      // A seat that survived comes back as gameJoined and is the table again.
      act(() => next.receive('golf', { update: { gameJoined: { view: golfView('G7') } } }))
      expect(result.current.golf.view?.id).toBe('G7')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a link refused while leaving the resumed room gives up rather than looping', async () => {
    const { result, ws, pathname } = await open({ permalinkRoomId: 'R2' }, '/games/room/R2', 'R1')
    expect(ws.lastSent()).toEqual({ event: 'leaveRoom', payload: {} })
    act(() => ws.receive('commandRejected', { reason: 'room not found' }))
    expect(result.current.notice).toBe('Room R2 is gone')
    act(() => ws.receive('roomLeft', { roomId: 'R1' }))
    expect(ws.sentFrames().filter(frame => frame.event === 'joinRoom')).toEqual([])
    expect(pathname()).toBe('/games')
  })

  it('a notice fades after three seconds, and an empty room code is refused locally', async () => {
    vi.useFakeTimers()
    try {
      const hook = mount()
      let ws!: FakeWebSocket
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
        ws = FakeWebSocket.instances[0]
        ws.open()
        ws.receive('sessionReady', { playerId: 'alice', resumed: false })
      })
      act(() => hook.result.current.setRoomCode('   '))
      act(() => hook.result.current.joinRoom())
      expect(hook.result.current.notice).toBe('Enter a room code')
      expect(ws.sentFrames().some(frame => frame.event === 'joinRoom')).toBe(false)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2999)
      })
      expect(hook.result.current.notice).toBe('Enter a room code')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(hook.result.current.notice).toBe('')
      // Codes are minted upper-case; a friend's reading of one is not.
      act(() => hook.result.current.setRoomCode(' r1 '))
      act(() => hook.result.current.joinRoom())
      expect(ws.lastSent()).toEqual({ event: 'joinRoom', payload: { roomId: 'R1' } })
    } finally {
      vi.useRealTimers()
    }
  })

  it('a refused stream is lost only until the next dial gets in', async () => {
    vi.useFakeTimers()
    try {
      const { result } = mount()
      let ws!: FakeWebSocket
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
        ws = FakeWebSocket.instances[0]
        ws.open()
        ws.receive('sessionReady', { playerId: 'alice', resumed: false })
      })
      act(() => ws.receiveRaw({ exception: 'SeatConflict', payload: { message: 'the player already holds a live seat' } }))
      expect(result.current.lost).toBe('the player already holds a live seat')
      act(() => ws.close())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })
      const next = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
      act(() => {
        next.open()
        next.receive('sessionReady', { playerId: 'alice', resumed: true })
      })
      expect(result.current.lost).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('unmounting closes the socket', async () => {
    const { unmount, ws } = await open()
    unmount()
    expect(ws.readyState).toBe(3)
    await flushAsync()
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('a dropped socket empties the world until the reconnect joins again', async () => {
    const { result, ws, gameState } = await open()
    act(() => ws.receive('lobby', { update: { playerJoined: { player: { playerId: 'bob', position: [1, 0, 1], color: [1, 1, 1], shape: 1 } } } }))
    act(() => ws.close())
    expect(result.current.world.isConnected).toBe(false)
    expect(gameState.players.has('bob')).toBe(false)
  })
})
