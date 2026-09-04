import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CastleGame from '../CastleGame'
import { useCastleGame } from '@/hooks/useCastleGame'
import type { UseCastleGame } from '@/hooks/useCastleGame'
import type { CastlePlayer, CastleView } from '../../wire'

vi.mock('@/hooks/useCastleGame', async importOriginal => ({
  ...(await importOriginal<typeof import('@/hooks/useCastleGame')>()),
  useCastleGame: vi.fn()
}))

// The table from one chair, over a mocked hook: which cards are offered
// for which move in each phase, and what a click sends.

const seat = (playerId: string, over: Partial<CastlePlayer> = {}): CastlePlayer => ({
  playerId,
  ready: false,
  handCount: 3,
  hand: [],
  faceUp: [
    { rank: 'J', suit: '♠' },
    { rank: 'J', suit: '♥' }
  ],
  faceDownCount: 3,
  out: false,
  canPlay: false,
  ...over
})

const myHand = [
  { rank: 'K', suit: '♦' },
  { rank: 'K', suit: '♣' },
  { rank: 'Q', suit: '♠' }
]

const view = (over: Partial<CastleView> = {}): CastleView => ({
  gameId: 'G1',
  phase: 'playing',
  players: [seat('alice', { hand: myHand }), seat('bob')],
  currentPlayerId: 'alice',
  drawPileCount: 30,
  pileCount: 2,
  pileTop: { rank: '8', suit: '♥' },
  pileRun: 2,
  finished: [],
  lastPlay: { playerId: 'bob', cards: [{ rank: '8', suit: '♥' }], burned: false, pickedUp: false },
  ...over
})

const hook = (over: Partial<UseCastleGame> = {}): UseCastleGame => ({
  playerId: 'alice',
  connected: true,
  lost: null,
  room: null,
  view: null,
  ended: null,
  notice: '',
  chat: { messages: [], available: false, replayUpTo: 0, rejection: null },
  selected: [],
  roomCode: '',
  setRoomCode: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  createTable: vi.fn(),
  joinTable: vi.fn(),
  startTable: vi.fn(),
  leaveTable: vi.fn(),
  swapForSetup: vi.fn(),
  ready: vi.fn(),
  toggleCard: vi.fn(),
  playSelected: vi.fn(),
  playFaceDown: vi.fn(),
  pickUp: vi.fn(),
  sendChat: vi.fn(),
  ...over
})

const mountWith = (over: Partial<UseCastleGame> = {}) => {
  const game = hook(over)
  vi.mocked(useCastleGame).mockReturnValue(game)
  render(<CastleGame />)
  return game
}

describe('CastleGame', () => {
  beforeEach(() => {
    vi.mocked(useCastleGame).mockReset()
  })

  it('offers a room to create or join while disconnected from any', () => {
    const game = mountWith()
    fireEvent.click(screen.getByRole('button', { name: 'Create a room' }))
    expect(game.createRoom).toHaveBeenCalled()
    fireEvent.keyDown(screen.getByLabelText('Room code'), { key: 'Enter' })
    expect(game.joinRoom).toHaveBeenCalledTimes(1)
  })

  it('lists castle tables only, joinable while waiting with a seat free', () => {
    const game = mountWith({
      room: {
        roomId: 'ROOM01',
        players: [{ playerId: 'alice', connected: true, gamesPlayed: 2, gamesWon: 1, totalScore: 0 }],
        games: [
          { gameId: 'C1', game: 'castle', status: 'waiting', playerCount: 1 },
          { gameId: 'C2', game: 'castle', status: 'playing', playerCount: 3 },
          { gameId: 'C3', game: 'castle', status: 'waiting', playerCount: 4 },
          { gameId: 'GOLF1', game: 'golf', status: 'waiting', playerCount: 1 },
          // A row from before castle has no game and is golf's.
          { gameId: 'OLD01', status: 'waiting', playerCount: 1 }
        ]
      }
    })
    const tables = within(screen.getByRole('region', { name: 'Tables' }))
    expect(tables.queryByText(/GOLF1/)).toBeNull()
    expect(tables.queryByText(/OLD01/)).toBeNull()
    expect(tables.getByRole('button', { name: 'In play' })).toBeDisabled()
    expect(tables.getByRole('button', { name: 'Full' })).toBeDisabled()
    fireEvent.click(tables.getByRole('button', { name: 'Join' }))
    expect(game.joinTable).toHaveBeenCalledWith('C1')
    fireEvent.click(screen.getByRole('button', { name: 'Open a table' }))
    expect(game.createTable).toHaveBeenCalled()
    expect(screen.getByText('alice (you)', { exact: false })).toBeDefined()
  })

  it('deals only once a second seat is in', () => {
    const solo = mountWith({ room: { roomId: 'R', players: [], games: [] }, view: view({ phase: 'waiting', players: [seat('alice')], currentPlayerId: undefined }) })
    expect(screen.getByText('Waiting for a second seat.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Deal' }))
    expect(solo.startTable).not.toHaveBeenCalled()
    cleanup()
    const pair = mountWith({ room: { roomId: 'R', players: [], games: [] }, view: view({ phase: 'waiting', currentPlayerId: undefined }) })
    fireEvent.click(screen.getByRole('button', { name: 'Deal' }))
    expect(pair.startTable).toHaveBeenCalled()
  })

  it("shows a castle of stacks and a hand: the other seat's faces on its stacks, backs in its hand", () => {
    const bobSeat = seat('bob', { faceUp: [{ rank: 'J', suit: '♠' }, { rank: 'J', suit: '♥' }], faceDownCount: 3, handCount: 2 })
    mountWith({ room: { roomId: 'R', players: [], games: [] }, view: view({ players: [seat('alice', { hand: myHand }), bobSeat] }) })
    const castle = within(screen.getByRole('group', { name: "bob's castle" }))
    // Three stacks: two with a face on the back, the third bare where
    // its face-up card was played.
    expect(castle.getAllByRole('img', { name: 'face-down card' })).toHaveLength(3)
    expect(castle.getByRole('img', { name: 'J♠' })).toBeDefined()
    expect(castle.getByRole('img', { name: 'J♥' })).toBeDefined()
    const hand = within(screen.getByRole('group', { name: "bob's hand" }))
    expect(hand.getAllByRole('img', { name: 'hand card' })).toHaveLength(2)
    expect(hand.queryByRole('img', { name: /[♠♥♦♣]$/ })).toBeNull()
    // The viewer's own hand is faces.
    expect(within(screen.getByRole('group', { name: 'Your hand' })).getByRole('button', { name: 'K♦' })).toBeDefined()
  })

  it('offline, nothing at the table sends', () => {
    const game = mountWith({ room: { roomId: 'R', players: [], games: [] }, view: view(), selected: [0], connected: false })
    expect(screen.getByRole('button', { name: /^Play/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Leave table' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Q♠' })).toBeNull()
    expect(game.toggleCard).not.toHaveBeenCalled()
  })

  it('setup: a hand card then a face-up card is one swap; ready is ready', () => {
    const game = mountWith({ room: { roomId: 'R', players: [], games: [] }, view: view({ phase: 'setup', currentPlayerId: undefined }) })
    fireEvent.click(screen.getByRole('button', { name: 'K♣' }))
    expect(screen.getByText('Now pick the face-up card to swap it with.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'swap for J♥' }))
    expect(game.swapForSetup).toHaveBeenCalledWith(1, 1)
    // Only the viewer's own row swaps: the other seat's cards are pictures.
    const bob = within(screen.getByRole('region', { name: 'bob' }))
    expect(bob.queryByRole('button', { name: 'J♠' })).toBeNull()
    expect(bob.getByRole('img', { name: 'J♠' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Ready' }))
    expect(game.ready).toHaveBeenCalled()
  })

  it('a swap pick belongs to its table', () => {
    const game = hook({ room: { roomId: 'R', players: [], games: [] }, view: view({ phase: 'setup', currentPlayerId: undefined }) })
    vi.mocked(useCastleGame).mockReturnValue(game)
    const { rerender } = render(<CastleGame />)
    fireEvent.click(screen.getByRole('button', { name: 'K♣' }))
    expect(screen.getByRole('button', { name: 'K♣' })).toHaveAttribute('aria-pressed', 'true')
    // Another table, same seat shape: the pick does not carry over.
    vi.mocked(useCastleGame).mockReturnValue({ ...game, view: view({ gameId: 'G2', phase: 'setup', currentPlayerId: undefined }) })
    rerender(<CastleGame />)
    expect(screen.getByRole('button', { name: 'K♣' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'swap for J♥' })).toBeNull()
  })

  it('on turn: hand cards select, play sends the selection, pick-up only without a play', () => {
    const game = mountWith({ room: { roomId: 'R', players: [], games: [] }, view: view(), selected: [0, 1] })
    expect(screen.getByText('two 8s on top: play two or more of 8 or higher')).toBeDefined()
    expect(screen.getByText('bob played 8♥')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Q♠' }))
    expect(game.toggleCard).toHaveBeenCalledWith(2)
    fireEvent.click(screen.getByRole('button', { name: 'Play K♦ K♣' }))
    expect(game.playSelected).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Pick up the pile' })).toBeEnabled()
    // Bob's hand is a count of backs, never faces, and not buttons.
    const bob = within(screen.getByRole('region', { name: 'bob' }))
    expect(within(bob.getByRole('group', { name: "bob's hand" })).getAllByRole('img', { name: 'hand card' })).toHaveLength(3)
    expect(screen.getByRole('group', { name: 'Your castle' })).toBeDefined()
  })

  it('the pile is always there to pick up, unless it is empty', () => {
    const playable = view()
    playable.players[0] = { ...playable.players[0], canPlay: true }
    const game = mountWith({ room: { roomId: 'R', players: [], games: [] }, view: playable })
    fireEvent.click(screen.getByRole('button', { name: 'Pick up the pile' }))
    expect(game.pickUp).toHaveBeenCalled()
    cleanup()
    mountWith({ room: { roomId: 'R', players: [], games: [] }, view: view({ pileCount: 0, pileTop: undefined, pileRun: 0, lastPlay: undefined }) })
    expect(screen.getByText('Empty pile: anything goes')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Pick up the pile' })).toBeDisabled()
  })

  it('off turn nothing is offered', () => {
    mountWith({ room: { roomId: 'R', players: [], games: [] }, view: view({ currentPlayerId: 'bob' }) })
    expect(screen.queryByRole('button', { name: 'Q♠' })).toBeNull()
    expect(screen.getByRole('img', { name: 'Q♠' })).toBeDefined()
    expect(screen.queryByRole('button', { name: /^Play/ })).toBeNull()
    expect(screen.getByRole('region', { name: 'bob, to play' })).toBeDefined()
  })

  it('a blind row flips on click, or picks up the pile', () => {
    const blind = view()
    blind.players[0] = { ...blind.players[0], hand: [], handCount: 0, faceUp: [], faceDownCount: 2 }
    const game = mountWith({ room: { roomId: 'R', players: [], games: [] }, view: blind })
    fireEvent.click(screen.getByRole('button', { name: 'flip face-down card 2' }))
    expect(game.playFaceDown).toHaveBeenCalledWith(1)
    expect(screen.queryByRole('button', { name: /^Play/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Pick up the pile' }))
    expect(game.pickUp).toHaveBeenCalled()
  })

  it('the ending reads from this chair, with every hand face up', () => {
    const over = view({ phase: 'ended', currentPlayerId: undefined, finished: ['bob'] })
    over.players[1] = { ...over.players[1], hand: [{ rank: '3', suit: '♣' }], handCount: 1, out: true }
    const game = mountWith({ room: { roomId: 'R', players: [], games: [] }, view: over, ended: { finished: ['bob'], loser: 'alice' } })
    expect(screen.getByText('bob went out first and wins; you are the loser.')).toBeDefined()
    expect(within(screen.getByRole('region', { name: 'bob, out' })).getByRole('img', { name: '3♣' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
    expect(game.leaveTable).toHaveBeenCalled()
  })

  it('a lost hub is said, not hidden', () => {
    mountWith({ lost: 'Lost connection to the games hub' })
    expect(screen.getByText('Lost connection to the games hub')).toBeDefined()
  })
})
