import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useGoTable } from '../useGoTable'
import type { GoView } from '@/apps/go/wire'

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

describe('useGoTable', () => {
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
})
