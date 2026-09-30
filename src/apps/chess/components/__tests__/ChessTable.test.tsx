import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChessTable from '../ChessTable'
import type { ChessTableProps } from '../ChessTable'
import type { ChessView } from '../../wire'

// The board from one chair, over a fake hook: what a tap on a square
// offers and sends, the clock running down, and the table's ending.

// White Kg6 Pe7 against Kh8, alice White and on turn.
const view = (over: Partial<ChessView> = {}): ChessView => ({
  gameId: 'G1',
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
  legalMoves: ['e7e8b', 'e7e8n', 'e7e8q', 'e7e8r', 'g6f5', 'g6f6', 'g6f7', 'g6g5', 'g6h5', 'g6h6'],
  clock: { whiteMs: 180_000, blackMs: 175_000, initialMs: 180_000, incrementMs: 2_000 },
  ...over
})

const table = (over: Partial<ChessTableProps['table']> = {}): ChessTableProps['table'] => ({
  ended: null,
  opening: false,
  startTable: vi.fn(),
  leaveTable: vi.fn(),
  playAgain: vi.fn(),
  play: vi.fn(),
  resign: vi.fn(),
  ...over
})

const mountWith = (v: ChessView, over: Partial<ChessTableProps['table']> = {}, playerId = 'alice') => {
  const t = table(over)
  const rendered = render(<ChessTable playerId={playerId} connected={true} view={v} table={t} />)
  return { ...rendered, t }
}

const square = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}\\b`) })

describe('ChessTable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets the board from the FEN with the viewer’s side at the bottom', () => {
    mountWith(view())
    const board = screen.getByRole('group', { name: 'board' })
    const cells = within(board).getAllByRole('button')
    expect(cells).toHaveLength(64)
    expect(cells[0]).toHaveAccessibleName('a8')
    expect(cells[63]).toHaveAccessibleName('h1')
    expect(square('h8')).toHaveAccessibleName('h8, black king')
    expect(square('e7')).toHaveAccessibleName('e7, white pawn')
  })

  it('turns the board for Black', () => {
    mountWith(view(), {}, 'bob')
    const cells = within(screen.getByRole('group', { name: 'board' })).getAllByRole('button')
    expect(cells[0]).toHaveAccessibleName('h1')
    expect(cells[63]).toHaveAccessibleName('a8')
  })

  it('a tap on a piece offers its moves, and a tap on one plays it', () => {
    const { t } = mountWith(view())
    fireEvent.click(square('g6'))
    expect(square('g6')).toHaveAttribute('aria-pressed', 'true')
    expect(square('f7')).toHaveAccessibleDescription('a move')
    expect(square('e6')).not.toHaveAccessibleDescription('a move')
    fireEvent.click(square('f7'))
    expect(t.play).toHaveBeenCalledWith('g6f7')
  })

  it('a tap on a square no move reaches lets the piece go and plays nothing', () => {
    const { t } = mountWith(view())
    fireEvent.click(square('g6'))
    fireEvent.click(square('a1'))
    expect(t.play).not.toHaveBeenCalled()
    expect(square('g6')).toHaveAttribute('aria-pressed', 'false')
  })

  it('a promotion asks which piece', () => {
    const { t } = mountWith(view())
    fireEvent.click(square('e7'))
    fireEvent.click(square('e8'))
    expect(t.play).not.toHaveBeenCalled()
    const picker = screen.getByRole('group', { name: 'promote to' })
    fireEvent.click(within(picker).getByRole('button', { name: 'Knight' }))
    expect(t.play).toHaveBeenCalledWith('e7e8n')
  })

  // The legal moves are the side to move's, and every seat sees them: off
  // turn, the other side's listed moves are not the viewer's to play.
  it('off turn, the listed moves are not the viewer’s to play', () => {
    const { t } = mountWith(view(), {}, 'bob')
    fireEvent.click(square('g6'))
    expect(square('g6')).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(square('f7'))
    expect(t.play).not.toHaveBeenCalled()
  })

  it('marks the last move and a king in check', () => {
    mountWith(view({ moves: ['e7e8q'], fen: '4Q2k/8/6K1/8/8/8/8/8 b - - 0 1', sideToMove: 'black', currentPlayerId: 'bob', inCheck: true, legalMoves: [] }))
    expect(square('e7').dataset.last).toBe('true')
    expect(square('e8').dataset.last).toBe('true')
    expect(square('h8').dataset.check).toBe('true')
    expect(square('g6').dataset.check).toBeUndefined()
  })

  it('runs the side to move’s clock down from the view, and only that one', () => {
    mountWith(view())
    expect(screen.getByRole('timer', { name: 'alice’s clock' })).toHaveTextContent('3:00')
    expect(screen.getByRole('timer', { name: 'bob’s clock' })).toHaveTextContent('2:55')
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getByRole('timer', { name: 'alice’s clock' })).toHaveTextContent('2:55')
    expect(screen.getByRole('timer', { name: 'bob’s clock' })).toHaveTextContent('2:55')
  })

  it('a finished game’s clocks stand still', () => {
    mountWith(view({ phase: 'ended', currentPlayerId: undefined, sideToMove: undefined, legalMoves: [], result: { ending: 'resignation', winner: 'bob', winnerColor: 'black' } }))
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getByRole('timer', { name: 'alice’s clock' })).toHaveTextContent('3:00')
  })

  it('resigning takes a second tap', () => {
    const { t } = mountWith(view())
    fireEvent.click(screen.getByRole('button', { name: 'Resign' }))
    expect(t.resign).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm resign' }))
    expect(t.resign).toHaveBeenCalledTimes(1)
  })

  it('a waiting table starts with the clock chosen', () => {
    const { t } = mountWith(view({ phase: 'waiting', players: [{ playerId: 'alice' }, { playerId: 'bob' }], fen: undefined, legalMoves: [], clock: undefined, sideToMove: undefined, currentPlayerId: undefined }))
    expect(screen.queryByRole('group', { name: 'board' })).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: 'Clock' }), { target: { value: '5+3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(t.startTable).toHaveBeenCalledWith({ initialSeconds: 300, incrementSeconds: 3 })
  })

  it('a waiting table of one cannot start', () => {
    mountWith(view({ phase: 'waiting', players: [{ playerId: 'alice' }], fen: undefined, legalMoves: [], clock: undefined }))
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
  })

  it('an ended table says who won and offers another', () => {
    const ended = view({ phase: 'ended', currentPlayerId: undefined, sideToMove: undefined, legalMoves: [], result: { ending: 'checkmate', winner: 'alice', winnerColor: 'white' } })
    const { t } = mountWith(ended, { ended: ended.result })
    expect(screen.getByText('You won by checkmate')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resign' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(t.playAgain).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
    expect(t.leaveTable).toHaveBeenCalledTimes(1)
  })
})
