import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useChessTable } from '../useChessTable'
import type { ChessGameSummary, ChessReview, ChessRoundRobin, ChessView } from '@/apps/chess/wire'

const view = (over: Partial<ChessView> = {}): ChessView => ({
  gameId: 'GAME01',
  availableSetups: [
    { setupId: 'random-kpk', name: 'Random K+P vs K' },
    { setupId: 'lucena', name: 'R+P vs R — Lucena' }
  ],
  defaultSetupId: 'random-kpk',
  phase: 'playing',
  variant: 'kpk',
  setupId: 'random-kpk',
  setupName: 'Random K+P vs K',
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

const summary = (over: Partial<ChessGameSummary> = {}): ChessGameSummary => ({
  archiveId: 7,
  gameId: 'GAME01',
  ordinal: 1,
  white: 'alice',
  black: 'bob',
  result: { ending: 'checkmate', winner: 'alice', winnerColor: 'white' },
  setupId: 'random-kpk',
  setupName: 'Random K+P vs K',
  plies: 1,
  endedAtMs: 1_800_000_000_000,
  published: false,
  ...over
})

const review = (): ChessReview => ({
  summary: summary(),
  moves: ['e7e8q'],
  san: ['e8=Q#'],
  fens: ['7k/4P3/6K1/8/8/8/8/8 w - - 0 1', '4Q2k/8/6K1/8/8/8/8/8 b - - 0 1'],
  pgn: '[Event "x"]\n\n1. e8=Q# 1-0\n'
})

const roundRobin = (over: Partial<ChessRoundRobin> = {}): ChessRoundRobin => ({
  roundRobinId: 'E1',
  creator: 'alice',
  entrants: ['alice', 'bob', 'carol'],
  terms: { setupId: 'standard', setupName: 'Standard starting position', initialSeconds: 180, incrementSeconds: 2 },
  pairings: [],
  withdrawn: [],
  standings: [],
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

  it('a start names the setup and clock', () => {
    const { result, move } = mount()
    act(() => result.current.startTable({ setupId: 'lucena', initialSeconds: 60, incrementSeconds: 1 }))
    expect(move.mock.calls).toEqual([['startGame', { setupId: 'lucena', initialSeconds: 60, incrementSeconds: 1 }]])
  })

  it('a challenge posts its terms as the hub spells them', () => {
    const { result, move } = mount()
    act(() => result.current.postChallenge({ setupId: 'lucena', initialSeconds: 60, incrementSeconds: 1 }))
    expect(move.mock.calls).toEqual([['challenge', { setupId: 'lucena', initialSeconds: 60, incrementSeconds: 1 }]])
  })

  it('a bot is asked for at its strength', () => {
    const { result, move } = mount()
    act(() => result.current.addBot(1600))
    expect(move.mock.calls).toEqual([['addBot', { elo: 1600 }]])
  })

  it('a play and a resignation go out as the hub spells them', () => {
    const { result, receive, move } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.play('e7e8q'))
    act(() => result.current.resign())
    expect(move.mock.calls).toEqual([['play', { uci: 'e7e8q' }], ['resign']])
  })

  // The board draws a move sent at once; the hub's answer replaces it.
  it('holds a move sent until the next view', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view() } })
    const play = result.current.play
    expect(result.current.sent).toBeNull()
    act(() => result.current.play('g6f7'))
    expect(result.current.sent).toBe('g6f7')
    receive({ gameState: { view: view({ fen: '7k/4PK2/8/8/8/8/8/8 b - - 1 1' }) } })
    expect(result.current.sent).toBeNull()
    // A premove sends through play from an effect keyed on it: a new
    // identity per view would send it again.
    expect(result.current.play).toBe(play)
  })

  it('lets go of a move the hub refuses', () => {
    const { result, receive } = mount()
    receive({ gameJoined: { view: view() } })
    act(() => result.current.play('g6f7'))
    act(() => result.current.handleRejected())
    expect(result.current.sent).toBeNull()
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

  it('play again at an open table is its selected next setup, on the same clock', () => {
    const { result, receive, move } = mount()
    receive({ gameState: { view: view({ phase: 'ended' }) } })
    act(() => result.current.playAgain('lucena'))
    expect(move.mock.calls).toEqual([['startGame', { setupId: 'lucena', initialSeconds: 180, incrementSeconds: 2 }]])
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

  it('holds a bot asked for until its seat arrives, or the hub refuses it', () => {
    const { result, receive } = mount()
    receive({ gameState: { view: view({ phase: 'waiting' }) } })
    act(() => result.current.addBot(1600))
    expect(result.current.seating).toBe(true)
    receive({ gameState: { view: view({ phase: 'waiting' }) } })
    expect(result.current.seating).toBe(false)
    act(() => result.current.addBot(1600))
    act(() => result.current.handleRejected())
    expect(result.current.seating).toBe(false)
  })

  it('announces another seat’s table, never its own', () => {
    const { receive, showNotice } = mount()
    receive({ gameCreated: { gameId: 'GAME01', createdBy: 'alice' } })
    receive({ gameCreated: { gameId: 'GAME02', createdBy: 'bob' } })
    expect(showNotice.mock.calls).toEqual([['bob opened chess table GAME02']])
  })

  // A watcher (MoonBase#1633) holds no seat: its view is the seats' own,
  // with no chair of its own in it.
  it('watches a table by asking for it, and knows it holds no seat there', () => {
    const { result, receive, move } = mount()
    act(() => result.current.watchTable('GAME01'))
    expect(move.mock.calls).toEqual([['watch', { gameId: 'GAME01' }]])
    receive({ gameState: { view: view({ players: [{ playerId: 'bob', color: 'white' }, { playerId: 'carol', color: 'black' }] }) } })
    expect(result.current.watching).toBe(true)
    receive({ gameJoined: { view: view() } })
    expect(result.current.watching).toBe(false)
  })

  it('stops watching through the hub, which answers as it does a seat', () => {
    const { result, receive, move, onLeft } = mount()
    receive({ gameState: { view: view({ players: [{ playerId: 'bob', color: 'white' }] }) } })
    act(() => result.current.leaveTable())
    expect(move.mock.calls).toEqual([['leaveGame']])
    receive({ gameLeft: { gameId: 'GAME01' } })
    expect(result.current.view).toBeNull()
    expect(onLeft).toHaveBeenCalledTimes(1)
  })
  // The room's finished games (MoonBase#1637): asked for, held as the hub
  // answers, and kept current by every published the room hears.
  it('asks for the room history and holds the answer', () => {
    const { result, receive, move } = mount()
    act(() => result.current.loadHistory())
    expect(move.mock.calls).toEqual([['history']])
    receive({ history: { published: false, games: [summary()] } })
    expect(result.current.history?.games).toEqual([summary()])
    expect(result.current.history?.published).toBe(false)
  })

  it('reviews a game by its table and line, or by its archive id, and closes the review', () => {
    const { result, receive, move } = mount()
    act(() => result.current.reviewGame('GAME01', 1))
    act(() => result.current.reviewArchived(7))
    expect(move.mock.calls).toEqual([
      ['review', { gameId: 'GAME01', ordinal: 1 }],
      ['review', { archiveId: 7 }]
    ])
    receive({ review: review() })
    expect(result.current.review).toEqual(review())
    act(() => result.current.closeReview())
    expect(result.current.review).toBeNull()
  })

  // Said once the hub has it, for whoever changed it — the checkbox alone
  // does not say the room heard.
  it('publishes through the hub, and says so whoever does', () => {
    const { result, receive, move, showNotice } = mount()
    receive({ history: { published: false, games: [] } })
    act(() => result.current.publish(true))
    expect(move.mock.calls).toEqual([['publish', { published: true }]])
    expect(showNotice).not.toHaveBeenCalled()
    receive({ published: { published: true, by: 'alice' } })
    expect(result.current.history?.published).toBe(true)
    expect(showNotice).toHaveBeenLastCalledWith('You published this room’s chess games: games that end from now on are public')
    receive({ published: { published: false, by: 'bob' } })
    expect(result.current.history?.published).toBe(false)
    expect(showNotice).toHaveBeenLastCalledWith('bob stopped publishing this room’s chess games')
    receive({ published: { published: true } })
    expect(showNotice).toHaveBeenLastCalledWith('this room’s chess games are now published')
  })

  // The room's round robins (MoonBase#1647): asked for, then kept current
  // by each one every member hears; one heard before the answer waits for it.
  it('asks for the round robins and keeps each current', () => {
    const { result, receive, move } = mount()
    receive({ roundRobin: roundRobin() })
    expect(result.current.roundRobins).toBeNull()
    act(() => result.current.loadRoundRobins())
    expect(move.mock.calls).toEqual([['roundRobins']])
    receive({ roundRobins: { roundRobins: [roundRobin()] } })
    receive({ roundRobin: roundRobin({ withdrawn: ['carol'] }) })
    receive({ roundRobin: roundRobin({ roundRobinId: 'E2' }) })
    expect(result.current.roundRobins?.map(held => [held.roundRobinId, held.withdrawn])).toEqual([
      ['E1', ['carol']],
      ['E2', []]
    ])
  })

  it('creates, plays and moderates round robins as the hub spells them', () => {
    const { result, move } = mount()
    act(() => result.current.createRoundRobin(['alice', 'bob', 'carol'], { initialSeconds: 300, incrementSeconds: 3 }))
    act(() => result.current.playRoundRobin('E1', 'bob'))
    act(() => result.current.forfeit('E1', 'bob', 'carol'))
    act(() => result.current.withdraw('E1', 'carol'))
    expect(move.mock.calls).toEqual([
      ['createRoundRobin', { entrants: ['alice', 'bob', 'carol'], terms: { initialSeconds: 300, incrementSeconds: 3 } }],
      ['playRoundRobin', { roundRobinId: 'E1', opponent: 'bob' }],
      ['forfeit', { roundRobinId: 'E1', winner: 'bob', loser: 'carol' }],
      ['withdraw', { roundRobinId: 'E1', playerId: 'carol' }]
    ])
  })

  // A review outlives the table it came from; a new room or a resume
  // forgets both.
  it('keeps the review when the table goes, and clear forgets everything', () => {
    const { result, receive } = mount()
    receive({ gameState: { view: view({ phase: 'ended' }) } })
    receive({ review: review() })
    receive({ history: { published: true, games: [summary()] } })
    receive({ gameLeft: { gameId: 'GAME01' } })
    expect(result.current.view).toBeNull()
    expect(result.current.review).not.toBeNull()
    act(() => result.current.clear())
    expect(result.current.review).toBeNull()
    expect(result.current.history).toBeNull()
  })

  it('clear forgets the round robins', () => {
    const { result, receive } = mount()
    receive({ roundRobins: { roundRobins: [roundRobin()] } })
    act(() => result.current.clear())
    expect(result.current.roundRobins).toBeNull()
  })
})
