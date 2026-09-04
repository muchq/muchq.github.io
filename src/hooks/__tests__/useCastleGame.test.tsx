import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CASTLE_RESUME_TOKEN_KEY, useCastleGame } from '../useCastleGame'
import type { UseCastleGameProps } from '../useCastleGame'
import { FakeWebSocket, admitted, flushAsync, installFakeHub } from '@/test/fakeHub'
import type { CastleView } from '@/apps/castle/wire'

// The hook against a scripted hub: what it sends for each action, what
// it holds after each frame, and where it steers the URL.

const setupView = (over: Partial<CastleView> = {}): CastleView => ({
  gameId: 'G1',
  phase: 'setup',
  players: [
    {
      playerId: 'alice',
      ready: false,
      handCount: 3,
      hand: [
        { rank: 'K', suit: '♦' },
        { rank: 'K', suit: '♣' },
        { rank: 'Q', suit: '♠' }
      ],
      faceUp: [{ rank: 'A', suit: '♣' }],
      faceDownCount: 3,
      out: false,
      canPlay: false
    },
    { playerId: 'bob', ready: false, handCount: 3, hand: [], faceUp: [{ rank: 'J', suit: '♠' }], faceDownCount: 3, out: false, canPlay: false }
  ],
  drawPileCount: 34,
  pileCount: 0,
  pileRun: 0,
  finished: [],
  ...over
})

describe('useCastleGame', () => {
  beforeEach(() => {
    installFakeHub()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const mount = (props: UseCastleGameProps = {}, path = '/castle') => {
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
    const hook = renderHook(() => useCastleGame(props), { wrapper })
    return { ...hook, pathname: () => location.pathname }
  }

  const open = async (props: UseCastleGameProps = {}, path = '/castle', roomId?: string) => {
    const hook = mount(props, path)
    let ws!: FakeWebSocket
    await act(async () => {
      ws = await admitted('alice', roomId)
    })
    return { ...hook, ws }
  }

  it('dials with its own resume token and reports the identity', async () => {
    localStorage.setItem(CASTLE_RESUME_TOKEN_KEY, 'rt-castle')
    const onPlayerIdChange = vi.fn()
    const onConnectionChange = vi.fn()
    const { result, ws } = await open({ onPlayerIdChange, onConnectionChange })
    expect(ws.protocol).toBe('smithy.eventstream.v1+json')
    expect(result.current.playerId).toBe('alice')
    expect(result.current.connected).toBe(true)
    expect(onPlayerIdChange).toHaveBeenCalledWith('alice')
    expect(onConnectionChange).toHaveBeenCalledWith(true)
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse((init as { body: string }).body)).toEqual({ resumeToken: 'rt-castle' })
  })

  it('a room lands the URL on its share link, and leaving returns', async () => {
    const { result, ws, pathname } = await open()
    act(() => result.current.createRoom())
    expect(ws.lastSent()).toEqual({ event: 'createRoom', payload: {} })
    act(() => ws.receive('roomState', { roomId: 'ROOM01', players: [], games: [] }))
    expect(result.current.room?.roomId).toBe('ROOM01')
    expect(pathname()).toBe('/castle/room/ROOM01')
    act(() => result.current.leaveRoom())
    expect(ws.lastSent()).toEqual({ event: 'leaveRoom', payload: {} })
    act(() => ws.receive('roomLeft', { roomId: 'ROOM01' }))
    expect(result.current.room).toBeNull()
    expect(pathname()).toBe('/castle')
  })

  it('joins a share link once the session is ready', async () => {
    const { ws } = await open({ permalinkRoomId: 'ROOM77' }, '/castle/room/ROOM77')
    expect(ws.lastSent()).toEqual({ event: 'joinRoom', payload: { roomId: 'ROOM77' } })
  })

  it('a session resumed into another room leaves it, then joins the link', async () => {
    const { ws } = await open({ permalinkRoomId: 'ROOM77' }, '/castle/room/ROOM77', 'OLD01')
    expect(ws.lastSent()).toEqual({ event: 'leaveRoom', payload: {} })
    act(() => ws.receive('roomLeft', { roomId: 'OLD01' }))
    expect(ws.lastSent()).toEqual({ event: 'joinRoom', payload: { roomId: 'ROOM77' } })
  })

  it('a session resumed into the linked room joins nothing', async () => {
    const { ws } = await open({ permalinkRoomId: 'ROOM77' }, '/castle/room/ROOM77', 'ROOM77')
    expect(ws.sent).toEqual([])
  })

  it('a refused link join gives up rather than looping', async () => {
    const { ws, result } = await open({ permalinkRoomId: 'ROOM77' }, '/castle/room/ROOM77', 'OLD01')
    act(() => ws.receive('commandRejected', { reason: 'no such room' }))
    expect(result.current.notice).toBe('no such room')
    act(() => ws.receive('roomLeft', { roomId: 'OLD01' }))
    expect(ws.sentFrames().map(f => f.event)).toEqual(['leaveRoom'])
  })

  it('a joined table is the view, and a move is the row in play', async () => {
    const { result, ws } = await open()
    act(() => ws.receive('castle', { update: { gameJoined: { view: setupView() } } }))
    expect(result.current.view?.gameId).toBe('G1')

    act(() => result.current.swapForSetup(0, 0))
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { swapForSetup: { handIndex: 0, faceUpIndex: 0 } } } })
    act(() => result.current.ready())
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { ready: {} } } })

    // Both kings, then the play goes out from the hand.
    act(() => ws.receive('castle', { update: { gameState: { view: setupView({ phase: 'playing', currentPlayerId: 'alice' }) } } }))
    act(() => result.current.toggleCard(0))
    act(() => result.current.toggleCard(1))
    expect(result.current.selected).toEqual([0, 1])
    act(() => result.current.playSelected())
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { playFromHand: { indexes: [0, 1] } } } })
    expect(result.current.selected).toEqual([])

    // Hand gone: the same selection plays from the face-up row.
    const faceUpOnly = setupView({ phase: 'playing', currentPlayerId: 'alice' })
    faceUpOnly.players[0] = { ...faceUpOnly.players[0], hand: [], handCount: 0 }
    act(() => ws.receive('castle', { update: { gameState: { view: faceUpOnly } } }))
    act(() => result.current.toggleCard(0))
    act(() => result.current.playSelected())
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { playFaceUp: { indexes: [0] } } } })

    act(() => result.current.playFaceDown(2))
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { playFaceDown: { index: 2 } } } })
    act(() => result.current.pickUp())
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { pickUp: {} } } })
  })

  it('a new view drops a stale selection', async () => {
    const { result, ws } = await open()
    act(() => ws.receive('castle', { update: { gameJoined: { view: setupView({ phase: 'playing', currentPlayerId: 'alice' }) } } }))
    act(() => result.current.toggleCard(2))
    expect(result.current.selected).toEqual([2])
    act(() => ws.receive('castle', { update: { gameState: { view: setupView({ phase: 'playing', currentPlayerId: 'bob' }) } } }))
    expect(result.current.selected).toEqual([])
  })

  it('the ending rides with the final view until the viewer goes back', async () => {
    const { result, ws } = await open()
    act(() => ws.receive('castle', { update: { gameJoined: { view: setupView({ phase: 'ended', finished: ['bob'] }) } } }))
    act(() => ws.receive('castle', { update: { gameEnded: { finished: ['bob'], loser: 'alice' } } }))
    expect(result.current.ended).toEqual({ finished: ['bob'], loser: 'alice' })
    const before = ws.sent.length
    act(() => result.current.leaveTable())
    // An ended table is gone from the hub already: nothing to leave.
    expect(ws.sent).toHaveLength(before)
    expect(result.current.view).toBeNull()
    expect(result.current.ended).toBeNull()
  })

  it('leaving a live table asks the hub, and the ack clears the view', async () => {
    const { result, ws } = await open()
    act(() => ws.receive('castle', { update: { gameJoined: { view: setupView() } } }))
    act(() => result.current.leaveTable())
    expect(ws.lastSent()).toEqual({ event: 'castle', payload: { move: { leaveGame: {} } } })
    expect(result.current.view).not.toBeNull()
    act(() => ws.receive('castle', { update: { gameLeft: { gameId: 'G1' } } }))
    expect(result.current.view).toBeNull()
  })

  it('announces turns, tables and refusals as notices', async () => {
    const { result, ws } = await open()
    act(() => ws.receive('castle', { update: { turnChanged: { playerId: 'alice' } } }))
    expect(result.current.notice).toBe('Your turn')
    act(() => ws.receive('castle', { update: { turnChanged: { playerId: 'bob' } } }))
    expect(result.current.notice).toBe('bob to play')
    act(() => ws.receive('castle', { update: { gameCreated: { gameId: 'G2', createdBy: 'bob' } } }))
    expect(result.current.notice).toBe('bob opened table G2')
    act(() => ws.receive('castle', { update: { gameCreated: { gameId: 'G3', createdBy: 'alice' } } }))
    expect(result.current.notice).toBe('bob opened table G2')
    act(() => ws.receive('commandRejected', { reason: 'still setting up' }))
    expect(result.current.notice).toBe('still setting up')
  })

  it('golf traffic in the room is not castle state', async () => {
    const { result, ws } = await open()
    act(() => ws.receive('golf', { update: { gameJoined: { view: { gameId: 'GOLF1' } } } }))
    expect(result.current.view).toBeNull()
  })

  it('chat appears only once the wire delivers it, merged by id', async () => {
    const { result, ws } = await open()
    act(() => ws.receive('roomState', { roomId: 'ROOM01', players: [], games: [] }))
    expect(result.current.chat.available).toBe(false)
    const message = { messageId: 3, playerId: 'bob', text: 'hi', sentAtUnixMillis: 1 }
    act(() => ws.receive('roomChatHistory', { messages: [message] }))
    expect(result.current.chat.available).toBe(true)
    expect(result.current.chat.replayUpTo).toBe(3)
    act(() => ws.receive('roomChat', message))
    expect(result.current.chat.messages).toHaveLength(1)
    act(() => result.current.sendChat('hello'))
    expect(ws.lastSent()).toEqual({ event: 'chat', payload: { text: 'hello' } })
    // Another room: the chat is that room's.
    act(() => ws.receive('roomState', { roomId: 'ROOM02', players: [], games: [] }))
    expect(result.current.chat.messages).toEqual([])
    expect(result.current.chat.available).toBe(false)
  })

  // The socket drops and the next dial is admitted, under fake timers
  // so the two-second reconnect costs nothing.
  const redial = async (ws: FakeWebSocket, roomId?: string): Promise<FakeWebSocket> => {
    act(() => ws.close())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    const next = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
    act(() => {
      next.open()
      next.receive('sessionReady', roomId === undefined ? { playerId: 'alice', resumed: true } : { playerId: 'alice', resumed: true, roomId })
    })
    return next
  }

  const openUnderFakeTimers = async () => {
    vi.useFakeTimers()
    const hook = mount()
    let ws!: FakeWebSocket
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
      ws = FakeWebSocket.instances[0]
      ws.open()
      ws.receive('sessionReady', { playerId: 'alice', resumed: false })
    })
    return { ...hook, ws }
  }

  it('a session ready without a seat drops the table it had', async () => {
    try {
      const { result, ws } = await openUnderFakeTimers()
      act(() => ws.receive('castle', { update: { gameJoined: { view: setupView() } } }))
      expect(result.current.view).not.toBeNull()
      // The next admission finds the grace expired and the seat gone,
      // so no gameJoined follows.
      const next = await redial(ws, 'ROOM01')
      expect(result.current.view).toBeNull()
      expect(result.current.ended).toBeNull()
      // A seat that survived comes back as gameJoined and is the table again.
      act(() => next.receive('castle', { update: { gameJoined: { view: setupView() } } }))
      expect(result.current.view?.gameId).toBe('G1')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a refused stream is lost only until the next dial gets in', async () => {
    try {
      const { result, ws } = await openUnderFakeTimers()
      act(() => ws.receiveRaw({ exception: 'SeatConflict', payload: { message: 'the player already holds a live seat' } }))
      expect(result.current.lost).toBe('the player already holds a live seat')
      await redial(ws)
      expect(result.current.lost).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a notice fades after three seconds', async () => {
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
      act(() => ws.receive('commandRejected', { reason: 'still setting up' }))
      expect(hook.result.current.notice).toBe('still setting up')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2999)
      })
      expect(hook.result.current.notice).toBe('still setting up')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(hook.result.current.notice).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('an empty room code is refused locally', async () => {
    const { result, ws } = await open()
    act(() => result.current.setRoomCode('   '))
    act(() => result.current.joinRoom())
    expect(result.current.notice).toBe('Enter a room code')
    expect(ws.sent).toEqual([])
    act(() => result.current.setRoomCode(' ROOM01 '))
    act(() => result.current.joinRoom())
    expect(ws.lastSent()).toEqual({ event: 'joinRoom', payload: { roomId: 'ROOM01' } })
  })

  it('unmounting closes the socket', async () => {
    const { unmount, ws } = await open()
    unmount()
    expect(ws.readyState).toBe(3)
    await flushAsync()
    expect(FakeWebSocket.instances).toHaveLength(1)
  })
})
