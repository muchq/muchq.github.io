import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SpadesTable from '../SpadesTable'
import type { SpadesTableProps } from '../SpadesTable'
import type { Card, SpadesPlayer, SpadesView } from '../../wire'

// The table from alice's chair, over a fake hook: what is offered at
// each step of a hand, and what a tap sends.

const c = (spelled: string): Card => ({ rank: spelled.slice(0, -1), suit: spelled.slice(-1) })

const NAMES = ['alice', 'bob', 'cat', 'dan']
const myHand = ['A♠', '7♠', 'K♥', '4♥', '9♣', '2♦']

const seats = (over: Partial<Record<string, Partial<SpadesPlayer>>> = {}): SpadesPlayer[] =>
  NAMES.map((playerId, seat) => ({
    playerId,
    team: seat % 2,
    handCount: 6,
    hand: playerId === 'alice' ? myHand.map(c) : [],
    tricks: 0,
    ...over[playerId]
  }))

const view = (over: Partial<SpadesView> = {}): SpadesView => ({
  gameId: 'S1',
  phase: 'playing',
  players: seats({ alice: { bid: 3 }, bob: { bid: 0 }, cat: { bid: 4 }, dan: { bid: 2 } }),
  dealer: 'dan',
  currentPlayerId: 'alice',
  handNumber: 2,
  trick: [],
  spadesBroken: false,
  legal: [c('K♥'), c('4♥'), c('9♣'), c('2♦')],
  teams: [
    { players: ['alice', 'cat'], score: 62, bags: 2, gamesWon: 1 },
    { players: ['bob', 'dan'], score: -40, bags: 0, gamesWon: 0 }
  ],
  hands: [{ bids: [3, 0, 4, 2], tricks: [5, 1, 4, 3], points: [72, -100], scores: [72, -100] }],
  ...over
})

const table = (over: Partial<SpadesTableProps['table']> = {}): SpadesTableProps['table'] => ({
  opening: false,
  sending: false,
  startTable: vi.fn(),
  leaveTable: vi.fn(),
  playAgain: vi.fn(),
  bid: vi.fn(),
  play: vi.fn(),
  deal: vi.fn(),
  ...over
})

const show = (v: SpadesView, t = table(), connected = true) => {
  render(<SpadesTable playerId="alice" connected={connected} view={v} table={t} />)
  return t
}

const hand = () => screen.getByRole('group', { name: 'Your hand' })

describe('SpadesTable', () => {
  beforeEach(() => cleanup())

  it('waits for four seats, then any of them starts', () => {
    const t = show(view({ phase: 'waiting', players: seats().slice(0, 3), handNumber: 0, dealer: undefined, currentPlayerId: undefined, teams: [], hands: [] }))
    expect(screen.getByText(/Partners across the table/)).toBeTruthy()
    expect(screen.getByText('Waiting for 1 more.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start table' })).toBeDisabled()
    cleanup()
    show(view({ phase: 'waiting', players: seats(), handNumber: 0, dealer: undefined, currentPlayerId: undefined, teams: [], hands: [] }), t)
    expect(screen.getByText('Four seated: start when ready.')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'table' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Start table' }))
    expect(t.startTable).toHaveBeenCalledTimes(1)
  })

  // Partners sit across: the viewer at 6, the partner at 12.
  it('seats partners across the table, each with their bid and tricks', () => {
    show(view({ players: seats({ alice: { bid: 3, tricks: 1 }, bob: { bid: 0 }, cat: { bid: 4, tricks: 2 } }) }))
    const clockOf = (name: string) => screen.getByRole('region', { name }).getAttribute('data-clock')
    expect(['alice (you)', 'bob', 'cat', 'dan'].map(clockOf)).toEqual(['6', '9', '12', '3'])
    expect(within(screen.getByRole('region', { name: /^cat/ })).getByText(/partner/)).toBeTruthy()
    expect(within(screen.getByRole('region', { name: /^cat/ })).getByText('bid 4 · 2 taken')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: /^bob/ })).getByText('nil · 0 taken')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: /^dan/ })).getByText('to bid · 0 taken')).toBeTruthy()
    // A phone hides the backs and reads the count, so it is always there.
    expect(within(screen.getByRole('region', { name: /^bob/ })).getByText('· 6 in hand')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: /^dan/ })).getByText('· dealer')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: /^bob/ })).queryByText('· dealer')).toBeNull()
  })

  it('bids only once a number is picked, so nil is never a slip', () => {
    const bidding = view({ phase: 'bidding', players: seats({ dan: { bid: 2 } }), legal: [] })
    const t = show(bidding)
    expect(screen.getByText('Your bid: the tricks you and cat mean to take between you, or nil.')).toBeTruthy()
    const bidButton = screen.getByRole('button', { name: 'Bid' })
    expect(bidButton).toBeDisabled()
    const picker = screen.getByRole('combobox', { name: 'Your bid' })
    expect(within(picker).getAllByRole('option').map(option => option.textContent)).toEqual([
      'Pick…',
      'Nil',
      ...Array.from({ length: 13 }, (_, i) => `${i + 1}`)
    ])
    fireEvent.change(picker, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Bid nil' }))
    expect(t.bid).toHaveBeenCalledWith(0)
    fireEvent.change(picker, { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Bid 4' }))
    expect(t.bid).toHaveBeenLastCalledWith(4)
    // The picker goes with the bid: focus lands on the hand, not the page.
    expect(document.activeElement).toBe(hand())
  })

  // A pick is for the bid it was made for: the next game's first hand
  // has the same number, and must not arrive with it already chosen.
  it('forgets a pick once the bid is made', () => {
    const bidding = view({ phase: 'bidding', players: seats(), legal: [] })
    const t = table()
    const { rerender } = render(<SpadesTable playerId="alice" connected view={bidding} table={t} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Your bid' }), { target: { value: '5' } })
    rerender(<SpadesTable playerId="alice" connected view={{ ...bidding, currentPlayerId: 'bob' }} table={t} />)
    rerender(<SpadesTable playerId="alice" connected view={bidding} table={t} />)
    expect(screen.getByRole('button', { name: 'Bid' })).toBeDisabled()
  })

  it('a bid or a deal on its way, or a dropped link, offers neither again', () => {
    const bidding = view({ phase: 'bidding', players: seats(), legal: [] })
    const { rerender } = render(<SpadesTable playerId="alice" connected view={bidding} table={table()} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Your bid' }), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Bid 4' }))
    // Sent and not yet answered: a second tap is not a second bid.
    rerender(<SpadesTable playerId="alice" connected view={bidding} table={table({ sending: true })} />)
    expect(screen.getByRole('combobox', { name: 'Your bid' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bid 4' })).toBeDisabled()
    cleanup()
    show(view({ phase: 'scored', currentPlayerId: undefined, legal: [] }), table({ sending: true }))
    expect(screen.getByRole('button', { name: 'Deal the next hand' })).toBeDisabled()
    cleanup()
    show(view({ phase: 'scored', currentPlayerId: undefined, legal: [] }), table(), false)
    expect(screen.getByRole('button', { name: 'Deal the next hand' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Leave table' })).toBeDisabled()
  })

  it('off its turn a seat is told whose bid it is, and offered none', () => {
    show(view({ phase: 'bidding', currentPlayerId: 'bob', players: seats(), legal: [] }))
    expect(screen.getByText('Waiting for bob to bid.')).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Your bid' })).toBeNull()
  })

  // The hub's legal list is the rule: following suit, spades unbroken.
  it('only a legal card is a button, and tapping it plays it', () => {
    const t = show(view({ trick: [{ playerId: 'dan', card: c('8♥') }], legal: [c('K♥'), c('4♥')] }))
    const buttons = within(hand()).getAllByRole('button').map(button => button.getAttribute('aria-label'))
    expect(buttons).toEqual(['K♥', '4♥'])
    expect(within(hand()).getByRole('img', { name: 'A♠' })).toBeTruthy()
    expect(screen.getByText('Your play: follow the suit led if you can.')).toBeTruthy()
    fireEvent.click(within(hand()).getByRole('button', { name: 'K♥' }))
    expect(t.play).toHaveBeenCalledWith(c('K♥'))
    expect(document.activeElement).toBe(hand())
  })

  it('a lead says whether spades are broken', () => {
    show(view())
    expect(screen.getByText('Your lead. Spades aren’t broken yet.')).toBeTruthy()
    cleanup()
    show(view({ spadesBroken: true }))
    expect(screen.getByText('Your lead.')).toBeTruthy()
  })

  it('offers nothing while a move is on its way, or the link is down', () => {
    show(view(), table({ sending: true }))
    expect(within(hand()).queryAllByRole('button')).toEqual([])
    cleanup()
    show(view(), table(), false)
    expect(within(hand()).queryAllByRole('button')).toEqual([])
  })

  it('off turn no card is a button', () => {
    show(view({ currentPlayerId: 'bob', legal: [] }))
    expect(within(hand()).queryAllByRole('button')).toEqual([])
    expect(screen.getByText('Waiting for bob to play.')).toBeTruthy()
  })

  it('lays the trick out by who played what, and the last one taken until the next is led', () => {
    const taken = { winner: 'cat', plays: [{ playerId: 'dan', card: c('J♦') }, { playerId: 'alice', card: c('2♦') }] }
    show(view({ trick: [{ playerId: 'bob', card: c('Q♣') }, { playerId: 'cat', card: c('3♣') }], lastTrick: taken }))
    expect(screen.queryByRole('group', { name: 'last trick' })).toBeNull()
    // Another seat's play is said, not only drawn.
    expect(screen.getByText('cat played 3♣')).toBeTruthy()
    const trick = screen.getByRole('group', { name: 'trick' })
    expect(within(trick).getByRole('img', { name: 'Q♣ from bob' })).toBeTruthy()
    expect(within(trick).getByRole('img', { name: '3♣ from cat' })).toBeTruthy()
    cleanup()
    show(view({ lastTrick: taken }))
    expect(screen.getByText('cat took the last trick')).toBeTruthy()
    expect(screen.getByText('cat took the trick')).toBeTruthy()
    cleanup()
    show(view({ lastTrick: { ...taken, winner: 'alice' } }))
    expect(screen.getByText('You took the last trick')).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'last trick' })).getByRole('img', { name: 'J♦ from dan' })).toBeTruthy()
  })

  it('keeps each team’s score, bags and games won, and the game’s hands', () => {
    show(view())
    const board = screen.getByRole('table', { name: 'Score' })
    const rows = within(board)
      .getAllByRole('row')
      .map(row => within(row).queryAllByRole('cell').map(cell => cell.textContent))
      .filter(cells => cells.length > 0)
    expect(rows).toEqual([
      ['62', '2', '1'],
      ['-40', '0', '0']
    ])
    expect(within(board).getByRole('rowheader', { name: 'You & cat' })).toBeTruthy()
    const sheet = screen.getByRole('table', { name: 'Hands' })
    expect(within(sheet).getByRole('row', { name: '1 3 / 4 · took 9 +72 72 nil / 2 · took 4 -100 -100' })).toBeTruthy()
  })

  it('a scored hand is anyone’s to deal on', () => {
    const t = show(view({ phase: 'scored', currentPlayerId: undefined, legal: [] }))
    expect(screen.getByText('Hand 2 is scored: anyone can deal the next.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Deal the next hand' }))
    expect(t.deal).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(hand())
  })

  it('a won game says who won and deals a new one', () => {
    const t = show(
      view({ phase: 'won', currentPlayerId: undefined, legal: [], result: { ending: 'points', winners: ['alice', 'cat'], scores: [512, 230] } })
    )
    expect(screen.getByText('You and cat won, 512 to 230.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Deal a new game' }))
    expect(t.deal).toHaveBeenCalledTimes(1)
  })

  // A leave ends the game for all four, so it is asked twice.
  it('leaving a game in play asks first', () => {
    const t = show(view())
    fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
    expect(t.leaveTable).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(screen.queryByRole('button', { name: 'Leave and end the game' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Leave table' }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave and end the game' }))
    expect(t.leaveTable).toHaveBeenCalledTimes(1)
  })

  // Between hands the game is not over: a leave still abandons it.
  it('a scored hand is still a game in play; one won since is not', () => {
    const t = table()
    const scored = view({ phase: 'scored', currentPlayerId: undefined, legal: [] })
    const { rerender } = render(<SpadesTable playerId="alice" connected view={scored} table={t} />)
    fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
    expect(t.leaveTable).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Leave and end the game' })).toBeTruthy()
    // Asked while the game was on, answered after it was won: no game to end.
    rerender(<SpadesTable playerId="alice" connected view={{ ...scored, phase: 'won' }} table={t} />)
    expect(screen.queryByRole('button', { name: 'Leave and end the game' })).toBeNull()
    // Nor does the question come back unasked with the next game.
    rerender(<SpadesTable playerId="alice" connected view={{ ...scored, phase: 'bidding', handNumber: 1 }} table={t} />)
    expect(screen.queryByRole('button', { name: 'Leave and end the game' })).toBeNull()
    rerender(<SpadesTable playerId="alice" connected view={{ ...scored, phase: 'won' }} table={t} />)
    fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
    expect(t.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('bidding is a game in play too', () => {
    const t = show(view({ phase: 'bidding', legal: [] }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
    expect(t.leaveTable).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Leave and end the game' })).toBeTruthy()
  })

  it('a table still waiting, or a won game, is left at once', () => {
    const t = show(view({ phase: 'waiting', players: seats().slice(0, 2), handNumber: 0, teams: [], hands: [], currentPlayerId: undefined }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
    expect(t.leaveTable).toHaveBeenCalledTimes(1)
    cleanup()
    show(view({ phase: 'won', currentPlayerId: undefined, result: { ending: 'points', winners: ['bob', 'dan'], scores: [100, 500] } }), t)
    fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
    expect(t.leaveTable).toHaveBeenCalledTimes(2)
  })

  it('a closed table says who left, and offers another game or the room', () => {
    const t = show(
      view({ phase: 'closed', currentPlayerId: undefined, legal: [], left: 'dan', result: { ending: 'abandoned', winners: [], scores: [62, -40] } }),
      table({ opening: false })
    )
    expect(screen.getByText('dan left: the game was abandoned.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Leave table' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(t.playAgain).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
    expect(t.leaveTable).toHaveBeenCalledTimes(1)
    cleanup()
    show(view({ phase: 'closed', currentPlayerId: undefined, legal: [], left: 'dan' }), table({ opening: true }))
    expect(screen.getByRole('button', { name: 'Opening…' })).toBeDisabled()
  })
})
