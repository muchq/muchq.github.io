import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useGoTable } from '../useGoTable'
import type { GoRoundRobin, GoView } from '@/apps/go/wire'

const view = (over: Partial<GoView> = {}): GoView => ({
  gameId: 'G01',
  phase: 'playing',
  players: [
    { playerId: 'alice', color: 'black' },
    { playerId: 'bob', color: 'white' }
  ],
  size: 9,
  board: Array.from({ length: 9 }, () => '.........'),
  captures: { black: 0, white: 0 },
  sideToMove: 'black',
  currentPlayerId: 'alice',
  clock: { blackMs: 300_000, whiteMs: 300_000, initialMs: 300_000, incrementMs: 5_000 },
  komi: 6.5,
  moveCount: 0,
  scoreSheet: [],
  ...over
})

const setup = () => {
  const move = vi.fn()
  const showNotice = vi.fn()
  const onLeft = vi.fn()
  const hook = renderHook(() => useGoTable({ playerId: 'alice', move, showNotice, onLeft }))
  return { hook, move, showNotice, onLeft }
}

const roundRobin = (over: Partial<GoRoundRobin> = {}): GoRoundRobin => ({
  roundRobinId: 'E1',
  creator: 'alice',
  entrants: ['alice', 'bob', 'carol'],
  terms: { size: 9, komi: 6.5, initialSeconds: 600, incrementSeconds: 5 },
  pairings: [],
  withdrawn: [],
  standings: [],
  ...over
})

describe('useGoTable', () => {
  // Unknown until asked for, then kept current by each one heard.
  it('asks for the round robins once one is heard, and keeps them current', () => {
    const { hook, move } = setup()
    expect(hook.result.current.roundRobins).toBeNull()
    act(() => hook.result.current.handleUpdate({ roundRobin: roundRobin() }))
    expect(move).toHaveBeenLastCalledWith('roundRobins')
    act(() => hook.result.current.handleUpdate({ roundRobins: { roundRobins: [roundRobin()] } }))
    expect(hook.result.current.roundRobins).toHaveLength(1)
    act(() => hook.result.current.handleUpdate({ roundRobin: roundRobin({ roundRobinId: 'E2' }) }))
    act(() => hook.result.current.handleUpdate({ roundRobin: roundRobin({ withdrawn: ['carol'] }) }))
    expect(hook.result.current.roundRobins?.map(held => held.roundRobinId)).toEqual(['E1', 'E2'])
    expect(hook.result.current.roundRobins?.[0].withdrawn).toEqual(['carol'])
  })

  it('creates, plays and moderates round robins', () => {
    const { hook, move } = setup()
    act(() => hook.result.current.createRoundRobin(['alice', 'bob', 'carol'], { size: 13, initialSeconds: 300, incrementSeconds: 3 }))
    expect(move).toHaveBeenLastCalledWith('createRoundRobin', {
      entrants: ['alice', 'bob', 'carol'],
      terms: { size: 13, initialSeconds: 300, incrementSeconds: 3 }
    })
    act(() => hook.result.current.playRoundRobin('E1', 'bob'))
    expect(move).toHaveBeenLastCalledWith('playRoundRobin', { roundRobinId: 'E1', opponent: 'bob' })
    expect(hook.result.current.opening).toBe(true)
    act(() => hook.result.current.forfeit('E1', 'bob', 'carol'))
    expect(move).toHaveBeenLastCalledWith('forfeit', { roundRobinId: 'E1', winner: 'bob', loser: 'carol' })
    act(() => hook.result.current.withdraw('E1', 'carol'))
    expect(move).toHaveBeenLastCalledWith('withdraw', { roundRobinId: 'E1', playerId: 'carol' })
  })

  it('holds the view a gameJoined or gameState brings', () => {
    const { hook } = setup()
    act(() => hook.result.current.handleUpdate({ gameJoined: { view: view() } }))
    expect(hook.result.current.view?.gameId).toBe('G01')
    act(() => hook.result.current.handleUpdate({ gameState: { view: view({ currentPlayerId: 'bob' }) } }))
    expect(hook.result.current.view?.currentPlayerId).toBe('bob')
  })

  it('a play is sent as its point and held until the next view', () => {
    const { hook, move } = setup()
    act(() => hook.result.current.handleUpdate({ gameJoined: { view: view() } }))
    act(() => hook.result.current.play(2, 3))
    expect(move).toHaveBeenCalledWith('play', { x: 2, y: 3 })
    expect(hook.result.current.sent).toBe(true)
    act(() => hook.result.current.handleUpdate({ gameState: { view: view() } }))
    expect(hook.result.current.sent).toBe(false)
  })

  it('a mark and an acceptance are sent and held until the next view', () => {
    const { hook, move } = setup()
    act(() => hook.result.current.markDead(4, 5))
    expect(move).toHaveBeenCalledWith('markDead', { x: 4, y: 5 })
    expect(hook.result.current.sent).toBe(true)
    act(() => hook.result.current.handleUpdate({ gameState: { view: view({ phase: 'scoring' }) } }))
    expect(hook.result.current.sent).toBe(false)
    act(() => hook.result.current.accept())
    expect(move).toHaveBeenCalledWith('accept')
    expect(hook.result.current.sent).toBe(true)
  })

  it('a refusal lets a pass go', () => {
    const { hook, move } = setup()
    act(() => hook.result.current.pass())
    expect(move).toHaveBeenCalledWith('pass')
    act(() => hook.result.current.handleRejected())
    expect(hook.result.current.sent).toBe(false)
  })

  it('the next game keeps the clock and komi, on the size picked', () => {
    const { hook, move } = setup()
    act(() => hook.result.current.handleUpdate({ gameState: { view: view({ phase: 'ended' }) } }))
    act(() => hook.result.current.playAgain(13))
    expect(move).toHaveBeenCalledWith('startGame', { size: 13, komi: 6.5, initialSeconds: 300, incrementSeconds: 5 })
    expect(hook.result.current.opening).toBe(true)
  })

  it('a closed table opens a new one', () => {
    const { hook, move } = setup()
    act(() => hook.result.current.handleUpdate({ gameState: { view: view({ phase: 'closed' }) } }))
    act(() => hook.result.current.playAgain())
    expect(move).toHaveBeenCalledWith('createGame')
  })

  it('gameLeft clears the table and tells the owner', () => {
    const { hook, onLeft } = setup()
    act(() => hook.result.current.handleUpdate({ gameJoined: { view: view() } }))
    act(() => hook.result.current.handleUpdate({ gameLeft: { gameId: 'G01' } }))
    expect(hook.result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  // A game left is the table's end, not the room's: its round robins stay.
  it('keeps the round robins on leaving a table, and forgets them on clear', () => {
    const { hook } = setup()
    act(() => hook.result.current.handleUpdate({ roundRobins: { roundRobins: [roundRobin()] } }))
    act(() => hook.result.current.handleUpdate({ gameJoined: { view: view() } }))
    act(() => hook.result.current.handleUpdate({ gameLeft: { gameId: 'G01' } }))
    expect(hook.result.current.roundRobins).toHaveLength(1)
    act(() => hook.result.current.clear())
    expect(hook.result.current.roundRobins).toBeNull()
  })

  it('announces another player’s table, not one’s own', () => {
    const { hook, showNotice } = setup()
    act(() => hook.result.current.handleUpdate({ gameCreated: { gameId: 'G02', createdBy: 'alice' } }))
    expect(showNotice).not.toHaveBeenCalled()
    act(() => hook.result.current.handleUpdate({ gameCreated: { gameId: 'G03', createdBy: 'bob' } }))
    expect(showNotice).toHaveBeenCalledWith('bob opened go table G03')
  })

  it('leaving a closed table clears it without asking the hub', () => {
    const { hook, move, onLeft } = setup()
    act(() => hook.result.current.handleUpdate({ gameState: { view: view({ phase: 'closed' }) } }))
    act(() => hook.result.current.leaveTable())
    expect(move).not.toHaveBeenCalled()
    expect(hook.result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  it('posts a challenge’s terms for whoever joins to start on', () => {
    const { hook, move } = setup()
    act(() => hook.result.current.postChallenge({ size: 13, initialSeconds: 300, incrementSeconds: 3 }))
    expect(move).toHaveBeenCalledWith('challenge', { size: 13, initialSeconds: 300, incrementSeconds: 3 })
  })

  it('watches a table by its id', () => {
    const { hook, move } = setup()
    act(() => hook.result.current.watchTable('G07'))
    expect(move).toHaveBeenCalledWith('watch', { gameId: 'G07' })
  })

  it('leaving a table in play asks the hub', () => {
    const { hook, move, onLeft } = setup()
    act(() => hook.result.current.handleUpdate({ gameJoined: { view: view() } }))
    act(() => hook.result.current.leaveTable())
    expect(move).toHaveBeenCalledWith('leaveGame')
    expect(hook.result.current.view).not.toBeNull()
    expect(onLeft).not.toHaveBeenCalled()
  })

  // A bot seated is held as a seat taken: the next view, or a refusal,
  // lets it go.
  it('adds a bot at its level, held until the hub answers', () => {
    const { hook, move } = setup()
    act(() => hook.result.current.addBot(4))
    expect(move).toHaveBeenCalledWith('addBot', { level: 4 })
    expect(hook.result.current.seating).toBe(true)
    act(() => hook.result.current.handleUpdate({ gameState: { view: view({ phase: 'waiting' }) } }))
    expect(hook.result.current.seating).toBe(false)
    act(() => hook.result.current.addBot(4))
    act(() => hook.result.current.handleRejected())
    expect(hook.result.current.seating).toBe(false)
  })
})
