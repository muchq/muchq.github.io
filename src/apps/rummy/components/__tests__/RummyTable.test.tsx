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
  variant: 'basic',
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
const between = ({ dealer, dealNumber = 1, lastDeal }: { dealer: string; dealNumber?: number; lastDeal?: RummyView['lastDeal'] }): RummyView =>
  view({
    phase: 'choosing',
    dealNumber,
    currentPlayerId: undefined,
    stage: undefined,
    canDrawStock: false,
    players: dealNumber === 0 ? [seat('alice', []), seat('bob', [])] : [seat('alice', myHand), seat('bob', ['A♠'])],
    melds: dealNumber === 0 ? [] : view().melds,
    choosing: { dealer, options: ['basic'] },
    lastDeal
  })

const table = (over: Partial<RummyTableProps['table']> = {}): RummyTableProps['table'] => ({
  ended: null,
  selected: [],
  order: 'suit',
  opening: false,
  startTable: vi.fn(),
  chooseVariant: vi.fn(),
  leaveTable: vi.fn(),
  playAgain: vi.fn(),
  drawStock: vi.fn(),
  drawDiscard: vi.fn(),
  toggleCard: vi.fn(),
  meldSelected: vi.fn(),
  layOffSelected: vi.fn(),
  discardSelected: vi.fn(),
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
    const lastDeal = { variant: 'basic', winner: 'bob', points: 43, scores: [{ playerId: 'alice', deadwood: 43 }, { playerId: 'bob', deadwood: 0 }] }
    const { t } = mountWith(between({ lastDeal, dealer: 'alice' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'bob wins the hand' })).toBeDefined()
    expect(dialog.getByText('bob went out and scores 43 points.')).toBeDefined()
    expect(dialog.getByRole('row', { name: 'You 43 pts left' })).toBeDefined()
    expect(dialog.getByRole('row', { name: 'bob wins 43 pts' })).toBeDefined()
    expect(dialog.getByText('Your deal next.')).toBeDefined()
    fireEvent.click(dialog.getByRole('button', { name: 'Deal Basic rummy' }))
    expect(t.chooseVariant).toHaveBeenCalledWith('basic')
    fireEvent.click(dialog.getByRole('button', { name: 'See the hands' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    // The deal stays under the hand once the dialog is gone, and the last
    // deal's cards stay on the felt to be read.
    expect(screen.getByRole('button', { name: 'Deal Basic rummy' })).toBeDefined()
    expect(screen.getByRole('group', { name: 'melds' })).toBeDefined()
    expect(screen.getByText('bob went out and scores 43 points.')).toBeDefined()
  })

  it('at another seat, the deal’s end says who deals next and offers no deal', () => {
    const lastDeal = { variant: 'basic', winner: 'alice', points: 12, scores: [] }
    mountWith(between({ lastDeal, dealer: 'bob' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'You won the hand!' })).toBeDefined()
    expect(dialog.getByText('bob deals next.')).toBeDefined()
    expect(dialog.queryByRole('button', { name: /^Deal/ })).toBeNull()
    fireEvent.click(dialog.getByRole('button', { name: 'See the hands' }))
    expect(screen.getByText('Waiting for bob to deal.')).toBeDefined()
  })

  it('a deal broken up by a leave names nobody', () => {
    mountWith(between({ lastDeal: { variant: 'basic', points: 0, scores: [] }, dealer: 'alice' }))
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'The deal broke up' })).toBeDefined()
  })

  it('before the first deal, the dealer picks the game and nobody else can', () => {
    const { t } = mountWith(between({ dealer: 'alice', dealNumber: 0 }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Your deal: pick the game.')).toBeDefined()
    expect(screen.queryByRole('group', { name: 'melds' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Deal Basic rummy' }))
    expect(t.chooseVariant).toHaveBeenCalledWith('basic')
    cleanup()
    mountWith(between({ dealer: 'bob', dealNumber: 0 }))
    expect(screen.getByText('Waiting for bob to deal.')).toBeDefined()
    expect(screen.queryByRole('button', { name: /^Deal/ })).toBeNull()
  })

  it('a dealer the room shows away lets anyone deal', () => {
    const { t } = mountWith(between({ dealer: 'bob', dealNumber: 0 }), {}, true, ['bob'])
    expect(screen.getByText('bob is away: you can deal.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Deal Basic rummy' }))
    expect(t.chooseVariant).toHaveBeenCalledWith('basic')
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
    expect(screen.getByText('Deal 3 · Basic rummy')).toBeDefined()
    expect(screen.getByRole('region', { name: /^alice \(you\)/ }).textContent).toContain('2 won')
    expect(screen.getByRole('region', { name: /^bob/ }).textContent).toContain('0 won')
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
