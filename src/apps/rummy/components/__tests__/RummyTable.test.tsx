import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RummyTable from '../RummyTable'
import type { RummyTableProps } from '../RummyTable'
import type { Card, RummyPlayer, RummyView } from '../../wire'

// The table from one chair, over a fake hook: what is offered at each
// step of a turn, and what a tap sends.

const c = (spelled: string): Card => ({ rank: spelled.slice(0, -1), suit: spelled.slice(-1) })

const seat = (playerId: string, hand: string[] = []): RummyPlayer => ({
  playerId,
  handCount: hand.length || 10,
  hand: hand.map(c)
})

const myHand = ['K♦', '7♥', '7♣', '8♥', '9♥', '2♠']

const view = (over: Partial<RummyView> = {}): RummyView => ({
  gameId: 'M1',
  phase: 'playing',
  variant: '7-card',
  dealNumber: 1,
  standings: [
    { playerId: 'alice', handsWon: 0 },
    { playerId: 'bob', handsWon: 0 }
  ],
  players: [seat('alice', myHand), seat('bob')],
  currentPlayerId: 'alice',
  stage: 'play',
  stockCount: 30,
  canDrawStock: true,
  canDrawDiscard: true,
  discardCount: 3,
  discardTop: c('Q♠'),
  melds: [
    { owner: 'bob', cards: [c('4♣'), c('5♣'), c('6♣')] },
    { owner: 'bob', cards: [c('J♣'), c('J♦'), c('J♥')] }
  ],
  ...over
})

// Between deals: the last deal's cards still on the felt, every hand
// face up, and the next dealer choosing.
const between = ({
  dealer,
  dealNumber = 1,
  lastDeal,
  options = ['7-card'],
  variant = '7-card'
}: {
  dealer: string
  dealNumber?: number
  lastDeal?: RummyView['lastDeal']
  options?: string[]
  variant?: string
}): RummyView =>
  view({
    phase: 'choosing',
    dealNumber,
    currentPlayerId: undefined,
    stage: undefined,
    canDrawStock: false,
    canDrawDiscard: false,
    players: dealNumber === 0 ? [seat('alice', []), seat('bob', [])] : [seat('alice', myHand), seat('bob', ['A♠'])],
    melds: dealNumber === 0 ? [] : view().melds,
    choosing: { dealer, options },
    variant,
    lastDeal
  })

const table = (over: Partial<RummyTableProps['table']> = {}): RummyTableProps['table'] => ({
  ended: null,
  selected: [],
  order: 'suit',
  opening: false,
  dealing: false,
  startTable: vi.fn(),
  chooseVariant: vi.fn(),
  leaveTable: vi.fn(),
  playAgain: vi.fn(),
  drawStock: vi.fn(),
  drawDiscard: vi.fn(),
  pass: vi.fn(),
  toggleCard: vi.fn(),
  meldSelected: vi.fn(),
  layOffSelected: vi.fn(),
  discardSelected: vi.fn(),
  knockSelected: vi.fn(),
  setOrder: vi.fn(),
  ...over
})

const mountWith = (v: RummyView, over: Partial<RummyTableProps['table']> = {}, connected = true, away: string[] = []) => {
  const t = table(over)
  const rendered = render(<RummyTable playerId="alice" connected={connected} view={v} table={t} away={away} />)
  return { ...rendered, t }
}

const myHandGroup = () => within(screen.getByRole('group', { name: 'Your hand' }))

describe('RummyTable', () => {
  beforeEach(() => cleanup())

  it('starts only once a second seat is in', () => {
    const solo = mountWith(view({ phase: 'waiting', dealNumber: 0, players: [seat('alice', [])], currentPlayerId: undefined, stage: undefined }))
    expect(screen.getByText('Waiting for a second seat.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Start table' })).toHaveProperty('disabled', true)
    cleanup()
    const pair = mountWith(
      view({ phase: 'waiting', dealNumber: 0, players: [seat('alice', []), seat('bob', [])], currentPlayerId: undefined, stage: undefined })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Start table' }))
    expect(pair.t.startTable).toHaveBeenCalledTimes(1)
    expect(solo.t.startTable).not.toHaveBeenCalled()
  })

  it('on the draw, both piles are the moves and the hand is not', () => {
    const { t } = mountWith(view({ stage: 'draw' }))
    expect(screen.getByText('Draw from the stock, or take the Q♠.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'draw from the stock, 30 left' }))
    fireEvent.click(screen.getByRole('button', { name: 'take Q♠ from the discard pile' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw from the stock' }))
    fireEvent.click(screen.getByRole('button', { name: 'Take Q♠' }))
    expect(t.drawStock).toHaveBeenCalledTimes(2)
    expect(t.drawDiscard).toHaveBeenCalledTimes(2)
    expect(myHandGroup().queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /^Meld/ })).toBeNull()
  })

  it('with the stock out, the discard is the only draw', () => {
    mountWith(view({ stage: 'draw', stockCount: 0, canDrawStock: false }))
    expect(screen.getByText('The stock is out: take the Q♠.')).toBeDefined()
    expect(screen.queryByRole('button', { name: /draw from the stock,/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Draw from the stock' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Take Q♠' })).toHaveProperty('disabled', false)
  })

  it('with the stock out but cards under the discard top, drawing turns the pile over', () => {
    const { t } = mountWith(view({ stage: 'draw', stockCount: 0, canDrawStock: true }))
    expect(screen.getByText('The stock is out: turn the discard pile over to draw, or take the Q♠.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'turn the discard pile over and draw' }))
    fireEvent.click(screen.getByRole('button', { name: 'Turn the discard over' }))
    expect(t.drawStock).toHaveBeenCalledTimes(2)
  })

  it('with no discard top, the hint only offers a draw there is', () => {
    mountWith(view({ stage: 'draw', discardTop: undefined }))
    expect(screen.getByText('Draw from the stock.')).toBeDefined()
    cleanup()
    mountWith(view({ stage: 'draw', discardTop: undefined, stockCount: 0, canDrawStock: false }))
    expect(screen.queryByText('Draw from the stock.')).toBeNull()
    expect(screen.getByText('Nothing left to draw.')).toBeDefined()
  })

  it('off turn, nothing on the table is a button', () => {
    mountWith(view({ currentPlayerId: 'bob', stage: 'draw' }))
    expect(screen.queryByRole('button', { name: /draw from the stock/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /take Q♠/i })).toBeNull()
    expect(myHandGroup().queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('region', { name: 'bob, to draw' })).toBeDefined()
  })

  it('shows your faces and only a count of anyone else’s', () => {
    mountWith(view())
    expect(myHandGroup().getAllByRole('button')).toHaveLength(myHand.length)
    const bobs = within(screen.getByRole('group', { name: "bob's hand" }))
    expect(bobs.getAllByRole('img', { name: 'hand card' }).length).toBeGreaterThan(0)
    expect(bobs.queryByText('K')).toBeNull()
    expect(screen.getByText(/10 in hand/)).toBeDefined()
  })

  it('lays the hand out in the order asked for, and the toggle asks', () => {
    const { t, rerender } = mountWith(view())
    const faces = () => myHandGroup().getAllByRole('button').map(b => b.getAttribute('aria-label')?.split(',')[0])
    expect(faces()).toEqual(['2♠', '7♥', '8♥', '9♥', '7♣', 'K♦'])
    fireEvent.click(screen.getByRole('button', { name: 'by rank' }))
    expect(t.setOrder).toHaveBeenCalledWith('rank')
    rerender(<RummyTable playerId="alice" connected view={view()} table={{ ...t, order: 'rank' }} />)
    expect(faces()).toEqual(['2♠', '7♥', '7♣', '8♥', '9♥', 'K♦'])
    expect(screen.getByRole('button', { name: 'by rank' }).getAttribute('aria-pressed')).toBe('true')
    // The hand's cost, for deciding what to throw.
    expect(screen.getByText('43 pts in hand')).toBeDefined()
  })

  it('a tap picks a card, and three that make a meld arm the meld button', () => {
    const { t, rerender } = mountWith(view())
    fireEvent.click(myHandGroup().getByRole('button', { name: '8♥' }))
    expect(t.toggleCard).toHaveBeenCalledWith(c('8♥'))
    expect(screen.getByRole('button', { name: 'Meld' })).toHaveProperty('disabled', true)
    rerender(<RummyTable playerId="alice" connected view={view()} table={{ ...t, selected: ['9♥', '7♥', '8♥'] }} />)
    const meld = screen.getByRole('button', { name: 'Meld 7♥ 8♥ 9♥' })
    fireEvent.click(meld)
    expect(t.meldSelected).toHaveBeenCalledTimes(1)
    // Three that are not a meld say so rather than arm a refusal.
    rerender(<RummyTable playerId="alice" connected view={view()} table={{ ...t, selected: ['7♥', '7♣', '8♥'] }} />)
    expect(screen.getByRole('button', { name: 'Meld' })).toHaveProperty('disabled', true)
    expect(screen.getByText('Those cards are not a set or a run.')).toBeDefined()
  })

  it('one card picked lights the melds it grows, and a tap on one lays it off there', () => {
    const { t } = mountWith(view(), { selected: ['7♣'] })
    expect(screen.getByText('Tap a lit meld to lay off 7♣, or discard it.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: "lay off 7♣ on 4♣ 5♣ 6♣, bob's" }))
    expect(t.layOffSelected).toHaveBeenCalledWith(0)
    // The jacks are no place for a seven: a picture, not a button.
    expect(screen.getByRole('img', { name: "J♣ J♦ J♥, bob's" })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Discard 7♣' }))
    expect(t.discardSelected).toHaveBeenCalledTimes(1)
  })

  it('marks the hand cards that would grow a meld before any is picked', () => {
    mountWith(view())
    // 7♣ runs on from 4♣ 5♣ 6♣; nothing else fits either meld.
    expect(myHandGroup().getByRole('button', { name: '7♣, fits a meld' })).toBeDefined()
    expect(myHandGroup().getAllByRole('button', { name: /fits a meld/ })).toHaveLength(1)
    // Its twin: off the play stage nothing is marked.
    cleanup()
    mountWith(view({ stage: 'draw' }))
    expect(screen.queryByRole('img', { name: /fits a meld/ })).toBeNull()
    expect(screen.getByRole('img', { name: '7♣' })).toBeDefined()
  })

  it('says who laid each meld', () => {
    mountWith(view({ melds: [{ owner: 'alice', cards: [c('4♣'), c('5♣'), c('6♣')] }, { owner: 'bob', cards: [c('J♣'), c('J♦'), c('J♥')] }] }))
    const melds = within(screen.getByRole('group', { name: 'melds' }))
    expect(melds.getByText('you')).toBeDefined()
    expect(melds.getByText('bob')).toBeDefined()
  })

  it('two cards picked says what makes a move', () => {
    mountWith(view(), { selected: ['7♥', '8♥'] })
    expect(screen.getByText('Pick three or more to meld, or one to lay off or discard.')).toBeDefined()
  })

  it('says whose turn it is when it is not yours', () => {
    mountWith(view({ currentPlayerId: 'bob', stage: 'play' }))
    expect(screen.getByText('Waiting for bob to play.')).toBeDefined()
  })

  it('a move hands focus to the hand, since the button that made it goes', () => {
    const { t } = mountWith(view({ stage: 'draw' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw from the stock' }))
    expect(t.drawStock).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Your hand' }))
    cleanup()
    const laid = mountWith(view(), { selected: ['7♣'] })
    fireEvent.click(screen.getByRole('button', { name: "lay off 7♣ on 4♣ 5♣ 6♣, bob's" }))
    expect(laid.t.layOffSelected).toHaveBeenCalledWith(0)
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Your hand' }))
  })

  it('the card just taken from the discard is marked and cannot be thrown back', () => {
    const v = view({ takenDiscard: c('2♠') })
    mountWith(v, { selected: ['2♠'] })
    expect(myHandGroup().getByRole('button', { name: '2♠, just taken' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Discard 2♠' })).toHaveProperty('disabled', true)
    expect(screen.getByText(/can’t go straight back/)).toBeDefined()
  })

  it('the rule is said before it is broken', () => {
    mountWith(view({ takenDiscard: c('2♠') }))
    expect(screen.getByText('Meld or lay off if you can, then discard — not the 2♠ you just took.')).toBeDefined()
  })

  it('the taken card is the way out when it is all that is left', () => {
    mountWith(view({ takenDiscard: c('2♠'), players: [seat('alice', ['2♠']), seat('bob')] }), { selected: ['2♠'] })
    expect(screen.getByRole('button', { name: 'Discard 2♠' })).toHaveProperty('disabled', false)
  })

  it('offline, nothing is armed', () => {
    mountWith(view(), { selected: ['7♣'] }, false)
    expect(myHandGroup().queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Discard 7♣' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: "lay off 7♣ on 4♣ 5♣ 6♣, bob's" })).toHaveProperty('disabled', true)
  })

  it('says the last move', () => {
    mountWith(view({ currentPlayerId: 'bob', lastMove: { playerId: 'bob', move: 'drawDiscard', cards: [c('3♥')] } }))
    expect(screen.getByText('bob took 3♥')).toBeDefined()
  })

  it('the deal’s end names the winner and what everyone held; the dealer deals on from it', () => {
    const lastDeal = { variant: '7-card', winner: 'bob', points: 43, scores: [{ playerId: 'alice', deadwood: 43 }, { playerId: 'bob', deadwood: 0 }] }
    const { t } = mountWith(between({ lastDeal, dealer: 'alice' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'bob wins the hand' })).toBeDefined()
    expect(dialog.getByText('bob went out and scores 43 points.')).toBeDefined()
    expect(dialog.getByRole('row', { name: 'You 43 pts left' })).toBeDefined()
    expect(dialog.getByRole('row', { name: 'bob wins 43 pts' })).toBeDefined()
    expect(dialog.getByText('Your deal next.')).toBeDefined()
    fireEvent.click(dialog.getByRole('button', { name: 'Deal 7-card rummy' }))
    expect(t.chooseVariant).toHaveBeenCalledWith('7-card')
    fireEvent.click(dialog.getByRole('button', { name: 'See the hands' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    // The deal stays under the hand once the dialog is gone, and the last
    // deal's cards stay on the felt to be read.
    expect(screen.getByRole('button', { name: 'Deal 7-card rummy' })).toBeDefined()
    expect(screen.getByRole('group', { name: 'melds' })).toBeDefined()
    expect(screen.getByText('bob went out and scores 43 points.')).toBeDefined()
  })

  it('at another seat, the deal’s end says who deals next and offers no deal', () => {
    const lastDeal = { variant: '7-card', winner: 'alice', points: 12, scores: [] }
    mountWith(between({ lastDeal, dealer: 'bob' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'You won the hand!' })).toBeDefined()
    expect(dialog.getByText('bob deals next.')).toBeDefined()
    expect(dialog.queryByRole('button', { name: /^Deal/ })).toBeNull()
    fireEvent.click(dialog.getByRole('button', { name: 'See the hands' }))
    expect(screen.getByText('Waiting for bob to deal.')).toBeDefined()
  })

  it('a deal broken up by a leave names nobody', () => {
    mountWith(between({ lastDeal: { variant: '7-card', points: 0, scores: [] }, dealer: 'alice' }))
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'The deal broke up' })).toBeDefined()
  })

  it('before the first deal, the dealer picks the game and nobody else can', () => {
    const { t } = mountWith(between({ dealer: 'alice', dealNumber: 0 }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Your deal: pick the game.')).toBeDefined()
    expect(screen.queryByRole('group', { name: 'melds' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Deal 7-card rummy' }))
    expect(t.chooseVariant).toHaveBeenCalledWith('7-card')
    cleanup()
    mountWith(between({ dealer: 'bob', dealNumber: 0 }))
    expect(screen.getByText('Waiting for bob to deal.')).toBeDefined()
    expect(screen.queryByRole('button', { name: /^Deal/ })).toBeNull()
  })

  it('before any deal, a seat is a name: no card counts, no points, no sorting', () => {
    mountWith(between({ dealer: 'alice', dealNumber: 0 }))
    expect(screen.queryByText(/in hand/)).toBeNull()
    expect(screen.queryByRole('group', { name: 'Sort your hand' })).toBeNull()
    expect(screen.queryByText(/won/)).toBeNull()
  })

  it('a deal asked for is not asked twice', () => {
    mountWith(between({ dealer: 'alice', dealNumber: 0 }), { dealing: true })
    expect(screen.getByRole('button', { name: 'Dealing…' })).toHaveProperty('disabled', true)
  })

  it('between deals every hand is face up, so the felt marks the showdown', () => {
    const { container } = mountWith(between({ dealer: 'bob', lastDeal: { variant: '7-card', winner: 'bob', points: 3, scores: [] } }))
    expect(container.querySelector('[data-showdown]')).not.toBeNull()
    cleanup()
    const live = mountWith(view())
    expect(live.container.querySelector('[data-showdown]')).toBeNull()
  })

  it('the deal’s result is said once, by the sheet, and describes it', () => {
    const lastDeal = { variant: '7-card', winner: 'bob', points: 3, scores: [] }
    mountWith(between({ dealer: 'bob', lastDeal }))
    const dialog = screen.getByRole('dialog')
    expect(screen.getAllByText('bob went out and scores 3 points.')).toHaveLength(1)
    const described = (dialog.getAttribute('aria-describedby') ?? '').split(' ').map(id => document.getElementById(id)?.textContent)
    expect(described).toEqual(['bob went out and scores 3 points.', 'bob deals next.'])
  })

  it('the next deal arriving puts focus on the hand, from the sheet or from under it', () => {
    const lastDeal = { variant: '7-card', winner: 'bob', points: 3, scores: [] }
    const { rerender, t } = mountWith(between({ dealer: 'bob', lastDeal }))
    expect(document.activeElement?.textContent).toBe('See the hands')
    rerender(<RummyTable playerId="alice" connected view={view({ dealNumber: 2, stage: 'draw' })} table={t} away={[]} />)
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Your hand' }))
  })

  it('the dealer going away while the sheet is up puts focus on the deal it now offers', () => {
    const lastDeal = { variant: '7-card', winner: 'bob', points: 3, scores: [] }
    const v = between({ dealer: 'bob', lastDeal })
    const { rerender, t } = mountWith(v)
    expect(document.activeElement?.textContent).toBe('See the hands')
    rerender(<RummyTable playerId="alice" connected view={v} table={t} away={['bob']} />)
    expect(document.activeElement?.textContent).toBe('Deal 7-card rummy')
  })

  it('face up between deals, a seat shows its cards and points, not a count', () => {
    mountWith(between({ dealer: 'alice', lastDeal: { variant: '7-card', winner: 'alice', points: 1, scores: [] } }))
    const bob = screen.getByRole('region', { name: /^bob/ })
    expect(bob.textContent).not.toContain('in hand')
    expect(bob.textContent).toContain('1 pts left')
  })

  it('a dealer coming back while the sheet is up keeps focus in the sheet', () => {
    const lastDeal = { variant: '7-card', winner: 'bob', points: 3, scores: [] }
    const v = between({ dealer: 'bob', lastDeal })
    const { rerender, t } = mountWith(v, {}, true, ['bob'])
    expect(document.activeElement?.textContent).toBe('Deal 7-card rummy')
    rerender(<RummyTable playerId="alice" connected view={v} table={t} away={[]} />)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('a dealer the room shows away lets anyone deal', () => {
    const { t } = mountWith(between({ dealer: 'bob', dealNumber: 0 }), {}, true, ['bob'])
    expect(screen.getByText('bob is away: you can deal.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Deal 7-card rummy' }))
    expect(t.chooseVariant).toHaveBeenCalledWith('7-card')
  })

  it('says which deal is on and what it plays, and the hands each seat has won', () => {
    mountWith(
      view({
        dealNumber: 3,
        standings: [
          { playerId: 'alice', handsWon: 2 },
          { playerId: 'bob', handsWon: 0 }
        ]
      })
    )
    expect(screen.getByText('Deal 3 · 7-card rummy')).toBeDefined()
    expect(screen.getByRole('region', { name: /^alice \(you\)/ }).textContent).toContain('2 won')
    expect(screen.getByRole('region', { name: /^bob/ }).textContent).toContain('0 won')
  })

  it('the dealer picks the game from a list, one Deal button, the last deal’s game first', () => {
    const options = ['7-card', '10-card', 'gin']
    const { t } = mountWith(between({ dealer: 'alice', dealNumber: 0, options }))
    const game = screen.getByRole('combobox', { name: 'Game' })
    expect(
      within(game)
        .getAllByRole('option')
        .map(o => o.textContent)
    ).toEqual(['7-card rummy', '10-card rummy', 'Gin rummy'])
    expect(screen.getAllByRole('button', { name: /^Deal/ })).toHaveLength(1)
    fireEvent.change(game, { target: { value: 'gin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Deal Gin rummy' }))
    expect(t.chooseVariant).toHaveBeenCalledWith('gin')
    cleanup()
    const lastDeal = { variant: '10-card', winner: 'bob', points: 3, scores: [] }
    mountWith(between({ dealer: 'alice', options, variant: '10-card', lastDeal }))
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deal 10-card rummy' })).toBeDefined()
  })

  it('with one game on offer there is nothing to pick', () => {
    mountWith(between({ dealer: 'alice', dealNumber: 0 }))
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Deal 7-card rummy' })).toBeDefined()
  })

  const gin = (over: Partial<RummyView> = {}) => view({ variant: 'gin', melds: [], ...over })

  it('three seats offer two games, and the list is there to pick between them', () => {
    mountWith(between({ dealer: 'alice', dealNumber: 0, options: ['7-card', '10-card'] }))
    expect(within(screen.getByRole('combobox', { name: 'Game' })).getAllByRole('option')).toHaveLength(2)
  })

  it('the list is inside the sheet’s tab loop', () => {
    const lastDeal = { variant: '7-card', winner: 'bob', points: 3, scores: [] }
    mountWith(between({ dealer: 'alice', options: ['7-card', 'gin'], lastDeal }))
    const game = screen.getByRole('combobox', { name: 'Game' })
    expect(document.activeElement?.textContent).toBe('Deal 7-card rummy')
    screen.getByRole('button', { name: 'See the hands' }).focus()
    fireEvent.keyDown(document.activeElement as Element, { key: 'Tab' })
    expect(document.activeElement).toBe(game)
    fireEvent.keyDown(game, { key: 'Tab', shiftKey: true })
    expect(document.activeElement?.textContent).toBe('See the hands')
  })

  it('a game picked for one deal is not the pick for the next', () => {
    const options = ['7-card', '10-card', 'gin']
    const { rerender, t } = mountWith(between({ dealer: 'alice', dealNumber: 0, options }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Game' }), { target: { value: 'gin' } })
    const later = between({ dealer: 'alice', dealNumber: 3, options, variant: '7-card', lastDeal: { variant: '7-card', winner: 'bob', points: 3, scores: [] } })
    rerender(<RummyTable playerId="alice" connected view={later} table={t} away={[]} />)
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deal 7-card rummy' })).toBeDefined()
  })

  it('against a hub that does not say whether the discard can be drawn, it can while there is one', () => {
    mountWith(view({ stage: 'draw', canDrawDiscard: undefined }))
    expect(screen.getByText('Draw from the stock, or take the Q♠.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Take Q♠' })).toHaveProperty('disabled', false)
  })

  it('gin: the upcard is the opener’s to take; the other seat waits', () => {
    mountWith(gin({ stage: 'upcard', currentPlayerId: 'bob', canDrawStock: false }))
    expect(screen.getByText('Waiting for bob to take or pass.')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Take/ })).toBeNull()
  })

  it('gin: a pass hands focus to the hand, since the button goes', () => {
    mountWith(gin({ stage: 'upcard', canDrawStock: false }))
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Your hand' }))
  })

  it('gin: two cards picked says to pick one', () => {
    mountWith(gin(), { selected: ['K♦', '2♠'] })
    expect(screen.getByText('Pick one card to discard or knock with.')).toBeDefined()
  })

  it('gin: the card just taken can no more be knocked on than thrown', () => {
    mountWith(gin({ takenDiscard: c('K♦') }), { selected: ['K♦'] })
    expect(screen.getByRole('button', { name: 'Knock on K♦' })).toHaveProperty('disabled', true)
  })

  it('gin: between deals a seat shows the deadwood the hub reckoned, not its card total', () => {
    const lastDeal = {
      variant: 'gin',
      winner: 'alice',
      points: 9,
      scores: [
        { playerId: 'alice', deadwood: 0 },
        { playerId: 'bob', deadwood: 9 }
      ],
      gin: { ending: 'knock' as const, knocker: 'alice', hands: [], laidOff: [] }
    }
    mountWith(between({ dealer: 'bob', variant: 'gin', lastDeal }))
    expect(screen.getByRole('region', { name: /^bob/ }).textContent).toContain('9 pts left')
  })

  it('gin: the upcard is taken or passed, and the stock waits', () => {
    const { t } = mountWith(gin({ stage: 'upcard', canDrawStock: false }))
    expect(screen.getByText('Take the Q♠, or pass.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Take Q♠' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    expect(t.drawDiscard).toHaveBeenCalledTimes(1)
    expect(t.pass).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /draw from the stock,/ })).toBeNull()
    expect(screen.getByRole('region', { name: /^alice \(you\), to take or pass/ })).toBeDefined()
  })

  it('gin: an upcard passed by both leaves only the stock', () => {
    mountWith(gin({ stage: 'draw', canDrawDiscard: false }))
    expect(screen.getByText('The upcard was passed: draw from the stock.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Take Q♠' })).toHaveProperty('disabled', true)
    expect(screen.queryByRole('button', { name: /take Q♠ from the discard pile/ })).toBeNull()
  })

  it('gin: no melding, and a knock is armed only by a throw that leaves ten or less', () => {
    // 7-8-9♥ melds; K♦ 7♣ 2♠ are 19 over.
    const knocking = mountWith(gin(), { selected: ['K♦'] })
    expect(screen.queryByRole('button', { name: /^Meld/ })).toBeNull()
    expect(screen.queryByRole('group', { name: 'melds' })).toBeNull()
    expect(screen.getByText('19 deadwood')).toBeDefined()
    expect(screen.getByText('Throwing K♦ leaves 9 deadwood: you can knock.')).toBeDefined()
    // An armed knock is the move to make: it leads, the discard follows.
    expect(screen.getByRole('button', { name: 'Knock on K♦' }).className).toContain('primary')
    expect(screen.getByRole('button', { name: 'Discard K♦' }).className).toContain('secondary')
    fireEvent.click(screen.getByRole('button', { name: 'Knock on K♦' }))
    expect(knocking.t.knockSelected).toHaveBeenCalledTimes(1)
    cleanup()
    mountWith(gin(), { selected: ['2♠'] })
    expect(screen.getByText('Throwing 2♠ leaves 17 deadwood.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Knock on 2♠' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Discard 2♠' }).className).toContain('primary')
  })

  it('gin: the deal’s end lays out both hands as the hub arranged them', () => {
    const lastDeal = {
      variant: 'gin',
      winner: 'bob',
      points: 14,
      scores: [
        { playerId: 'alice', deadwood: 17 },
        { playerId: 'bob', deadwood: 3 }
      ],
      gin: {
        ending: 'knock' as const,
        knocker: 'bob',
        hands: [
          { playerId: 'alice', melds: [[c('7♥'), c('8♥'), c('9♥')]], deadwood: [c('7♣'), c('K♦')] },
          { playerId: 'bob', melds: [[c('A♠'), c('2♠'), c('3♠')], [c('Q♣'), c('Q♦'), c('Q♥')]], deadwood: [c('3♦')] }
        ],
        laidOff: [c('4♠')]
      }
    }
    mountWith(between({ dealer: 'alice', variant: 'gin', options: ['7-card', 'gin'], lastDeal }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('bob knocked and scores 14 points.')).toBeDefined()
    expect(dialog.getByRole('row', { name: 'You 7♥ 8♥ 9♥ 7♣ K♦ · 17' })).toBeDefined()
    expect(dialog.getByRole('row', { name: 'bob A♠ 2♠ 3♠ Q♣ Q♦ Q♥ 3♦ · 3' })).toBeDefined()
    expect(dialog.getByText('You laid off 4♠.')).toBeDefined()
  })


  it('the discard pile lies spread, every card face up', () => {
    mountWith(view({ currentPlayerId: 'bob', discardPile: [c('4♦'), c('9♣'), c('Q♠')] }))
    const pile = within(screen.getByRole('group', { name: 'discard pile' }))
    expect(pile.getAllByRole('img').map(card => card.getAttribute('aria-label'))).toEqual([
      '4♦ in the discard pile',
      '9♣ in the discard pile',
      'Q♠ on the discard pile'
    ])
  })

  it('on the draw, the pile can be taken down to any card the seat could then play', () => {
    const { t } = mountWith(view({ stage: 'draw', discardPile: [c('4♦'), c('9♣'), c('Q♠')], discardTakeable: [c('9♣'), c('Q♠')] }))
    expect(screen.getByText('Draw from the stock, take the Q♠, or take the pile down to a lit card.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'take the pile down to 9♣' }))
    expect(t.drawDiscard).toHaveBeenCalledWith(c('9♣'))
    // A card it could not play is no offer.
    expect(screen.queryByRole('button', { name: /down to 4♦/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'take Q♠ from the discard pile' }))
    expect(t.drawDiscard).toHaveBeenLastCalledWith()
  })

  it('the card taken down to is owed: marked in hand, and no discard until it is played', () => {
    mountWith(view({ mustPlay: c('9♥') }), { selected: ['K♦'] })
    expect(screen.getByText('Play the 9♥ you took the pile down to — meld it or lay it off — before you discard.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Discard K♦' })).toHaveProperty('disabled', true)
    expect(myHandGroup().getByRole('button', { name: /^9♥, must be played/ })).toBeDefined()
  })

  it('owing a card, a barred discard is blamed on the debt, not on a take', () => {
    mountWith(view({ mustPlay: c('9♥') }), { selected: ['K♦'] })
    expect(screen.queryByText(/can’t go straight back/)).toBeNull()
  })

  it('owing a card, laying off and melding still say what they would do', () => {
    mountWith(view({ mustPlay: c('9♥') }), { selected: ['7♣'] })
    expect(screen.getByText('Tap a lit meld to lay off 7♣.')).toBeDefined()
    cleanup()
    mountWith(view({ mustPlay: c('9♥') }), { selected: ['K♦', '7♣', '2♠'] })
    expect(screen.getByText('Those cards are not a set or a run.')).toBeDefined()
  })

  it('with the stock out, the lit cards are still offered', () => {
    mountWith(view({ stage: 'draw', stockCount: 0, canDrawStock: false, discardPile: [c('4♦'), c('9♣'), c('Q♠')], discardTakeable: [c('9♣'), c('Q♠')] }))
    expect(screen.getByText('The stock is out: take the Q♠, or take the pile down to a lit card.')).toBeDefined()
  })

  it('a long pile opens on its top card, scrolled to the end', () => {
    const scrolled: number[] = []
    const width = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(900)
    const left = vi.spyOn(HTMLElement.prototype, 'scrollLeft', 'set').mockImplementation(value => {
      scrolled.push(value)
    })
    try {
      const pile = ['2♦', '3♦', '4♦', '5♦', '6♦', '7♦', '8♦', '9♦', '10♦', 'J♦', 'Q♦', 'K♦', '2♥', '3♥', '4♥', '5♥', '6♥', '7♥', '8♥', 'Q♠'].map(c)
      mountWith(view({ currentPlayerId: 'bob', discardPile: pile, discardCount: pile.length }))
      expect(scrolled).toContain(900)
    } finally {
      width.mockRestore()
      left.mockRestore()
    }
  })

  it('gin keeps the pile squared: only its top shows, and only it is taken', () => {
    mountWith(view({ variant: 'gin', melds: [], stage: 'draw', discardPile: [c('4♦'), c('Q♠')], discardTakeable: [] }))
    expect(screen.queryByRole('img', { name: '4♦ in the discard pile' })).toBeNull()
    expect(screen.getByRole('button', { name: 'take Q♠ from the discard pile' })).toBeDefined()
  })

  it('keeps score on a notepad: a line a deal, the winner’s column scored, totals under', () => {
    mountWith(
      view({
        dealNumber: 3,
        standings: [
          { playerId: 'alice', handsWon: 1, points: 12 },
          { playerId: 'bob', handsWon: 1, points: 43 }
        ],
        scoreSheet: [
          { variant: '7-card', winner: 'bob', points: 43 },
          { variant: 'gin', points: 0 },
          { variant: '7-card', winner: 'alice', points: 12 }
        ]
      })
    )
    const sheet = within(screen.getByRole('table', { name: 'Score sheet' }))
    const rows = sheet.getAllByRole('row').map(row => row.textContent)
    expect(rows).toEqual(['#youbob', '1—43', '2draw', '312—', 'Total1243'])
  })

  it('the notepad is the score sheet, not a landmark, and an empty cell says nothing', () => {
    mountWith(view({ scoreSheet: [{ variant: '7-card', winner: 'bob', points: 43 }] }))
    expect(screen.queryByRole('complementary')).toBeNull()
    const sheet = within(screen.getByRole('table', { name: 'Score sheet' }))
    expect(sheet.getAllByRole('cell').map(cell => cell.textContent)).toContain('—')
    expect(screen.getByText('—').getAttribute('aria-hidden')).toBe('true')
  })

  it('the notepad keeps the last five deals on its page, and totals them all', () => {
    const scoreSheet = [1, 2, 3, 4, 5, 6, 7].map(points => ({ variant: '7-card', winner: 'bob', points }))
    mountWith(view({ dealNumber: 7, scoreSheet }))
    const rows = within(screen.getByRole('table', { name: 'Score sheet' }))
      .getAllByRole('row')
      .map(row => row.textContent)
    expect(rows).toEqual(['#youbob', '3—3', '4—4', '5—5', '6—6', '7—7', 'Total028'])
  })

  it('no notepad before the first deal', () => {
    mountWith(between({ dealer: 'alice', dealNumber: 0 }))
    expect(screen.queryByRole('table', { name: 'Score sheet' })).toBeNull()
  })

  it('the table’s end is the hands each seat won, then another table or the room', () => {
    const ended = { standings: [{ playerId: 'alice', handsWon: 2 }], dealsPlayed: 3 }
    const { t } = mountWith(view({ phase: 'ended', currentPlayerId: undefined, stage: undefined, players: [seat('alice', myHand)] }), { ended })
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'The table closed' })).toBeDefined()
    expect(dialog.getByText('You won 2 of 3 hands.')).toBeDefined()
    fireEvent.click(dialog.getByRole('button', { name: 'Play again' }))
    expect(t.playAgain).toHaveBeenCalledTimes(1)
    fireEvent.click(dialog.getByRole('button', { name: 'See the final hands' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Back to the room' })).toBeDefined()
  })
})
