import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GoTable, { type GoTableProps } from '../GoTable'
import type { GoView } from '../../wire'

const empty = (size: number) => Array.from({ length: size }, () => '.'.repeat(size))

const view = (over: Partial<GoView> = {}): GoView => ({
  gameId: 'G01',
  phase: 'playing',
  players: [
    { playerId: 'alice', color: 'black' },
    { playerId: 'bob', color: 'white' }
  ],
  size: 9,
  board: ['b........', '.w.......', ...empty(9).slice(2)],
  captures: { black: 2, white: 1 },
  sideToMove: 'black',
  currentPlayerId: 'alice',
  clock: { blackMs: 300_000, whiteMs: 290_000, initialMs: 300_000, incrementMs: 5_000 },
  lastMove: { color: 'white', pass: false, x: 1, y: 1 },
  moveCount: 2,
  scoreSheet: [],
  komi: 6.5,
  ...over
})

const table = (over: Partial<GoTableProps['table']> = {}): GoTableProps['table'] => ({
  opening: false,
  sent: false,
  startTable: vi.fn(),
  leaveTable: vi.fn(),
  playAgain: vi.fn(),
  play: vi.fn(),
  pass: vi.fn(),
  resign: vi.fn(),
  ...over
})

const mount = (props: Partial<GoTableProps> = {}) => {
  const held = props.table ?? table()
  render(<GoTable playerId="alice" connected view={view()} {...props} table={held} />)
  return held
}

const board = () => within(screen.getByRole('group', { name: 'board' }))

afterEach(cleanup)

describe('GoTable', () => {
  it('draws the stones, the last move, captures and clocks', () => {
    mount()
    expect(document.querySelectorAll('[data-color="black"][r="0.47"]')).toHaveLength(1)
    expect(document.querySelectorAll('[data-color="white"][r="0.47"]')).toHaveLength(1)
    expect(screen.getByTestId('go-last-move').getAttribute('cx')).toBe('1')
    expect(screen.getByTestId('go-seat-black').textContent).toContain('captured 2')
    expect(screen.getByTestId('go-seat-white').textContent).toContain('4:50')
  })

  it('on your turn a tap on an empty point plays it, column lettered without I', () => {
    const held = mount()
    // Occupied points offer nothing.
    expect(board().queryByRole('button', { name: 'Play A9' })).toBeNull()
    expect(board().getAllByRole('button')).toHaveLength(81 - 2)
    fireEvent.click(board().getByRole('button', { name: 'Play C7' }))
    expect(held.play).toHaveBeenCalledWith(2, 2)
    expect(board().getByRole('button', { name: 'Play J1' })).toBeTruthy()
  })

  it('offers no point off your turn, or while a move is unanswered', () => {
    mount({ view: view({ currentPlayerId: 'bob', sideToMove: 'white' }) })
    expect(board().queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Pass' })).toHaveProperty('disabled', true)
    cleanup()
    mount({ table: table({ sent: true }) })
    expect(board().queryAllByRole('button')).toHaveLength(0)
  })

  it('passes, and resigns once confirmed', () => {
    const held = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    expect(held.pass).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Resign' }))
    expect(held.resign).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm resign' }))
    expect(held.resign).toHaveBeenCalledTimes(1)
  })

  it('starts on the picked board size and clock', () => {
    const held = mount({ view: view({ phase: 'waiting', size: undefined, board: undefined }) })
    fireEvent.change(screen.getByRole('combobox', { name: 'Board size' }), { target: { value: '13' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(held.startTable).toHaveBeenCalledWith({ size: 13, initialSeconds: 600, incrementSeconds: 5 })
  })

  it('says the result, and offers the next game on the size picked', () => {
    const result = { ending: 'score' as const, winner: 'bob', winnerColor: 'white' as const, score: { black: 40, white: 45.5 } }
    const held = mount({ view: view({ phase: 'ended', result }) })
    expect(screen.getByTestId('go-status').textContent).toBe('bob (White) won on points. Black 40, White 45.5.')
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: 'Next board size' }), { target: { value: '19' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next game' }))
    expect(held.playAgain).toHaveBeenCalledWith(19)
  })

  it('the next game follows the table’s size when none is picked', () => {
    const held = mount({ view: view({ phase: 'ended', result: { ending: 'resignation', winner: 'bob' } }) })
    fireEvent.click(screen.getByRole('button', { name: 'Next game' }))
    expect(held.playAgain).toHaveBeenCalledWith(9)
  })

  it('a size picked before the start gives way to the size the game has', () => {
    const waiting = view({ phase: 'waiting', size: undefined, board: undefined })
    const { rerender } = render(<GoTable playerId="alice" connected view={waiting} table={table()} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Board size' }), { target: { value: '13' } })
    const held = table()
    rerender(<GoTable playerId="alice" connected view={view({ phase: 'ended', result: { ending: 'resignation', winner: 'bob' } })} table={held} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next game' }))
    expect(held.playAgain).toHaveBeenCalledWith(9)
  })

  it('names the stones and says the last move', () => {
    mount()
    expect(board().getByRole('img', { name: 'A9, black stone' })).toBeTruthy()
    expect(board().getByRole('img', { name: 'B8, white stone' })).toBeTruthy()
    expect(screen.getByTestId('go-status').textContent).toBe('White played B8. Your move.')
    cleanup()
    mount({ view: view({ lastMove: { color: 'white', pass: true } }) })
    expect(screen.getByTestId('go-status').textContent).toBe('White passed. Your move.')
  })

  it('keeps one point in the tab order, moved by the arrows', () => {
    mount()
    const tabbable = () => document.querySelectorAll('[data-point][tabindex="0"]')
    expect(tabbable()).toHaveLength(1)
    expect(tabbable()[0].getAttribute('aria-label')).toBe('Play E5')
    fireEvent.keyDown(tabbable()[0], { key: 'ArrowRight' })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Play F5')
    expect(tabbable()).toHaveLength(1)
    expect(tabbable()[0]).toBe(document.activeElement)
  })

  it('a pass hands focus back to the board', () => {
    const held = mount()
    const pass = screen.getByRole('button', { name: 'Pass' })
    pass.focus()
    fireEvent.click(pass)
    expect(held.pass).toHaveBeenCalledTimes(1)
    expect(document.activeElement?.getAttribute('data-point')).toBe('4-4')
  })

  it('resigning asks first, and keeping on puts focus back on Resign', () => {
    const held = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Resign' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirm resign' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(held.resign).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Resign' }))
  })

  it('offline, nothing can be played', () => {
    mount({ connected: false })
    expect(board().queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Pass' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Resign' })).toHaveProperty('disabled', true)
  })

  it('a closed table offers another, focused, or the way back', () => {
    const held = mount({ view: view({ phase: 'closed' }) })
    expect(screen.getByTestId('go-status').textContent).toBe('Your opponent left the table.')
    expect(screen.queryByRole('combobox', { name: 'Next board size' })).toBeNull()
    const again = screen.getByRole('button', { name: 'Play again' })
    expect(document.activeElement).toBe(again)
    fireEvent.click(again)
    expect(held.playAgain).toHaveBeenCalledWith(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
    expect(held.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('a watcher sees Black’s clock under the board and touches nothing', () => {
    const held = mount({ playerId: 'carol' })
    expect(screen.getByRole('heading').textContent).toContain('Watching go')
    expect(board().queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Resign' })).toBeNull()
    expect(screen.getByTestId('go-seat-white').compareDocumentPosition(screen.getByTestId('go-seat-black')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Stop watching' }))
    expect(held.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('the viewer’s clock sits under the board', () => {
    mount({ playerId: 'bob' })
    expect(screen.getByTestId('go-seat-black').compareDocumentPosition(screen.getByTestId('go-seat-white')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
