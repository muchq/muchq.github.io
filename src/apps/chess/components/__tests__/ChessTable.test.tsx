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

    // a1 is dark, as on every board; so is h8, and d1 and e4 are light.
    it('colors the squares as a chessboard is colored', () => {
      mountWith(view())
      expect(square('a1').dataset.shade).toBe('dark')
      expect(square('h8').dataset.shade).toBe('dark')
      expect(square('d1').dataset.shade).toBe('light')
      expect(square('e4').dataset.shade).toBe('light')
    })

    it('marks the squares inert off turn, and still focusable', () => {
      const { unmount } = mountWith(view())
      expect(square('g6')).not.toHaveAttribute('aria-disabled', 'true')
      unmount()
      mountWith(view(), {}, 'bob')
      expect(square('g6')).toHaveAttribute('aria-disabled', 'true')
      expect(square('g6')).not.toBeDisabled()
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

    it('a promotion asking shows the pawn on the last rank, the picker over it, and puts it back on cancel', () => {
      mountWith(view())
      fireEvent.click(square('e7'))
      fireEvent.click(square('e8'))
      expect(square('e7')).toHaveAccessibleName('e7')
      expect(square('e8')).toHaveAccessibleName('e8, white pawn')
      const picker = screen.getByRole('group', { name: 'promote to' })
      // on the board, down the e-file: the fifth column from the left
      expect(screen.getByRole('group', { name: 'board' })).toContainElement(picker)
      expect(within(picker).getByRole('list')).toHaveStyle({ left: '50%' })
      expect(within(picker).getAllByRole('button').map(b => b.getAttribute('aria-label'))).toEqual(['Queen', 'Rook', 'Bishop', 'Knight', 'Cancel'])
      fireEvent.click(within(picker).getByRole('button', { name: 'Cancel' }))
      expect(square('e7')).toHaveAccessibleName('e7, white pawn')
      expect(square('e8')).toHaveAccessibleName('e8')
    })

    it('for Black, the picker stands on the promotion file as Black sees it', () => {
      // Black Pe2 against Kh1, bob on turn: e is the fourth column from Black's left.
      mountWith(
        view({
          fen: '7k/8/8/8/8/8/4p3/7K b - - 0 1',
          sideToMove: 'black',
          currentPlayerId: 'bob',
          legalMoves: ['e2e1b', 'e2e1n', 'e2e1q', 'e2e1r', 'h8g8']
        }),
        {},
        'bob'
      )
      fireEvent.click(square('e2'))
      fireEvent.click(square('e1'))
      expect(square('e1')).toHaveAccessibleName('e1, black pawn')
      expect(within(screen.getByRole('group', { name: 'promote to' })).getByRole('list')).toHaveStyle({ left: '37.5%' })
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

  // A drag is a press that moves: the piece follows the pointer, the
  // squares it reaches show, and letting go on one plays it. Mouse and touch
  // alike are pointer events; where it lands is the square under the
  // pointer, since a touch keeps every event on the square it began on.
  describe('dragging', () => {
    // jsdom does no layout: the square under the pointer is the test's to say.
    const under = (name: string | null) => {
      const element = name === null ? null : square(name)
      document.elementFromPoint = () => element
    }
    const drag = (fromName: string, toName: string | null) => {
      const from = square(fromName)
      fireEvent.pointerDown(from, { pointerId: 1, clientX: 10, clientY: 10, button: 0 })
      fireEvent.pointerMove(from, { pointerId: 1, clientX: 40, clientY: 40 })
      under(toName)
      fireEvent.pointerUp(from, { pointerId: 1, clientX: 40, clientY: 40 })
      // The click a touch's release fires on the square it began on.
      fireEvent.click(from)
    }

    it('a piece dropped on a square it reaches plays the move, in one gesture', () => {
      const { t } = mountWith(view())
      drag('g6', 'f7')
      expect(t.play).toHaveBeenCalledTimes(1)
      expect(t.play).toHaveBeenCalledWith('g6f7')
    })

    it('while it moves, the piece follows the pointer and its squares show', () => {
      mountWith(view())
      fireEvent.pointerDown(square('g6'), { pointerId: 1, clientX: 10, clientY: 10, button: 0 })
      expect(screen.queryByTestId('drag-ghost')).toBeNull() // a press is not yet a drag
      fireEvent.pointerMove(square('g6'), { pointerId: 1, clientX: 40, clientY: 40 })
      expect(screen.getByTestId('drag-ghost')).toBeInTheDocument()
      expect(square('f7')).toHaveAccessibleDescription('a move')
      fireEvent.pointerCancel(square('g6'), { pointerId: 1 })
      expect(screen.queryByTestId('drag-ghost')).toBeNull()
    })

    // A mouse is not held by the square it pressed: past the slop the board
    // takes the pointer, so a release anywhere — off the board, off the
    // page — still ends the drag.
    it('once a drag, the board holds the pointer, and a release off it ends the drag', () => {
      mountWith(view())
      const board = screen.getByRole('group', { name: 'board' })
      const capture = vi.fn()
      board.setPointerCapture = capture
      fireEvent.pointerDown(square('g6'), { pointerId: 7, clientX: 10, clientY: 10, button: 0 })
      expect(capture).not.toHaveBeenCalled() // a tap keeps its click
      fireEvent.pointerMove(square('g6'), { pointerId: 7, clientX: 40, clientY: 40 })
      expect(capture).toHaveBeenCalledWith(7)
      // Captured, the release comes to the board wherever it happens.
      under(null)
      fireEvent.pointerUp(board, { pointerId: 7, clientX: 900, clientY: 900 })
      expect(screen.queryByTestId('drag-ghost')).toBeNull()
      expect(square('g6')).toHaveAttribute('aria-pressed', 'true')
    })

    it('the dragged piece is drawn outside the board, so its edge cannot clip it', () => {
      mountWith(view())
      fireEvent.pointerDown(square('g6'), { pointerId: 1, clientX: 10, clientY: 10, button: 0 })
      fireEvent.pointerMove(square('g6'), { pointerId: 1, clientX: 40, clientY: 40 })
      const ghost = screen.getByTestId('drag-ghost')
      expect(screen.getByRole('group', { name: 'board' }).contains(ghost)).toBe(false)
      expect(ghost.style.left).toBe('40px')
      expect(ghost.style.top).toBe('40px')
    })

    // A finger never lands still: a press that barely moves is a tap.
    it('a press that wobbles a few pixels is still a tap', () => {
      const { t } = mountWith(view())
      fireEvent.pointerDown(square('g6'), { pointerId: 1, clientX: 10, clientY: 10, button: 0 })
      fireEvent.pointerMove(square('g6'), { pointerId: 1, clientX: 13, clientY: 12 })
      expect(screen.queryByTestId('drag-ghost')).toBeNull()
      fireEvent.pointerUp(square('g6'), { pointerId: 1, clientX: 13, clientY: 12 })
      fireEvent.click(square('g6'))
      expect(square('g6')).toHaveAttribute('aria-pressed', 'true')
      fireEvent.click(square('f7'))
      expect(t.play).toHaveBeenCalledWith('g6f7')
    })

    it('a promotion dropped asks for its piece', () => {
      const { t } = mountWith(view())
      drag('e7', 'e8')
      expect(t.play).not.toHaveBeenCalled()
      expect(screen.getByRole('group', { name: 'promote to' })).toBeInTheDocument()
    })

    it('dropped where it cannot go, nothing is played and the piece stays picked up', () => {
      const { t } = mountWith(view())
      drag('g6', 'a1')
      drag('g6', null)
      expect(t.play).not.toHaveBeenCalled()
      expect(square('g6')).toHaveAttribute('aria-pressed', 'true')
      // and a tap finishes it
      fireEvent.click(square('f7'))
      expect(t.play).toHaveBeenCalledWith('g6f7')
    })

    it('off turn, or off the hub, a drag moves nothing', () => {
      const { t, unmount } = mountWith(view(), {}, 'bob')
      drag('g6', 'f7')
      expect(screen.queryByTestId('drag-ghost')).toBeNull()
      unmount()
      mountWith(view(), t, 'alice', false)
      drag('g6', 'f7')
      expect(t.play).not.toHaveBeenCalled()
    })

    it('the viewer’s movable pieces take the touch from the page; nothing else does', () => {
      mountWith(view())
      expect(square('g6')).toHaveAttribute('data-grab', 'true')
      expect(square('h8')).not.toHaveAttribute('data-grab')
      expect(square('a1')).not.toHaveAttribute('data-grab')
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
    it('is said, and focus goes to the next game at this table', () => {
      const { t, rerender } = mountWith(view())
      rerender(ended())
      expect(status()).toHaveTextContent('You won by checkmate')
      // Said once: the panel's copy is for the eye, not read again.
      expect(screen.getByText('You won by checkmate', { selector: 'p:not([data-testid])' })).toHaveAttribute('aria-hidden', 'true')
      expect(screen.queryByRole('button', { name: 'Resign' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Next game' })).toHaveFocus()
      fireEvent.click(screen.getByRole('button', { name: 'Next game' }))
      expect(t.playAgain).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
      expect(t.leaveTable).toHaveBeenCalledTimes(1)
    })

    it('once the opponent leaves between games, says so and offers another table', () => {
      const { t } = mountWith(ended({ phase: 'closed' }))
      expect(status()).toHaveTextContent('bob left the table.')
      expect(screen.queryByRole('button', { name: 'Next game' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
      expect(t.playAgain).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
      expect(t.leaveTable).toHaveBeenCalledTimes(1)
    })

    it('a leave mid-game is the result itself', () => {
      mountWith(ended({ phase: 'closed', result: { ending: 'abandoned', winner: 'alice', winnerColor: 'white' } }))
      expect(status()).toHaveTextContent('You won: your opponent left')
    })

    it('holds Play again while another table is opening', () => {
      mountWith(ended({ phase: 'closed' }), { opening: true })
      expect(screen.getByRole('button', { name: 'Opening…' })).toBeDisabled()
    })
  })

  describe('the score sheet', () => {
    it('is not there before a game has finished', () => {
      mountWith(view())
      expect(screen.queryByRole('table', { name: 'Score sheet' })).toBeNull()
    })

    it('marks each game’s winner, a draw for neither, and totals the wins', () => {
      mountWith(
        view({
          scoreSheet: [
            { winner: 'alice', ending: 'checkmate' },
            { ending: 'stalemate' },
            { winner: 'bob', ending: 'resignation' },
            { winner: 'alice', ending: 'timeout' }
          ]
        })
      )
      const sheet = screen.getByRole('table', { name: 'Score sheet' })
      const rows = within(sheet).getAllByRole('row').map(row => row.textContent)
      expect(rows).toEqual(['#youbob', '11—', '2draw', '3—1', '41—', 'Total21'])
    })

    it('pages the last five games and totals them all', () => {
      const won = (winner: string) => ({ winner, ending: 'checkmate' as const })
      mountWith(view({ scoreSheet: [won('alice'), won('alice'), won('bob'), won('alice'), won('bob'), won('bob'), won('alice')] }))
      const rows = within(screen.getByRole('table', { name: 'Score sheet' }))
        .getAllByRole('row')
        .map(row => row.textContent)
      expect(rows).toEqual(['#youbob', '3—1', '41—', '5—1', '6—1', '71—', 'Total43'])
    })
  })
})
