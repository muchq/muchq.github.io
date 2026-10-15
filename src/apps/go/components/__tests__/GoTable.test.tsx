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
  boardSize: 9,
  board: ['b........', '.w.......', ...empty(9).slice(2)],
  captures: { black: 2, white: 1 },
  sideToMove: 'black',
  currentPlayerId: 'alice',
  clock: { blackMs: 300_000, whiteMs: 290_000, initialMs: 300_000, incrementMs: 5_000 },
  lastMove: { color: 'white', x: 1, y: 1 },
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
    const held = mount({ view: view({ phase: 'waiting', boardSize: undefined, board: undefined }) })
    fireEvent.change(screen.getByRole('combobox', { name: 'Board size' }), { target: { value: '13' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(held.startTable).toHaveBeenCalledWith({ boardSize: 13, initialSeconds: 600, incrementSeconds: 5 })
  })

  it('says the result, and offers the next game on the size picked', () => {
    const result = { ending: 'score' as const, winner: 'bob', winnerColor: 'white' as const, scores: { black: 40, white: 45.5 } }
    const held = mount({ view: view({ phase: 'ended', result }) })
    expect(screen.getByTestId('go-status').textContent).toBe('bob (White) won on points. Black 40, White 45.5.')
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: 'Next board size' }), { target: { value: '19' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next game' }))
    expect(held.playAgain).toHaveBeenCalledWith(19)
  })
})
