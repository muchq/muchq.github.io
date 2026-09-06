import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CastleTable from '../CastleTable'
import type { CastleTableProps } from '../CastleTable'
import type { CastlePlayer, CastleView } from '../../wire'

// The table from one chair, over a fake hook: which cards are offered
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
  run: [
    { rank: '8', suit: '♠' },
    { rank: '8', suit: '♥' }
  ],
  finished: [],
  lastPlay: { playerId: 'bob', cards: [{ rank: '8', suit: '♥' }], burned: false, pickedUp: false },
  ...over
})

const table = (over: Partial<CastleTableProps['table']> = {}): CastleTableProps['table'] => ({
  ended: null,
  selected: [],
  startTable: vi.fn(),
  leaveTable: vi.fn(),
  swapForSetup: vi.fn(),
  ready: vi.fn(),
  toggleCard: vi.fn(),
  playSelected: vi.fn(),
  playFaceDown: vi.fn(),
  pickUp: vi.fn(),
  ...over
})

const mountWith = (v: CastleView, over: Partial<CastleTableProps['table']> = {}, connected = true) => {
  const t = table(over)
  const rendered = render(<CastleTable playerId="alice" connected={connected} view={v} table={t} />)
  return { ...rendered, t }
}

describe('CastleTable', () => {
  beforeEach(() => cleanup())

  it('deals only once a second seat is in', () => {
    const solo = mountWith(view({ phase: 'waiting', players: [seat('alice')], currentPlayerId: undefined }))
    expect(screen.getByText('Waiting for a second seat.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Deal' }))
    expect(solo.t.startTable).not.toHaveBeenCalled()
    cleanup()
    const pair = mountWith(view({ phase: 'waiting', currentPlayerId: undefined }))
    fireEvent.click(screen.getByRole('button', { name: 'Deal' }))
    expect(pair.t.startTable).toHaveBeenCalled()
  })

  it("shows a castle of stacks and a hand: the other seat's faces on its stacks, backs in its hand", () => {
    const bobSeat = seat('bob', { faceUp: [{ rank: 'J', suit: '♠' }, { rank: 'J', suit: '♥' }], faceDownCount: 3, handCount: 2 })
    mountWith(view({ players: [seat('alice', { hand: myHand }), bobSeat] }))
    const castle = within(screen.getByRole('group', { name: "bob's castle" }))
    expect(castle.getAllByRole('img', { name: 'face-down card' })).toHaveLength(3)
    expect(castle.getByRole('img', { name: 'J♠' })).toBeDefined()
    expect(castle.getByRole('img', { name: 'J♥' })).toBeDefined()
    const hand = within(screen.getByRole('group', { name: "bob's hand" }))
    expect(hand.getAllByRole('img', { name: 'hand card' })).toHaveLength(2)
    expect(hand.queryByRole('img', { name: /[♠♥♦♣]$/ })).toBeNull()
    expect(within(screen.getByRole('group', { name: 'Your hand' })).getByRole('button', { name: 'K♦' })).toBeDefined()
  })

  it('offline, nothing at the table sends', () => {
    const { t } = mountWith(view(), { selected: [0] }, false)
    expect(screen.getByRole('button', { name: /^Play/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Leave table' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Q♠' })).toBeNull()
    expect(t.toggleCard).not.toHaveBeenCalled()
  })

  it('setup: a hand card then a face-up card is one swap; ready is ready', () => {
    const { t } = mountWith(view({ phase: 'setup', currentPlayerId: undefined }))
    fireEvent.click(screen.getByRole('button', { name: 'K♣' }))
    expect(screen.getByText('Now pick the face-up card to swap it with.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'swap for J♥' }))
    expect(t.swapForSetup).toHaveBeenCalledWith(1, 1)
    const bob = within(screen.getByRole('region', { name: 'bob' }))
    expect(bob.queryByRole('button', { name: 'J♠' })).toBeNull()
    expect(bob.getByRole('img', { name: 'J♠' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Ready' }))
    expect(t.ready).toHaveBeenCalled()
  })

  it('a swap pick belongs to its table', () => {
    const t = table()
    const { rerender } = render(<CastleTable playerId="alice" connected view={view({ phase: 'setup', currentPlayerId: undefined })} table={t} />)
    fireEvent.click(screen.getByRole('button', { name: 'K♣' }))
    expect(screen.getByRole('button', { name: 'K♣' })).toHaveAttribute('aria-pressed', 'true')
    rerender(<CastleTable playerId="alice" connected view={view({ gameId: 'G2', phase: 'setup', currentPlayerId: undefined })} table={t} />)
    expect(screen.getByRole('button', { name: 'K♣' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'swap for J♥' })).toBeNull()
  })

  it('on turn: hand cards select, play sends the selection, pick-up only without a play', () => {
    const { t } = mountWith(view(), { selected: [0, 1] })
    expect(screen.getByText('two 8s on top: play one or more of 8 or higher')).toBeDefined()
    const run = within(screen.getByRole('group', { name: 'run on top' }))
    expect(run.getByRole('img', { name: '8♠' })).toBeDefined()
    expect(run.getByRole('img', { name: '8♥' })).toBeDefined()
    expect(screen.getByText('bob played 8♥')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Q♠' }))
    expect(t.toggleCard).toHaveBeenCalledWith(2)
    fireEvent.click(screen.getByRole('button', { name: 'Play K♦ K♣' }))
    expect(t.playSelected).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Pick up the pile' })).toBeEnabled()
    const bob = within(screen.getByRole('region', { name: 'bob' }))
    expect(within(bob.getByRole('group', { name: "bob's hand" })).getAllByRole('img', { name: 'hand card' })).toHaveLength(3)
    expect(screen.getByRole('group', { name: 'Your castle' })).toBeDefined()
  })

  it('the pile is always there to pick up, unless it is empty', () => {
    const playable = view()
    playable.players[0] = { ...playable.players[0], canPlay: true }
    const { t } = mountWith(playable)
    fireEvent.click(screen.getByRole('button', { name: 'Pick up the pile' }))
    expect(t.pickUp).toHaveBeenCalled()
    cleanup()
    mountWith(view({ pileCount: 0, run: [], lastPlay: undefined }))
    expect(screen.getByText('Empty pile: anything goes')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Pick up the pile' })).toBeDisabled()
  })

  it('off turn nothing is offered', () => {
    mountWith(view({ currentPlayerId: 'bob' }))
    expect(screen.queryByRole('button', { name: 'Q♠' })).toBeNull()
    expect(screen.getByRole('img', { name: 'Q♠' })).toBeDefined()
    expect(screen.queryByRole('button', { name: /^Play/ })).toBeNull()
    expect(screen.getByRole('region', { name: 'bob, to play' })).toBeDefined()
  })

  it('a blind row flips on click, or picks up the pile', () => {
    const blind = view()
    blind.players[0] = { ...blind.players[0], hand: [], handCount: 0, faceUp: [], faceDownCount: 2 }
    const { t } = mountWith(blind)
    fireEvent.click(screen.getByRole('button', { name: 'flip face-down card 2' }))
    expect(t.playFaceDown).toHaveBeenCalledWith(1)
    expect(screen.queryByRole('button', { name: /^Play/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Pick up the pile' }))
    expect(t.pickUp).toHaveBeenCalled()
  })

  it('the ending reads from this chair, with every hand face up', () => {
    const over = view({ phase: 'ended', currentPlayerId: undefined, finished: ['bob'] })
    over.players[1] = { ...over.players[1], hand: [{ rank: '3', suit: '♣' }], handCount: 1, out: true }
    const { t } = mountWith(over, { ended: { finished: ['bob'], loser: 'alice' } })
    expect(screen.getByText('bob went out first and wins; you are the loser.')).toBeDefined()
    expect(within(screen.getByRole('region', { name: 'bob, out' })).getByRole('img', { name: '3♣' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
    expect(t.leaveTable).toHaveBeenCalled()
  })
})
