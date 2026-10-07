import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChessTable from '../ChessTable'
import type { ChessTableProps } from '../ChessTable'
import type { ChessView } from '../../wire'
import { pieceImage } from '../../rules'

// The board from one chair, over a fake hook: what a tap on a square
// offers and sends, what the table says and where focus goes, the clock
// running down, and the table's ending.

// White Kg6 Pe7 against Kh8, alice White and on turn.
const view = (over: Partial<ChessView> = {}): ChessView => ({
  gameId: 'G1',
  availableSetups: [
    { setupId: 'random-kpk', name: 'Random K+P vs K' },
    { setupId: 'standard', name: 'Standard starting position' },
    { setupId: 'lucena', name: 'R+P vs R — Lucena' }
  ],
  defaultSetupId: 'standard',
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
    variant: undefined,
    setupId: undefined,
    setupName: undefined,
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
  seating: false,
  startTable: vi.fn(),
  leaveTable: vi.fn(),
  playAgain: vi.fn(),
  sent: null,
  play: vi.fn(),
  resign: vi.fn(),
  addBot: vi.fn(),
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

    it('draws each piece as its own image, filling its square', () => {
      mountWith(view())
      const pawn = square('e7').querySelector('img')
      expect(pawn).toHaveAttribute('src', pieceImage('P'))
      expect(pawn).toHaveAttribute('alt', '')
      expect(square('h8').querySelector('img')).toHaveAttribute('src', pieceImage('k'))
      expect(square('a1').querySelector('img')).toBeNull()
    })

    // No snap back to where it stood while the hub answers.
    it('shows a move sent where it landed, and takes no other until the hub answers', () => {
      const { t } = mountWith(view(), { sent: 'g6f7' })
      expect(square('f7')).toHaveAccessibleName('f7, white king')
      expect(square('g6')).toHaveAccessibleName('g6')
      expect(square('e7')).toHaveAttribute('aria-disabled', 'true')
      fireEvent.click(square('e7'))
      fireEvent.click(square('e8'))
      expect(t.play).not.toHaveBeenCalled()
      fireEvent.pointerDown(square('e7'), { pointerId: 1, clientX: 10, clientY: 10, button: 0 })
      fireEvent.pointerMove(square('e7'), { pointerId: 1, clientX: 40, clientY: 40 })
      expect(screen.queryByTestId('drag-ghost')).toBeNull()
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

    it('a promotion asking takes the squares out of reach, and gives them back once answered', () => {
      mountWith(view())
      const cells = () => within(screen.getByRole('group', { name: 'board' })).getAllByRole('button', { name: /^[a-h][1-8]\b/ })
      fireEvent.click(square('e7'))
      expect(cells().filter(cell => cell.hasAttribute('inert'))).toHaveLength(0)
      fireEvent.click(square('e8'))
      expect(cells().filter(cell => cell.hasAttribute('inert'))).toHaveLength(64)
      expect(within(screen.getByRole('group', { name: 'promote to' })).getByRole('button', { name: 'Queen' })).not.toHaveAttribute('inert')
      fireEvent.keyDown(screen.getByRole('group', { name: 'promote to' }), { key: 'Escape' })
      expect(cells().filter(cell => cell.hasAttribute('inert'))).toHaveLength(0)
      expect(square('e7')).toHaveFocus()
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

  describe('premoving', () => {
    const offTurn = () => view({ sideToMove: 'black', currentPlayerId: 'bob', legalMoves: ['h8g7', 'h8g8'] })

    it('queues one move off turn and sends it when the hub says it is legal', () => {
      const { t, rerender } = mountWith(offTurn())
      fireEvent.click(square('g6'))
      fireEvent.click(square('f7'))

      expect(t.play).not.toHaveBeenCalled()
      expect(status()).toHaveTextContent('Premove queued: g6 to f7.')
      expect(square('g6')).toHaveAttribute('data-premove', 'from')
      expect(square('f7')).toHaveAttribute('data-premove', 'to')

      screen.getByRole('button', { name: 'Cancel premove' }).focus()
      rerender(view({ legalMoves: ['g6f7'] }))
      expect(t.play).toHaveBeenCalledWith('g6f7')
      expect(screen.queryByRole('button', { name: 'Cancel premove' })).toBeNull()
      expect(square('f7')).toHaveFocus()
    })

    it('drops a premove that is not legal when the turn arrives', () => {
      const { t, rerender } = mountWith(offTurn())
      fireEvent.click(square('g6'))
      fireEvent.click(square('f7'))
      expect(screen.getByRole('button', { name: 'Cancel premove' })).toBeInTheDocument()

      rerender(view({ legalMoves: ['g6f5'] }))
      expect(t.play).not.toHaveBeenCalled()
      expect(screen.queryByRole('button', { name: 'Cancel premove' })).toBeNull()
      expect(status()).toHaveTextContent('Your move.')
    })

    it('lets the player cancel the queued premove', () => {
      const { t } = mountWith(offTurn())
      fireEvent.click(square('g6'))
      fireEvent.click(square('f7'))
      fireEvent.click(screen.getByRole('button', { name: 'Cancel premove' }))

      expect(t.play).not.toHaveBeenCalled()
      expect(square('g6')).not.toHaveAttribute('data-premove')
      expect(square('f7')).not.toHaveAttribute('data-premove')
      expect(square('g6')).toHaveFocus()
      expect(status()).toHaveTextContent('bob to move.')
    })

    it('replaces the single queued premove with another gesture', () => {
      const { t, rerender } = mountWith(offTurn())
      fireEvent.click(square('g6'))
      fireEvent.click(square('f7'))
      fireEvent.click(square('e7'))
      expect(square('e7')).toHaveAttribute('aria-pressed', 'true')
      expect(status()).toHaveTextContent('Choose a premove destination.')
      fireEvent.click(square('e8'))

      expect(square('g6')).not.toHaveAttribute('data-premove')
      expect(square('e7')).toHaveAttribute('data-premove', 'from')
      expect(square('e8')).toHaveAttribute('data-premove', 'to')
      rerender(view({ legalMoves: ['g6f7', 'e7e8q', 'e7e8r'] }))
      expect(t.play).toHaveBeenCalledTimes(1)
      expect(t.play).toHaveBeenCalledWith('e7e8q')
    })

    it('reselects another own piece instead of queueing a self-capture', () => {
      const { t } = mountWith(offTurn())
      fireEvent.click(square('g6'))
      fireEvent.click(square('e7'))

      expect(square('g6')).toHaveAttribute('aria-pressed', 'false')
      expect(square('e7')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.queryByRole('button', { name: 'Cancel premove' })).toBeNull()
      expect(t.play).not.toHaveBeenCalled()
    })

    it('cannot queue a premove after the game has ended', () => {
      const { t } = mountWith(ended())
      fireEvent.click(square('g6'))
      fireEvent.click(square('f7'))
      expect(square('g6')).toHaveAttribute('aria-disabled', 'true')
      expect(screen.queryByRole('button', { name: 'Cancel premove' })).toBeNull()
      expect(t.play).not.toHaveBeenCalled()
    })

    it('does not land a replacement drag after the turn sent the queued premove', () => {
      const { t, rerender } = mountWith(offTurn())
      fireEvent.click(square('g6'))
      fireEvent.click(square('f7'))
      fireEvent.pointerDown(square('e7'), { pointerId: 1, clientX: 10, clientY: 10, button: 0 })
      fireEvent.pointerMove(square('e7'), { pointerId: 1, clientX: 40, clientY: 40 })

      rerender(view({ legalMoves: ['g6f7', 'e7e8q'] }))
      document.elementFromPoint = () => square('e8')
      fireEvent.pointerUp(square('e7'), { pointerId: 1, clientX: 40, clientY: 40 })
      fireEvent.click(square('e7'))

      expect(t.play).toHaveBeenCalledTimes(1)
      expect(t.play).toHaveBeenCalledWith('g6f7')
    })

    it('queues a premove by drag, but not while disconnected', () => {
      const { t, unmount } = mountWith(offTurn())
      document.elementFromPoint = () => square('f7')
      fireEvent.pointerDown(square('g6'), { pointerId: 1, clientX: 10, clientY: 10, button: 0 })
      fireEvent.pointerMove(square('g6'), { pointerId: 1, clientX: 40, clientY: 40 })
      fireEvent.pointerUp(square('g6'), { pointerId: 1, clientX: 40, clientY: 40 })
      expect(status()).toHaveTextContent('Premove queued: g6 to f7.')
      expect(t.play).not.toHaveBeenCalled()

      unmount()
      mountWith(offTurn(), {}, 'alice', false)
      document.elementFromPoint = () => square('f7')
      fireEvent.pointerDown(square('g6'), { pointerId: 1, clientX: 10, clientY: 10, button: 0 })
      fireEvent.pointerMove(square('g6'), { pointerId: 1, clientX: 40, clientY: 40 })
      fireEvent.pointerUp(square('g6'), { pointerId: 1, clientX: 40, clientY: 40 })
      expect(screen.queryByRole('button', { name: 'Cancel premove' })).toBeNull()
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

    // The piece in hand is the ghost; the one left behind is only its trace.
    it('while it moves, the piece left on its square is faded', () => {
      mountWith(view())
      fireEvent.pointerDown(square('g6'), { pointerId: 1, clientX: 10, clientY: 10, button: 0 })
      fireEvent.pointerMove(square('g6'), { pointerId: 1, clientX: 40, clientY: 40 })
      expect(square('g6').querySelector('img')).toHaveAttribute('data-lifted', 'true')
      expect(square('e7').querySelector('img')).not.toHaveAttribute('data-lifted')
      fireEvent.pointerCancel(square('g6'), { pointerId: 1 })
      expect(square('g6').querySelector('img')).not.toHaveAttribute('data-lifted')
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

    // The board sizes from what the chrome leaves. Status length changes
    // every turn; the slot class is what holds that height open so the
    // squares do not. jsdom does no layout — the class is the contract.
    it('keeps the status in a height-reserved slot on and off turn', () => {
      const { rerender } = mountWith(view({ moves: ['a1a2', 'h7h8'] }))
      expect(status().className).toContain('statusSlot')
      rerender(view({ moves: ['a1a2', 'h7h8', 'g6f7'], sideToMove: 'black', currentPlayerId: 'bob', legalMoves: [] }))
      expect(status().className).toContain('statusSlot')
      expect(status()).toHaveTextContent('bob to move.')
    })
  })

  // Lichess's count: the side ahead in material shows its lead beside its
  // name; the side behind and an even position show nothing.
  describe('the material count', () => {
    const row = (name: string) => screen.getByRole('timer', { name: `${name}’s clock` }).parentElement!

    it('shows the lead beside the side ahead', () => {
      mountWith(view())
      expect(row('alice')).toHaveTextContent('+1')
      expect(row('bob')).not.toHaveTextContent('+')
    })

    it('shows Black’s lead beside Black, for White too', () => {
      mountWith(view({ fen: 'r5k1/8/6K1/8/8/8/8/8 w - - 0 1' }))
      expect(row('bob')).toHaveTextContent('+5')
      expect(row('alice')).not.toHaveTextContent('+')
    })

    // Keyed to the side's color, not to the row above or below.
    it('shows the lead beside the side ahead for a Black viewer and a watcher', () => {
      const black = 'r5k1/8/6K1/8/8/8/8/8 w - - 0 1'
      const { unmount } = mountWith(view({ fen: black }), {}, 'bob')
      expect(row('bob')).toHaveTextContent('+5')
      expect(row('alice')).not.toHaveTextContent('+')
      unmount()
      mountWith(view({ fen: black }), {}, 'carol')
      expect(row('bob')).toHaveTextContent('+5')
      expect(row('alice')).not.toHaveTextContent('+')
    })

    // The name truncates on a narrow phone; the lead must not go with it.
    it('says the lead in words, outside the name that truncates', () => {
      mountWith(view())
      const lead = within(row('alice')).getByText('up 1 in material', { exact: false }).parentElement!
      expect(lead).toHaveTextContent('+1')
      expect(lead.parentElement).toBe(row('alice'))
    })

    // The extras are drawn as the opponent's pieces, as if taken.
    it('draws each side’s extra pieces beside it, in the other side’s color', () => {
      const icons = (name: string) => [...row(name).querySelectorAll('img')].map(img => img.getAttribute('src'))
      const { unmount } = mountWith(view())
      expect(icons('alice')).toEqual([pieceImage('p')])
      expect(icons('bob')).toEqual([])
      unmount()
      // Queen against rook and two pawns: both sides have extras, White leads.
      mountWith(view({ fen: '3rk3/8/8/8/8/8/1pp5/3QK3 w - - 0 1' }))
      expect(icons('alice')).toEqual([pieceImage('q')])
      expect(icons('bob')).toEqual([pieceImage('R'), pieceImage('P'), pieceImage('P')])
      expect(row('alice')).toHaveTextContent('+2')
      expect(row('bob')).not.toHaveTextContent('+')
      expect(row('bob')).toHaveTextContent('extra rook, 2 pawns')
    })

    it('shows nothing when even', () => {
      mountWith(view({ fen: '7k/8/6K1/8/8/8/8/8 w - - 0 1' }))
      expect(row('alice')).not.toHaveTextContent('+')
      expect(row('bob')).not.toHaveTextContent('+')
      expect(row('alice').querySelector('img')).toBeNull()
      expect(row('bob').querySelector('img')).toBeNull()
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
    it('uses and submits the server default even when it is not the first catalog option', () => {
      const { t } = mountWith(waiting())
      expect(screen.getByRole('combobox', { name: 'Starting position' })).toHaveValue('standard')
      fireEvent.click(screen.getByRole('button', { name: 'Start' }))
      expect(t.startTable).toHaveBeenCalledWith({ setupId: 'standard', initialSeconds: 180, incrementSeconds: 2 })
    })

    it('starts with the server setup and clock chosen', () => {
      const { t } = mountWith(waiting())
      expect(screen.queryByRole('group', { name: 'board' })).toBeNull()
      const setup = screen.getByRole('combobox', { name: 'Starting position' })
      expect(within(setup).getAllByRole('option').map(option => [option.getAttribute('value'), option.textContent])).toEqual([
        ['random-kpk', 'Random K+P vs K'],
        ['standard', 'Standard starting position'],
        ['lucena', 'R+P vs R — Lucena']
      ])
      fireEvent.change(setup, { target: { value: 'lucena' } })
      fireEvent.change(screen.getByRole('combobox', { name: 'Clock' }), { target: { value: '5+3' } })
      fireEvent.click(screen.getByRole('button', { name: 'Start' }))
      expect(t.startTable).toHaveBeenCalledWith({ setupId: 'lucena', initialSeconds: 300, incrementSeconds: 3 })
    })

    it('cannot start with one seat, or off the hub', () => {
      const { unmount } = mountWith(waiting({ players: [{ playerId: 'alice' }] }))
      expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
      unmount()
      mountWith(waiting(), {}, 'alice', false)
      expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    })
  })

  describe('a bot', () => {
    it('is offered to a player alone at the table, at the strength they pick', () => {
      const { t } = mountWith(waiting({ players: [{ playerId: 'alice' }] }))
      const strength = screen.getByRole('combobox', { name: 'Bot strength' })
      fireEvent.change(strength, { target: { value: '1900' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add a bot' }))
      expect(t.addBot).toHaveBeenCalledWith(1900)
    })

    it('is held while one is being seated, so a double tap asks once', () => {
      mountWith(waiting({ players: [{ playerId: 'alice' }] }), { seating: true })
      expect(screen.getByRole('button', { name: 'Add a bot' })).toBeDisabled()
    })

    it('is not offered once the second seat is taken, or off the hub', () => {
      const { unmount } = mountWith(waiting())
      expect(screen.queryByRole('button', { name: 'Add a bot' })).toBeNull()
      unmount()
      mountWith(waiting({ players: [{ playerId: 'alice' }] }), {}, 'alice', false)
      expect(screen.getByRole('button', { name: 'Add a bot' })).toBeDisabled()
    })

    it('is named for its engine and strength wherever a player is', () => {
      const { unmount } = mountWith(waiting({ players: [{ playerId: 'alice' }, { playerId: 'stockfish@1500', bot: true }] }))
      expect(screen.getByText('Stockfish 1500')).toBeInTheDocument()
      unmount()
      mountWith(
        view({
          players: [
            { playerId: 'alice', color: 'white' },
            { playerId: 'stockfish@1500', color: 'black', bot: true }
          ],
          sideToMove: 'black',
          currentPlayerId: 'stockfish@1500',
          scoreSheet: [{ winner: 'stockfish@1500', ending: 'checkmate' }]
        })
      )
      expect(status()).toHaveTextContent('Stockfish 1500 to move.')
      expect(screen.getByText(/Stockfish 1500 · black/)).toBeInTheDocument()
      expect(within(screen.getByRole('table', { name: 'Score sheet' })).getByText('Stockfish 1500')).toBeInTheDocument()
    })
  })

  describe('the ending', () => {
    // The board sizes from what the chrome leaves. Resign swaps for a
    // result line plus next-game buttons; the foot class holds that
    // height open so the squares do not, and the result class clamps
    // the decorative line so a long draw cannot grow past it. jsdom
    // does no layout — the classes are the contract.
    it('keeps play and ended chrome in a height-reserved foot', () => {
      const { rerender } = mountWith(view())
      const playFoot = screen.getByRole('button', { name: 'Resign' }).closest('[data-testid="chess-foot"]')
      expect(playFoot?.className).toContain('foot')
      rerender(ended())
      const endFoot = screen.getByRole('button', { name: 'Next game' }).closest('[data-testid="chess-foot"]')
      expect(endFoot?.className).toContain('foot')
      const panel = screen.getByText('You won by checkmate', { selector: 'p:not([data-testid])' })
      expect(panel.className).toContain('result')
      expect(endFoot).toContainElement(panel)
    })

    it('is said, and focus goes to the next game at this table', () => {
      const { t, rerender } = mountWith(view())
      rerender(ended())
      expect(status()).toHaveTextContent('You won by checkmate')
      // Said once: the panel's copy is for the eye, not read again.
      expect(screen.getByText('You won by checkmate', { selector: 'p:not([data-testid])' })).toHaveAttribute('aria-hidden', 'true')
      expect(screen.queryByRole('button', { name: 'Resign' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Next game' })).toHaveFocus()
      const nextPosition = screen.getByRole('combobox', { name: 'Next starting position' })
      expect(nextPosition).toHaveValue('random-kpk')
      fireEvent.change(nextPosition, { target: { value: 'lucena' } })
      fireEvent.click(screen.getByRole('button', { name: 'Next game' }))
      expect(t.playAgain).toHaveBeenCalledWith('lucena')
      fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
      expect(t.leaveTable).toHaveBeenCalledTimes(1)
    })

    it('shows the full active starting-position name without the title’s truncating style', () => {
      const setupName = 'Rook and pawn versus rook — Lucena position with the defending king cut off'
      mountWith(ended({ setupId: 'lucena', setupName, variant: 'lucena' }))
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent(`Chess G1 · ${setupName}`)
      expect(heading.parentElement).toHaveAttribute('data-phase', 'ended')
      const name = within(heading).getByTitle(setupName)
      expect(name.className).toContain('setupName')
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

    // Width in the header row, height dropped from the board's flex
    // budget: the notepadSlot class is the contract. jsdom does no layout.
    it('slots the notepad out of the board’s height budget', () => {
      mountWith(ended({ scoreSheet: [{ winner: 'alice', ending: 'checkmate' }] }))
      const sheet = screen.getByRole('table', { name: 'Score sheet' })
      const slot = sheet.parentElement?.parentElement
      expect(slot?.className.split(/\s+/).some(name => /(?:^|_)notepadSlot(?:_|$)/.test(name))).toBe(true)
      expect(sheet.parentElement?.className.split(/\s+/).some(name => /(?:^|_)notepad(?:_|$)/.test(name))).toBe(true)
    })

    // Collapsed, the sheet is its totals alone, so a long match never grows
    // over the board; the game count heading the numbers opens the history.
    it('shows only the totals until its history is opened, and closes again', () => {
      mountWith(view({ scoreSheet: [{ winner: 'alice', ending: 'checkmate' }, { ending: 'stalemate' }] }))
      const sheet = screen.getByRole('table', { name: 'Score sheet' })
      const rows = () => within(sheet).getAllByRole('row').map(row => row.textContent)
      const toggle = screen.getByRole('button', { name: '2 games' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(rows()).toEqual(['2▸youbob', 'Total10'])
      fireEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(rows()).toEqual(['2▾youbob', '11—', '2draw', 'Total10'])
      fireEvent.click(toggle)
      expect(rows()).toEqual(['2▸youbob', 'Total10'])
    })

    it('counts a single game as one', () => {
      mountWith(view({ scoreSheet: [{ winner: 'alice', ending: 'checkmate' }] }))
      expect(screen.getByRole('button', { name: '1 game' })).toBeInTheDocument()
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
      fireEvent.click(screen.getByRole('button', { name: '4 games' }))
      const sheet = screen.getByRole('table', { name: 'Score sheet' })
      const rows = within(sheet).getAllByRole('row').map(row => row.textContent)
      expect(rows).toEqual(['4▾youbob', '11—', '2draw', '3—1', '41—', 'Total21'])
    })

    it('pages the last five games and totals them all', () => {
      const won = (winner: string) => ({ winner, ending: 'checkmate' as const })
      mountWith(view({ scoreSheet: [won('alice'), won('alice'), won('bob'), won('alice'), won('bob'), won('bob'), won('alice')] }))
      fireEvent.click(screen.getByRole('button', { name: '7 games' }))
      const rows = within(screen.getByRole('table', { name: 'Score sheet' }))
        .getAllByRole('row')
        .map(row => row.textContent)
      expect(rows).toEqual(['7▾youbob', '3—1', '41—', '5—1', '6—1', '71—', 'Total43'])
    })
  })

  // A member at no seat watching the table (MoonBase#1633): White at the
  // bottom, both clocks, the moves as they come, and nothing to touch.
  describe('watching', () => {
    it('shows White at the bottom with both clocks, and says it is watching', () => {
      mountWith(view(), {}, 'carol')
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Watching chess G1')
      const cells = within(screen.getByRole('group', { name: 'board' })).getAllByRole('button')
      expect(cells[0]).toHaveAccessibleName('a8')
      const clocks = screen.getAllByRole('timer').map(clock => clock.getAttribute('aria-label'))
      expect(clocks).toEqual(['bob’s clock', 'alice’s clock'])
      expect(screen.getByTestId('chess-status')).toHaveTextContent('alice to move.')
    })

    it('keeps White at the bottom whichever seat is listed first', () => {
      mountWith(
        view({
          players: [
            { playerId: 'bob', color: 'black' },
            { playerId: 'alice', color: 'white' }
          ]
        }),
        {},
        'carol'
      )
      expect(within(screen.getByRole('group', { name: 'board' })).getAllByRole('button')[0]).toHaveAccessibleName('a8')
      expect(screen.getAllByRole('timer').map(clock => clock.getAttribute('aria-label'))).toEqual(['bob’s clock', 'alice’s clock'])
    })

    it('moves nothing: no piece picks up and nothing is played', () => {
      const { t } = mountWith(view(), {}, 'carol')
      expect(square('g6')).toHaveAttribute('aria-disabled', 'true')
      expect(square('g6')).not.toHaveAttribute('aria-pressed')
      expect(square('g6').dataset.grab).toBeUndefined()
      fireEvent.click(square('e7'))
      fireEvent.click(square('e8'))
      expect(t.play).not.toHaveBeenCalled()
      expect(screen.queryByRole('group', { name: 'promote to' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Resign' })).toBeNull()
    })

    it('stops watching at a tap, in any phase', () => {
      for (const phase of [waiting(), view(), ended(), ended({ phase: 'closed' })]) {
        const { t, unmount } = mountWith(phase, {}, 'carol')
        fireEvent.click(screen.getByRole('button', { name: 'Stop watching' }))
        expect(t.leaveTable).toHaveBeenCalledTimes(1)
        unmount()
      }
    })

    it('offers none of a seat’s choices before the start', () => {
      mountWith(waiting({ players: [{ playerId: 'alice' }] }), {}, 'carol')
      for (const name of ['Start', 'Add a bot', 'Leave table']) expect(screen.queryByRole('button', { name })).toBeNull()
      expect(screen.queryByRole('combobox')).toBeNull()
      expect(screen.getByTestId('chess-status')).toHaveTextContent('Waiting for a second seat.')
    })

    it('reads the result, with no next game to start', () => {
      mountWith(ended(), {}, 'carol')
      expect(screen.getByTestId('chess-status')).toHaveTextContent('alice won by checkmate')
      for (const name of ['Next game', 'Play again', 'Leave table']) expect(screen.queryByRole('button', { name })).toBeNull()
      expect(screen.queryByRole('combobox', { name: 'Next starting position' })).toBeNull()
    })

    it('says the table closed when a seat left between games', () => {
      mountWith(ended({ phase: 'closed', players: [{ playerId: 'bob', color: 'black' }] }), {}, 'carol')
      expect(screen.getByTestId('chess-status')).toHaveTextContent('The table closed.')
    })
  })
})
