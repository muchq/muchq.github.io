import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useChessTable } from '../useChessTable'
import type { ChessView } from '@/apps/chess/wire'

const view = (over: Partial<ChessView> = {}): ChessView => ({
  gameId: 'GAME01',
  phase: 'playing',
  variant: 'kpk',
  players: [
    { playerId: 'alice', color: 'white' },
    { playerId: 'bob', color: 'black' }
  ],
  fen: '7k/4P3/6K1/8/8/8/8/8 w - - 0 1',
  moves: [],
  sideToMove: 'white',
  currentPlayerId: 'alice',
  inCheck: false,
  legalMoves: ['e7e8q', 'g6f7'],
  clock: { whiteMs: 180_000, blackMs: 180_000, initialMs: 180_000, incrementMs: 2_000 },
  ...over
})

describe('useChessTable', () => {
  const mount = () => {
    const move = vi.fn()
    const onLeft = vi.fn()
    const showNotice = vi.fn()
    const hook = renderHook(() => useChessTable({ playerId: 'alice', move, showNotice, onLeft }))
    const receive = (update: Parameters<typeof hook.result.current.handleUpdate>[0]) =>
      act(() => hook.result.current.handleUpdate(update))
    return { ...hook, move, onLeft, showNotice, receive }
  }

  // The ended view carries the result, and the hub sends it before
  // gameEnded: the view is the table's one source of truth.
  it('holds the latest view, and gameEnded changes nothing the view does not already say', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view({ phase: 'waiting' }) } })
    expect(result.current.view?.phase).toBe('waiting')
    receive({ gameState: { view: view() } })
    expect(result.current.view?.phase).toBe('playing')
    const over = view({ phase: 'ended', result: { ending: 'resignation', winner: 'alice', winnerColor: 'white' } })
    receive({ gameState: { view: over } })
    receive({ gameEnded: { result: { ending: 'resignation', winner: 'alice', winnerColor: 'white' } } })
    expect(result.current.view).toBe(over)
  })

  it('a start names the clock in seconds', () => {
    const { result, move } = mount()
    act(() => result.current.startTable({ initialSeconds: 60, incrementSeconds: 1 }))
    expect(move.mock.calls).toEqual([['startGame', { initialSeconds: 60, incrementSeconds: 1 }]])
  })

  it('a play and a resignation go out as the hub spells them', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.play('e7e8q'))
    act(() => result.current.resign())
    expect(move.mock.calls).toEqual([['play', { uci: 'e7e8q' }], ['resign']])
  })

  // A table outlives its games: leaving one in play or between games asks
  // the hub; only a closed table is gone already.
  it('leaving a table asks the hub; leaving a closed one only clears', () => {
    const { result, receive, move, onLeft } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.leaveTable())
    receive({ gameState: { view: view({ phase: 'ended' }) } })
    act(() => result.current.leaveTable())
    expect(move.mock.calls).toEqual([['leaveGame'], ['leaveGame']])
    expect(result.current.view).not.toBeNull()

    receive({ gameState: { view: view({ phase: 'closed' }) } })
    act(() => result.current.leaveTable())
    expect(move.mock.calls).toHaveLength(2)
    expect(result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  it('gameLeft clears the table and tells the owner', () => {
    const { result, receive, onLeft } = mount()
    receive({ gameJoined: { view: view() } })
    receive({ gameLeft: { gameId: 'GAME01' } })
    expect(result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(1)
  })

  it('play again at an open table is its next game, on the same clock', () => {
    const { result, receive, move } = mount()
    receive({ gameState: { view: view({ phase: 'ended' }) } })
    act(() => result.current.playAgain())
    expect(move.mock.calls).toEqual([['startGame', { initialSeconds: 180, incrementSeconds: 2 }]])
    // Held until the next game's view arrives, so a second tap cannot ask twice.
    expect(result.current.opening).toBe(true)
    receive({ gameState: { view: view() } })
    expect(result.current.opening).toBe(false)
  })

  it('play again from a closed table opens another, and a refusal lets it be asked again', () => {
    const { result, receive, move } = mount()
    receive({ gameState: { view: view({ phase: 'closed' }) } })
    act(() => result.current.playAgain())
    expect(result.current.opening).toBe(true)
    expect(move.mock.calls).toEqual([['createGame']])
    act(() => result.current.handleRejected())
    expect(result.current.opening).toBe(false)
  })

  it('announces another seat’s table, never its own', () => {
    const { receive, showNotice } = mount()
    receive({ gameCreated: { gameId: 'GAME01', createdBy: 'alice' } })
    receive({ gameCreated: { gameId: 'GAME02', createdBy: 'bob' } })
    expect(showNotice.mock.calls).toEqual([['bob opened chess table GAME02']])
  })
})
