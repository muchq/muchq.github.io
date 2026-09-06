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
  playAgain: vi.fn(),
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

  it('a swap pick follows its card, and goes when the card does', () => {
    const t = table()
    const setup = (hand: typeof myHand, over = {}) =>
      view({ phase: 'setup', currentPlayerId: undefined, players: [seat('alice', { hand }), seat('bob')], ...over })
    const { rerender } = render(<CastleTable playerId="alice" connected view={setup(myHand)} table={t} />)
    fireEvent.click(screen.getByRole('button', { name: 'K♣' }))

    // A view lands with the hand rearranged: the pick is on the card,
    // not on slot 1, so it moves with it.
    rerender(
      <CastleTable
        playerId="alice"
        connected
        view={setup([{ rank: 'K', suit: '♣' }, { rank: 'K', suit: '♦' }, { rank: 'Q', suit: '♠' }])}
        table={t}
      />
    )
    expect(screen.getByRole('button', { name: 'K♣' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'K♦' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'swap for J♥' }))
    expect(t.swapForSetup).toHaveBeenCalledWith(0, 1)

    // The card leaves the hand — the swap this pick began, echoing back.
    // Nothing is picked now, so nothing offers to swap.
    rerender(
      <CastleTable
        playerId="alice"
        connected
        view={setup([{ rank: 'J', suit: '♥' }, { rank: 'K', suit: '♦' }, { rank: 'Q', suit: '♠' }])}
        table={t}
      />
    )
    expect(screen.getByRole('button', { name: 'J♥' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'swap for J♥' })).toBeNull()
    expect(t.swapForSetup).toHaveBeenCalledTimes(1)
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

  it('seats the table around the viewer: 6 o\'clock, then clockwise in turn order', () => {
    const four = view({ players: [seat('bob'), seat('alice', { hand: myHand }), seat('carol'), seat('dave')], currentPlayerId: 'bob' })
    mountWith(four)
    const clockOf = (name: RegExp) => screen.getByRole('region', { name }).getAttribute('data-clock')
    expect(clockOf(/^alice \(you\)/)).toBe('6')
    expect(clockOf(/^carol/)).toBe('9')
    expect(clockOf(/^dave/)).toBe('12')
    expect(clockOf(/^bob/)).toBe('3')
    cleanup()
    mountWith(view({ players: [seat('alice', { hand: myHand }), seat('bob'), seat('carol')] }))
    expect(clockOf(/^bob/)).toBe('10')
    expect(clockOf(/^carol/)).toBe('2')
    // The count is another seat's, never the viewer's own.
    expect(screen.getByRole('region', { name: /^bob/ })).toHaveTextContent('3 in hand')
    expect(screen.getByRole('region', { name: /^alice/ })).not.toHaveTextContent('in hand')
    // The viewer's moves sit under their hand.
    expect(within(screen.getByRole('region', { name: /^alice/ })).getByRole('button', { name: 'Pick up the pile' })).toBeDefined()
  })

  it("another seat's hand is capped at six backs, and the count says the rest", () => {
    const big = view()
    big.players[1] = { ...big.players[1], handCount: 9, hand: [] }
    mountWith(big)
    const bob = within(screen.getByRole('region', { name: /^bob/ }))
    expect(bob.getAllByRole('img', { name: 'hand card' })).toHaveLength(6)
    // Only a capped hand needs the count beside the fan; a short one reads
    // off the fan itself, and the stylesheet keeps that count out of the way.
    expect(screen.getByRole('region', { name: /^bob/ }).querySelector('[class*="handCountShown"]')).not.toBeNull()
    cleanup()
    mountWith(view())
    expect(within(screen.getByRole('region', { name: /^bob/ })).getAllByRole('img', { name: 'hand card' })).toHaveLength(3)
    expect(screen.getByRole('region', { name: /^bob/ }).querySelector('[class*="handCountShown"]')).toBeNull()
  })

  it('the showdown is every hand face up, so the table says it is ended', () => {
    // The fold that hides other hands on a short screen is scoped to a
    // table still in play; the root's phase is what scopes it.
    const over = view({ phase: 'ended', currentPlayerId: undefined, finished: ['bob'] })
    const { container } = mountWith(over, { ended: { finished: ['bob'], loser: 'alice' } })
    expect(container.querySelector('[data-phase="ended"]')).not.toBeNull()
    cleanup()
    const live = mountWith(view())
    expect(live.container.querySelector('[data-phase="playing"]')).not.toBeNull()
  })

  it('a hand that grew fans tighter', () => {
    const big = view()
    big.players[0] = { ...big.players[0], handCount: 10, hand: Array.from({ length: 10 }, (_, i) => ({ rank: String(i + 2), suit: '♣' })) }
    mountWith(big)
    const overlap = (name: RegExp) => screen.getByRole('group', { name }).style.getPropertyValue('--overlap')
    expect(overlap(/Your hand/)).toBe('1.8rem')
    expect(overlap(/bob's hand/)).toBe('1rem')
  })

  it('the ending arrives in front, and waves away to the final hands', () => {
    const over = view({ phase: 'ended', currentPlayerId: undefined, finished: ['bob'] })
    over.players[1] = { ...over.players[1], hand: [{ rank: '3', suit: '♣' }], handCount: 1, out: true }
    const { t } = mountWith(over, { ended: { finished: ['bob'], loser: 'alice' } })
    const ending = within(screen.getByRole('dialog'))
    expect(ending.getByRole('heading', { name: 'You lost' })).toBeDefined()
    expect(ending.getByText('😤')).toBeDefined()
    expect(ending.getByText('bob went out first and wins; you are the loser.')).toBeDefined()
    // Play again takes the focus, so the ending can be answered without
    // hunting for it.
    expect(document.activeElement).toBe(ending.getByRole('button', { name: 'Play again' }))
    // And nothing of the table's own is left focusable behind it.
    expect(screen.getAllByRole('button', { name: 'Play again' })).toHaveLength(1)

    // Waved away, with the focus put somewhere it can be read from.
    fireEvent.click(ending.getByRole('button', { name: 'See the final hands' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Table G1' }))
    expect(within(screen.getByRole('region', { name: 'bob, out' })).getByRole('img', { name: '3♣' })).toBeDefined()
    // Both ways on are still under it.
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(t.playAgain).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
    expect(t.leaveTable).toHaveBeenCalled()
  })

  it('one table is asked for per ending, and escape reads the felt instead', () => {
    const t = table({ ended: { finished: ['bob'], loser: 'alice' } })
    render(<CastleTable playerId="alice" connected view={view({ phase: 'ended', currentPlayerId: undefined })} table={t} />)
    const ending = within(screen.getByRole('dialog'))
    fireEvent.click(ending.getByRole('button', { name: 'Play again' }))
    // The second create would be refused — the first one's table is
    // already ours — and would read as the first having failed.
    const opening = ending.getByRole('button', { name: 'Opening…' })
    expect(opening).toBeDisabled()
    fireEvent.click(opening)
    expect(t.playAgain).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('tab stays in the ending, since what is behind it opens underneath', () => {
    const t = table({ ended: { finished: ['bob'], loser: 'alice' } })
    render(<CastleTable playerId="alice" connected view={view({ phase: 'ended', currentPlayerId: undefined })} table={t} />)
    const dialog = screen.getByRole('dialog')
    const ending = within(dialog)
    const first = ending.getByRole('button', { name: 'Play again' })
    const last = ending.getByRole('button', { name: 'See the final hands' })

    last.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
    // In the middle it is the browser's job, not ours.
    ending.getByRole('button', { name: 'Back to the room' }).focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(ending.getByRole('button', { name: 'Back to the room' }))
  })

  it('the ending headline is the viewer\u2019s own, and an abandoned table has none', () => {
    const over = view({ phase: 'ended', currentPlayerId: undefined, finished: ['alice'] })
    mountWith(over, { ended: { finished: ['alice'], loser: 'bob' } })
    expect(within(screen.getByRole('dialog')).getByText('🏆')).toBeDefined()
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'You won!' })).toBeDefined()
    cleanup()

    mountWith(view({ phase: 'ended', currentPlayerId: undefined }), { ended: { finished: [] } })
    const abandoned = within(screen.getByRole('dialog'))
    expect(abandoned.getByRole('heading', { name: 'The table broke up' })).toBeDefined()
    expect(abandoned.getByText('The table broke up: nobody went out')).toBeDefined()
  })

  it('the next table\u2019s ending arrives in front again', () => {
    const t = table({ ended: { finished: ['bob'], loser: 'alice' } })
    const ended = (gameId: string) => view({ gameId, phase: 'ended', currentPlayerId: undefined, finished: ['bob'] })
    const { rerender } = render(<CastleTable playerId="alice" connected view={ended('G1')} table={t} />)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'See the final hands' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<CastleTable playerId="alice" connected view={ended('G2')} table={t} />)
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('no result yet, no ending: the table stands until gameEnded lands', () => {
    mountWith(view({ phase: 'ended', currentPlayerId: undefined }), { ended: null })
    expect(screen.queryByRole('dialog')).toBeNull()
    // Nobody has been told who won, so nobody is offered the next game.
    expect(screen.queryByRole('button', { name: 'Play again' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Back to the room' })).toBeDefined()
  })
})
