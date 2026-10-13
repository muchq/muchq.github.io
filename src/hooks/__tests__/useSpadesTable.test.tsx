import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSpadesTable } from '../useSpadesTable'
import type { SpadesView } from '@/apps/spades/wire'

const view = (over: Partial<SpadesView> = {}): SpadesView => ({
  gameId: 'S1',
  phase: 'bidding',
  players: ['alice', 'bob', 'cat', 'dan'].map((playerId, seat) => ({
    playerId,
    team: seat % 2,
    handCount: 13,
    hand: [],
    tricks: 0
  })),
  dealer: 'alice',
  currentPlayerId: 'bob',
  handNumber: 1,
  trick: [],
  spadesBroken: false,
  legal: [],
  teams: [],
  hands: [],
  ...over
})

describe('useSpadesTable', () => {
  const mount = (playerId = 'alice') => {
    const move = vi.fn()
    const onLeft = vi.fn()
    const showNotice = vi.fn()
    const hook = renderHook(() => useSpadesTable({ playerId, move, showNotice, onLeft }))
    const receive = (update: Parameters<typeof hook.result.current.handleUpdate>[0]) =>
      act(() => hook.result.current.handleUpdate(update))
    return { ...hook, move, onLeft, showNotice, receive }
  }

  it('holds the latest view', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view({ phase: 'waiting' }) } })
    expect(result.current.view?.phase).toBe('waiting')
    receive({ gameState: { view: view() } })
    expect(result.current.view?.phase).toBe('bidding')
  })

  it('speaks the table moves in spades’ vocabulary', () => {
    const { result, move } = mount()
    act(() => result.current.createTable())
    expect(move).toHaveBeenLastCalledWith('createGame')
    act(() => result.current.joinTable('S2'))
    expect(move).toHaveBeenLastCalledWith('joinGame', { gameId: 'S2' })
    expect(result.current.opening).toBe(true)
    act(() => result.current.startTable())
    expect(move).toHaveBeenLastCalledWith('startGame')
    act(() => result.current.bid(0))
    expect(move).toHaveBeenLastCalledWith('bid', { tricks: 0 })
    act(() => result.current.play({ rank: 'A', suit: '♠' }))
    expect(move).toHaveBeenLastCalledWith('play', { card: { rank: 'A', suit: '♠' } })
    act(() => result.current.deal())
    expect(move).toHaveBeenLastCalledWith('deal')
  })

  // Held until the hub answers, so a second tap on a slow link is not a
  // second move: the next view lets it go, and so does a refusal.
  it('holds a move sent until the hub answers it', () => {
    const { result, receive } = mount()
    receive({ gameState: { view: view() } })
    act(() => result.current.bid(3))
    expect(result.current.sending).toBe(true)
    receive({ gameState: { view: view({ currentPlayerId: 'cat' }) } })
    expect(result.current.sending).toBe(false)
    act(() => result.current.play({ rank: 'A', suit: '♠' }))
    act(() => result.current.handleRejected())
    expect(result.current.sending).toBe(false)
    act(() => result.current.joinTable('S2'))
    act(() => result.current.handleRejected())
    expect(result.current.opening).toBe(false)
    act(() => result.current.joinTable('S2'))
    receive({ gameJoined: { view: view({ gameId: 'S2' }) } })
    expect(result.current.opening).toBe(false)
  })

  it('leaving clears the table, and a closed one is left without asking the hub', () => {
    const { result, receive, move, onLeft } = mount()
    receive({ gameState: { view: view() } })
    act(() => result.current.leaveTable())
    expect(move).toHaveBeenCalledWith('leaveGame')
    receive({ gameLeft: { gameId: 'S1' } })
    expect(result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(1)

    receive({ gameState: { view: view({ phase: 'closed', left: 'dan' }) } })
    move.mockClear()
    act(() => result.current.leaveTable())
    expect(move).not.toHaveBeenCalled()
    expect(result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(2)
  })

  it('leaving with no table in view asks nothing of the hub', () => {
    const { result, move, onLeft } = mount()
    act(() => result.current.leaveTable())
    expect(move).not.toHaveBeenCalled()
    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  // A closed table is gone from the hub: another game is a new table.
  it('plays again at a new table', () => {
    const { result, move, receive } = mount()
    receive({ gameState: { view: view({ phase: 'closed', left: 'dan' }) } })
    act(() => result.current.playAgain())
    expect(move).toHaveBeenLastCalledWith('createGame')
    expect(result.current.opening).toBe(true)
  })

  it('tells the room a table opened by someone else', () => {
    const { receive, showNotice } = mount()
    receive({ gameCreated: { gameId: 'S9', createdBy: 'bob' } })
    expect(showNotice).toHaveBeenCalledWith('bob opened spades table S9')
    receive({ gameCreated: { gameId: 'S10', createdBy: 'alice' } })
    expect(showNotice).toHaveBeenCalledTimes(1)
  })
})
