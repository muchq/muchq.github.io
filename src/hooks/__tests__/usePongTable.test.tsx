import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIM_EVERY_MS, usePongTable } from '../usePongTable'
import type { PongFrame, PongRoundRobin, PongView } from '@/apps/pong/wire'

const view = (over: Partial<PongView> = {}): PongView => ({
  gameId: 'GAME01',
  phase: 'playing',
  variant: 'smallcat',
  court: {
    width: 0,
    height: 400,
    depth: 600,
    paddleWidth: 0,
    paddleHeight: 80,
    ballRadius: 10,
    inset: 7,
    playerSpeed: 8,
    ticksPerSecond: 60
  },
  players: [
    { playerId: 'alice', lives: 3 },
    { playerId: 'bob', lives: 3 }
  ],
  scoreSheet: [],
  ...over
})

const frame = (tick: number, over: Partial<PongFrame> = {}): PongFrame => ({
  gameId: 'GAME01',
  tick,
  ball: { x: 0, y: 200, z: 300 },
  velocity: { x: 0, y: 2, z: 2 },
  paddles: [
    { x: 0, y: 200 },
    { x: 0, y: 200 }
  ],
  serveIn: 0,
  ...over
})

const roundRobin = (over: Partial<PongRoundRobin> = {}): PongRoundRobin => ({
  roundRobinId: 'E1',
  creator: 'alice',
  entrants: ['alice', 'bob', 'carol'],
  variant: '3d',
  pairings: [],
  withdrawn: [],
  standings: [],
  ...over
})

describe('usePongTable', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const mount = (playerId = 'alice') => {
    const move = vi.fn()
    const onLeft = vi.fn()
    const showNotice = vi.fn()
    const hook = renderHook(() => usePongTable({ playerId, move, showNotice, onLeft }))
    const receive = (update: Parameters<typeof hook.result.current.handleUpdate>[0]) =>
      act(() => hook.result.current.handleUpdate(update))
    return { ...hook, move, onLeft, showNotice, receive }
  }

  it('holds the latest view', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view({ phase: 'waiting' }) } })
    expect(result.current.view?.phase).toBe('waiting')
    receive({ gameState: { view: view() } })
    expect(result.current.view?.phase).toBe('playing')
  })

  // Frames arrive thirty times a second and may be dropped; one older than
  // the newest held is stale, and one for another table is not this one's.
  it('keeps the newest frame of the table it is at', () => {
    const { result, receive } = mount()
    receive({ gameState: { view: view() } })
    receive({ frame: frame(10) })
    expect(result.current.latestFrame()?.frame.tick).toBe(10)
    receive({ frame: frame(8) })
    expect(result.current.latestFrame()?.frame.tick).toBe(10)
    receive({ frame: frame(12, { gameId: 'OTHER' }) })
    expect(result.current.latestFrame()?.frame.tick).toBe(10)
    receive({ frame: frame(12) })
    expect(result.current.latestFrame()?.frame.tick).toBe(12)
  })

  // A game's end leaves no rally to draw; the next game's frames start
  // fresh, whatever their ticks.
  it('drops the frame once the table is out of play', () => {
    const { result, receive } = mount()
    receive({ gameState: { view: view() } })
    receive({ frame: frame(10) })
    receive({ gameState: { view: view({ phase: 'ended', result: { winner: 'alice', ending: 'points' } }) } })
    expect(result.current.latestFrame()).toBeNull()
  })

  // A frame that lands after the game's end is that game's: kept, it would
  // hold back the next game's frames, whose ticks start lower.
  it('takes no frame while the table is out of play', () => {
    const { result, receive } = mount()
    receive({ gameState: { view: view({ phase: 'ended' }) } })
    receive({ frame: frame(900) })
    expect(result.current.latestFrame()).toBeNull()
    receive({ gameState: { view: view() } })
    receive({ frame: frame(5) })
    expect(result.current.latestFrame()?.frame.tick).toBe(5)
  })

  // A pointer still moving as the game ends or the seat leaves sends nothing after.
  it('drops a folded aim once the table is out of play, or left', () => {
    const { result, receive, move } = mount()
    receive({ gameState: { view: view() } })
    act(() => result.current.aim(1, 2))
    act(() => result.current.aim(3, 4))
    receive({ gameState: { view: view({ phase: 'ended' }) } })
    act(() => vi.advanceTimersByTime(AIM_EVERY_MS))
    expect(move.mock.calls.filter(([name]) => name === 'paddle')).toHaveLength(1)

    receive({ gameState: { view: view() } })
    act(() => vi.advanceTimersByTime(AIM_EVERY_MS))
    act(() => result.current.aim(5, 6))
    act(() => result.current.aim(7, 8))
    receive({ gameLeft: { gameId: 'GAME01' } })
    act(() => vi.advanceTimersByTime(AIM_EVERY_MS))
    expect(move.mock.calls.filter(([name]) => name === 'paddle')).toHaveLength(2)
  })

  it('leaving clears the table, and a closed one is left without asking the hub', () => {
    const { result, receive, move, onLeft } = mount()
    receive({ gameState: { view: view() } })
    act(() => result.current.leaveTable())
    expect(move).toHaveBeenCalledWith('leaveGame')
    receive({ gameLeft: { gameId: 'GAME01' } })
    expect(result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(1)

    receive({ gameState: { view: view({ phase: 'closed' }) } })
    move.mockClear()
    act(() => result.current.leaveTable())
    expect(move).not.toHaveBeenCalled()
    expect(result.current.view).toBeNull()
  })

  it('speaks the table moves in pong’s vocabulary', () => {
    const { result, move } = mount()
    act(() => result.current.createTable())
    expect(move).toHaveBeenLastCalledWith('createGame')
    act(() => result.current.joinTable('GAME02'))
    expect(move).toHaveBeenLastCalledWith('joinGame', { gameId: 'GAME02' })
    expect(result.current.opening).toBe(true)
    act(() => result.current.watchTable('GAME03'))
    expect(move).toHaveBeenLastCalledWith('watch', { gameId: 'GAME03' })
    act(() => result.current.startTable('3d'))
    expect(move).toHaveBeenLastCalledWith('startGame', { variant: '3d' })
    act(() => result.current.addBot(3))
    expect(move).toHaveBeenLastCalledWith('addBot', { level: 3 })
    expect(result.current.seating).toBe(true)
    act(() => result.current.handleRejected())
    expect(result.current.seating).toBe(false)
    expect(result.current.opening).toBe(false)
  })

  // Another game: the table's next while it is open, a new table once closed.
  it('plays again at the table, or at a new one once it has closed', () => {
    const { result, receive, move } = mount()
    receive({ gameState: { view: view({ phase: 'ended' }) } })
    act(() => result.current.playAgain('3d'))
    expect(move).toHaveBeenLastCalledWith('startGame', { variant: '3d' })
    receive({ gameState: { view: view({ phase: 'closed' }) } })
    act(() => result.current.playAgain('smallcat'))
    expect(move).toHaveBeenLastCalledWith('createGame')
  })

  // The pointer moves far more often than the hub's paddle budget allows:
  // the first aim goes at once, and those within AIM_EVERY_MS after it
  // fold into one, the newest, at the end of the wait.
  it('sends the pointer at most once per AIM_EVERY_MS, the newest last', () => {
    const { result, move } = mount()
    act(() => result.current.aim(10, 20))
    expect(move).toHaveBeenCalledTimes(1)
    expect(move).toHaveBeenLastCalledWith('paddle', { x: 10, y: 20 })
    act(() => result.current.aim(11, 21))
    act(() => result.current.aim(12, 22))
    expect(move).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(AIM_EVERY_MS))
    expect(move).toHaveBeenCalledTimes(2)
    expect(move).toHaveBeenLastCalledWith('paddle', { x: 12, y: 22 })
    act(() => vi.advanceTimersByTime(AIM_EVERY_MS * 3))
    expect(move).toHaveBeenCalledTimes(2)
  })

  // A key's press and release are moves of their own, not pointer noise:
  // each goes at once, and drops whatever the pointer had folded, so a
  // release is never followed on the wire by an older aim.
  it('sends a key’s aim at once, over anything the pointer folded', () => {
    const { result, move } = mount()
    act(() => result.current.aim(10, 20))
    act(() => result.current.aim(11, 21))
    act(() => result.current.aimNow(0, 0))
    expect(move).toHaveBeenLastCalledWith('paddle', { x: 0, y: 0 })
    act(() => result.current.aimNow(0, 96))
    expect(move).toHaveBeenLastCalledWith('paddle', { x: 0, y: 96 })
    act(() => vi.advanceTimersByTime(AIM_EVERY_MS * 3))
    expect(move.mock.calls.map(([, payload]) => payload)).toEqual([
      { x: 10, y: 20 },
      { x: 0, y: 0 },
      { x: 0, y: 96 }
    ])
  })

  // Unknown until asked for, then kept current by each one heard.
  it('asks for the round robins once one is heard, and keeps them current', () => {
    const { result, receive, move } = mount()
    expect(result.current.roundRobins).toBeNull()
    receive({ roundRobin: roundRobin() })
    expect(move).toHaveBeenLastCalledWith('roundRobins')
    receive({ roundRobins: { roundRobins: [roundRobin()] } })
    expect(result.current.roundRobins).toHaveLength(1)
    receive({ roundRobin: roundRobin({ roundRobinId: 'E2' }) })
    receive({ roundRobin: roundRobin({ withdrawn: ['carol'] }) })
    expect(result.current.roundRobins?.map(held => held.roundRobinId)).toEqual(['E1', 'E2'])
    expect(result.current.roundRobins?.[0].withdrawn).toEqual(['carol'])
  })

  it('creates, plays and moderates round robins', () => {
    const { result, move } = mount()
    act(() => result.current.createRoundRobin(['alice', 'bob', 'carol'], '3d'))
    expect(move).toHaveBeenLastCalledWith('createRoundRobin', { entrants: ['alice', 'bob', 'carol'], variant: '3d' })
    act(() => result.current.playRoundRobin('E1', 'bob'))
    expect(move).toHaveBeenLastCalledWith('playRoundRobin', { roundRobinId: 'E1', opponent: 'bob' })
    act(() => result.current.forfeit('E1', 'bob', 'carol'))
    expect(move).toHaveBeenLastCalledWith('forfeit', { roundRobinId: 'E1', winner: 'bob', loser: 'carol' })
    act(() => result.current.withdraw('E1', 'carol'))
    expect(move).toHaveBeenLastCalledWith('withdraw', { roundRobinId: 'E1', playerId: 'carol' })
  })

  it('tells the room a table opened by someone else', () => {
    const { receive, showNotice } = mount()
    receive({ gameCreated: { gameId: 'GAME09', createdBy: 'bob' } })
    expect(showNotice).toHaveBeenCalledWith('bob opened pong table GAME09')
    receive({ gameCreated: { gameId: 'GAME10', createdBy: 'alice' } })
    expect(showNotice).toHaveBeenCalledTimes(1)
  })
})
