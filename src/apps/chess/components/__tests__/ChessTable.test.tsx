import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChessTable from '../ChessTable'
import type { ChessTableProps } from '../ChessTable'
import type { ChessView } from '../../wire'

// The board from one chair, over a fake hook: what a tap on a square
// offers and sends, what the table says and where focus goes, the clock
// running down, and the table's ending.

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

const ended = (over: Partial<ChessView> = {}): ChessView =>
  view({
    phase: 'ended',
    currentPlayerId: undefined,
    sideToMove: undefined,
    legalMoves: [],
    result: { ending: 'checkmate', winner: 'alice', winnerColor: 'white' },
    ...over
  })

const waiting = (over: Partial<ChessView> = {}): ChessView =>
  view({
    phase: 'waiting',
    players: [{ playerId: 'alice' }, { playerId: 'bob' }],
    fen: undefined,
    legalMoves: [],
    clock: undefined,
    sideToMove: undefined,
    currentPlayerId: undefined,
    ...over
  })

const table = (over: Partial<ChessTableProps['table']> = {}): ChessTableProps['table'] => ({
  opening: false,
  startTable: vi.fn(),
  leaveTable: vi.fn(),
  playAgain: vi.fn(),
  play: vi.fn(),
  resign: vi.fn(),
  ...over
})

const mountWith = (v: ChessView, over: Partial<ChessTableProps['table']> = {}, playerId = 'alice', connected = true) => {
  const t = table(over)
  const rendered = render(<ChessTable playerId={playerId} connected={connected} view={v} table={t} />)
  const rerender = (next: ChessView) => rendered.rerender(<ChessTable playerId={playerId} connected={connected} view={next} table={t} />)
  return { ...rendered, rerender, t }
}

const square = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}\\b`) })
const status = () => screen.getByTestId('chess-status')

describe('ChessTable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('the board', () => {
    it('is set from the FEN with the viewer’s side at the bottom', () => {
      mountWith(view())
      const cells = within(screen.getByRole('group', { name: 'board' })).getAllByRole('button')
      expect(cells).toHaveLength(64)
      expect(cells[0]).toHaveAccessibleName('a8')
      expect(cells[63]).toHaveAccessibleName('h1')
      expect(square('h8')).toHaveAccessibleName('h8, black king')
      expect(square('e7')).toHaveAccessibleName('e7, white pawn')
    })

    it('turns for Black', () => {
      mountWith(view(), {}, 'bob')
      const cells = within(screen.getByRole('group', { name: 'board' })).getAllByRole('button')
      expect(cells[0]).toHaveAccessibleName('h1')
      expect(cells[63]).toHaveAccessibleName('a8')
    })

    it('marks its edges with the files and ranks, from the viewer’s side', () => {
      const { unmount } = mountWith(view())
      const board = screen.getByRole('group', { name: 'board' })
      expect(within(board).getAllByTestId('coordinate').map(c => c.textContent)).toEqual(['8', '7', '6', '5', '4', '3', '2', '1', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
      unmount()
      mountWith(view(), {}, 'bob')
      const flipped = screen.getByRole('group', { name: 'board' })
      expect(within(flipped).getAllByTestId('coordinate').map(c => c.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'])
    })

    it('reads as a toggle only on the viewer’s own pieces', () => {
      mountWith(view())
      expect(square('g6')).toHaveAttribute('aria-pressed', 'false')
      expect(square('h8')).not.toHaveAttribute('aria-pressed')
      expect(square('a1')).not.toHaveAttribute('aria-pressed')
    })

    it('marks the last move and a king in check', () => {
      mountWith(view({ moves: ['e7e8q'], fen: '4Q2k/8/6K1/8/8/8/8/8 b - - 0 1', sideToMove: 'black', currentPlayerId: 'bob', inCheck: true, legalMoves: [] }))
      expect(square('e7').dataset.last).toBe('true')
      expect(square('e8').dataset.last).toBe('true')
      expect(square('h8').dataset.check).toBe('true')
      expect(square('g6').dataset.check).toBeUndefined()
    })
  })

  describe('moving', () => {
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

    // The legal moves are the side to move's, and every seat sees them: off
    // turn, the other side's listed moves are not the viewer's to play.
    it('off turn, the listed moves are not the viewer’s to play', () => {
      const { t } = mountWith(view(), {}, 'bob')
      fireEvent.click(square('g6'))
      expect(square('g6')).not.toHaveAttribute('aria-pressed')
      fireEvent.click(square('f7'))
      expect(t.play).not.toHaveBeenCalled()
    })

    it('off the hub, the board takes no taps', () => {
      const { t } = mountWith(view(), {}, 'alice', false)
      fireEvent.click(square('g6'))
      fireEvent.click(square('f7'))
      expect(t.play).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Resign' })).toBeDisabled()
    })

    it('a promotion asks which piece, with the question said and the queen in focus', () => {
      const { t } = mountWith(view())
      fireEvent.click(square('e7'))
      fireEvent.click(square('e8'))
      expect(t.play).not.toHaveBeenCalled()
      const picker = screen.getByRole('group', { name: 'promote to' })
      expect(within(picker).getByRole('button', { name: 'Queen' })).toHaveFocus()
      expect(status()).toHaveTextContent('Choose a piece to promote to.')
      fireEvent.click(within(picker).getByRole('button', { name: 'Knight' }))
      expect(t.play).toHaveBeenCalledWith('e7e8n')
      expect(screen.queryByRole('group', { name: 'promote to' })).toBeNull()
    })

    it('a promotion cancelled plays nothing and hands focus back to the pawn', () => {
      const { t } = mountWith(view())
      fireEvent.click(square('e7'))
      fireEvent.click(square('e8'))
      fireEvent.keyDown(screen.getByRole('group', { name: 'promote to' }), { key: 'Escape' })
      expect(screen.queryByRole('group', { name: 'promote to' })).toBeNull()
      expect(square('e7')).toHaveFocus()
      fireEvent.click(square('e7'))
      fireEvent.click(square('e8'))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('group', { name: 'promote to' })).toBeNull()
      expect(t.play).not.toHaveBeenCalled()
    })

    // A move made on the board instead abandons the promotion: the picker
    // must not linger to send a second move for the same turn.
    it('another move on the board drops a pending promotion', () => {
      const { t } = mountWith(view())
      fireEvent.click(square('e7'))
      fireEvent.click(square('e8'))
      fireEvent.click(square('g6'))
      expect(screen.queryByRole('group', { name: 'promote to' })).toBeNull()
      fireEvent.click(square('f7'))
      expect(vi.mocked(t.play).mock.calls).toEqual([['g6f7']])
    })

    it('a new position drops a piece picked up and a promotion pending', () => {
      const { rerender } = mountWith(view())
      fireEvent.click(square('g6'))
      rerender(view())
      expect(square('g6')).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(square('e7'))
      fireEvent.click(square('e8'))
      rerender(view())
      expect(screen.queryByRole('group', { name: 'promote to' })).toBeNull()
    })
  })

  describe('what the table says', () => {
    it('names the opponent’s last move before the viewer’s turn', () => {
      mountWith(view({ moves: ['a1a2', 'h7h8'] }))
      expect(status()).toHaveTextContent('bob played h7 to h8. Your move.')
    })

    it('says check, and whose move it is off turn', () => {
      const { unmount } = mountWith(view({ inCheck: true }))
      expect(status()).toHaveTextContent('Check. Your move.')
      unmount()
      mountWith(view({ moves: ['a2a3'] }), {}, 'bob')
      expect(status()).toHaveTextContent('alice to move.')
    })

    it('says a promotion by its piece', () => {
      mountWith(view({ moves: ['a1a2', 'b2b1q'] }))
      expect(status()).toHaveTextContent('bob played b2 to b1, promoting to a queen. Your move.')
    })
  })

  describe('the clock', () => {
    it('runs the side to move’s down from the view, and only that one', () => {
      mountWith(view())
      expect(screen.getByRole('timer', { name: 'alice’s clock' })).toHaveTextContent('3:00')
      expect(screen.getByRole('timer', { name: 'bob’s clock' })).toHaveTextContent('2:55')
      act(() => {
        vi.advanceTimersByTime(5_000)
      })
      expect(screen.getByRole('timer', { name: 'alice’s clock' })).toHaveTextContent('2:55')
      expect(screen.getByRole('timer', { name: 'bob’s clock' })).toHaveTextContent('2:55')
    })

    it('starts again from each new view, on whichever side it names', () => {
      const { rerender } = mountWith(view())
      act(() => {
        vi.advanceTimersByTime(5_000)
      })
      rerender(view({ sideToMove: 'black', currentPlayerId: 'bob', moves: ['g6f7'], clock: { whiteMs: 177_000, blackMs: 170_000, initialMs: 180_000, incrementMs: 2_000 } }))
      expect(screen.getByRole('timer', { name: 'bob’s clock' })).toHaveTextContent('2:50')
      act(() => {
        vi.advanceTimersByTime(3_000)
      })
      expect(screen.getByRole('timer', { name: 'bob’s clock' })).toHaveTextContent('2:47')
      expect(screen.getByRole('timer', { name: 'alice’s clock' })).toHaveTextContent('2:57')
    })

    it('stands still once the game is over', () => {
      mountWith(ended({ result: { ending: 'resignation', winner: 'bob', winnerColor: 'black' } }))
      act(() => {
        vi.advanceTimersByTime(5_000)
      })
      expect(screen.getByRole('timer', { name: 'alice’s clock' })).toHaveTextContent('3:00')
    })
  })

  describe('resigning and leaving', () => {
    it('resigning takes a second tap, and that tap is where focus goes', () => {
      const { t } = mountWith(view())
      fireEvent.click(screen.getByRole('button', { name: 'Resign' }))
      expect(t.resign).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Confirm resign' })).toHaveFocus()
      fireEvent.click(screen.getByRole('button', { name: 'Confirm resign' }))
      expect(t.resign).toHaveBeenCalledTimes(1)
    })

    it('thinking better of it hands focus back to Resign', () => {
      const { t } = mountWith(view())
      fireEvent.click(screen.getByRole('button', { name: 'Resign' }))
      fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
      expect(screen.getByRole('button', { name: 'Resign' })).toHaveFocus()
      expect(t.resign).not.toHaveBeenCalled()
    })

    it('a new position drops a resignation half made', () => {
      const { rerender } = mountWith(view())
      fireEvent.click(screen.getByRole('button', { name: 'Resign' }))
      rerender(view())
      expect(screen.queryByRole('button', { name: 'Confirm resign' })).toBeNull()
    })

    // Leaving mid-game forfeits it: resigning is the one way to do that,
    // and it asks first.
    it('offers no one-tap leave while the game is on, only while waiting', () => {
      const { unmount } = mountWith(view())
      expect(screen.queryByRole('button', { name: 'Leave table' })).toBeNull()
      unmount()
      const { t } = mountWith(waiting())
      fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
      expect(t.leaveTable).toHaveBeenCalledTimes(1)
    })
  })

  describe('waiting', () => {
    it('starts with the clock chosen', () => {
      const { t } = mountWith(waiting())
      expect(screen.queryByRole('group', { name: 'board' })).toBeNull()
      fireEvent.change(screen.getByRole('combobox', { name: 'Clock' }), { target: { value: '5+3' } })
      fireEvent.click(screen.getByRole('button', { name: 'Start' }))
      expect(t.startTable).toHaveBeenCalledWith({ initialSeconds: 300, incrementSeconds: 3 })
    })

    it('cannot start with one seat, or off the hub', () => {
      const { unmount } = mountWith(waiting({ players: [{ playerId: 'alice' }] }))
      expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
      unmount()
      mountWith(waiting(), {}, 'alice', false)
      expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    })
  })

  describe('the ending', () => {
    it('is said, and focus goes to another game', () => {
      const { t, rerender } = mountWith(view())
      rerender(ended())
      expect(status()).toHaveTextContent('You won by checkmate')
      expect(screen.queryByRole('button', { name: 'Resign' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Play again' })).toHaveFocus()
      fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
      expect(t.playAgain).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
      expect(t.leaveTable).toHaveBeenCalledTimes(1)
    })

    it('holds Play again while another table is opening', () => {
      mountWith(ended(), { opening: true })
      expect(screen.getByRole('button', { name: 'Opening…' })).toBeDisabled()
    })
  })
})
