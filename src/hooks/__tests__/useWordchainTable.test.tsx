import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWordchainTable } from '../useWordchainTable'
import type { WordchainView } from '@/apps/wordchains/wire'

const view = (over: Partial<WordchainView> = {}): WordchainView => ({
  gameId: 'W1',
  phase: 'racing',
  start: 'cold',
  target: 'warm',
  par: 5,
  startedAtMs: 0,
  deadlineMs: 180_000,
  runners: [
    { playerId: 'alice', words: 0, left: false, ladder: [], wins: 0 },
    { playerId: 'bob', words: 0, left: false, wins: 0 }
  ],
  racesPlayed: 0,
  ...over
})

describe('useWordchainTable', () => {
  const mount = (playerId = 'alice') => {
    const move = vi.fn()
    const onLeft = vi.fn()
    const showNotice = vi.fn()
    const hook = renderHook(() => useWordchainTable({ playerId, move, showNotice, onLeft }))
    const receive = (update: Parameters<typeof hook.result.current.handleUpdate>[0]) => act(() => hook.result.current.handleUpdate(update))
    return { ...hook, move, onLeft, showNotice, receive }
  }

  it('holds the latest view', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view({ phase: 'waiting' }) } })
    expect(result.current.view?.phase).toBe('waiting')
    receive({ gameState: { view: view() } })
    expect(result.current.view?.phase).toBe('racing')
  })

  it('speaks the table moves in wordchain’s vocabulary', () => {
    const { result, move } = mount()
    act(() => result.current.createTable())
    expect(move).toHaveBeenLastCalledWith('createGame')
    act(() => result.current.joinTable('W2'))
    expect(move).toHaveBeenLastCalledWith('joinGame', { gameId: 'W2' })
    expect(result.current.opening).toBe(true)
    act(() => result.current.startTable(5))
    expect(move).toHaveBeenLastCalledWith('startGame', { letters: 5 })
    act(() => result.current.play('cord'))
    expect(move).toHaveBeenLastCalledWith('play', { word: 'cord' })
    act(() => result.current.retract())
    expect(move).toHaveBeenLastCalledWith('retract')
  })

  it('holds a word until the next view, or its refusal, answers it', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.play('cord'))
    expect(result.current.sending).toBe(true)
    act(() => result.current.handleRejected())
    expect(result.current.sending).toBe(false)
    act(() => result.current.play('cord'))
    receive({ gameState: { view: view() } })
    expect(result.current.sending).toBe(false)
  })

  it('tells of another seat’s table, never its own', () => {
    const { receive, showNotice } = mount()
    receive({ gameCreated: { gameId: 'W1', createdBy: 'alice' } })
    expect(showNotice).not.toHaveBeenCalled()
    receive({ gameCreated: { gameId: 'W2', createdBy: 'bob' } })
    expect(showNotice).toHaveBeenCalledWith('bob opened word chains table W2')
  })

  it('leaves through the hub while the table is open, and on its own once closed', () => {
    const { result, receive, move, onLeft } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.leaveTable())
    expect(move).toHaveBeenLastCalledWith('leaveGame')
    receive({ gameLeft: { gameId: 'W1' } })
    expect(result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(1)

    receive({ gameJoined: { view: view({ phase: 'closed' }) } })
    move.mockClear()
    act(() => result.current.leaveTable())
    expect(move).not.toHaveBeenCalled()
    expect(result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(2)
  })
})
