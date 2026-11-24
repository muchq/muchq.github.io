import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WordchainTable, { type WordchainTableProps } from '../WordchainTable'
import type { WordchainView } from '../../wire'

const NOW = 1_000_000

const view = (over: Partial<WordchainView> = {}): WordchainView => ({
  gameId: 'W1',
  phase: 'racing',
  start: 'cold',
  target: 'warm',
  par: 5,
  startedAtMs: NOW,
  deadlineMs: NOW + 180_000,
  runners: [
    { playerId: 'alice', words: 1, left: false, ladder: ['cord'], wins: 0 },
    { playerId: 'bob', words: 3, left: false, wins: 2 }
  ],
  racesPlayed: 0,
  ...over
})

const table = (over: Partial<WordchainTableProps['table']> = {}): WordchainTableProps['table'] => ({
  opening: false,
  sending: false,
  startTable: vi.fn(),
  leaveTable: vi.fn(),
  playAgain: vi.fn(),
  play: vi.fn(),
  retract: vi.fn(),
  ...over
})

const mount = (props: Partial<WordchainTableProps> = {}) => {
  const held = props.table ?? table()
  const utils = render(<WordchainTable playerId="alice" connected view={view()} {...props} table={held} />)
  return { held, ...utils }
}

const runners = () => within(screen.getByRole('table', { name: 'Runners' }))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('WordchainTable', () => {
  it('starts nothing until a second seat, then a race of the letters picked', () => {
    const alone = view({ phase: 'waiting', start: undefined, target: undefined, par: undefined, runners: [{ playerId: 'alice', words: 0, left: false, wins: 0 }] })
    const { held, rerender } = mount({ view: alone })
    expect(screen.getByText('Waiting for a second seat.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start the race' })).toHaveProperty('disabled', true)

    const two = { ...alone, runners: [...alone.runners, { playerId: 'bob', words: 0, left: false, wins: 0 }] }
    rerender(<WordchainTable playerId="alice" connected view={two} table={held} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start the race' }))
    expect(held.startTable).toHaveBeenCalledWith(5)
  })

  it('shows the puzzle with par in steps, its own ladder, and others only as counts', () => {
    mount()
    const puzzle = within(screen.getByRole('region', { name: 'puzzle' }))
    expect(puzzle.getByText('cold')).toBeTruthy()
    expect(puzzle.getByText('warm')).toBeTruthy()
    expect(puzzle.getByText('par 4 steps')).toBeTruthy()
    const ladder = within(screen.getByRole('region', { name: 'your ladder' }))
    expect(ladder.getAllByRole('listitem').map(item => item.textContent)).toEqual(['cold', 'cord'])
    expect(runners().getByRole('row', { name: /bob/ }).textContent).toContain('3 steps')
  })

  it('plays the word typed, trimmed and lowercased, on Enter', () => {
    const { held } = mount()
    const input = screen.getByRole('textbox', { name: 'next word' })
    fireEvent.change(input, { target: { value: ' Card ' } })
    fireEvent.submit(input)
    expect(held.play).toHaveBeenCalledWith('card')
  })

  // A refusal leaves the view as it was: the word stays to be fixed. A rung
  // the hub took clears it.
  it('keeps a refused word in the box and clears one the hub took', () => {
    const { held, rerender } = mount()
    const input = screen.getByRole('textbox', { name: 'next word' })
    fireEvent.change(input, { target: { value: 'cxrd' } })
    fireEvent.submit(input)
    rerender(<WordchainTable playerId="alice" connected view={view()} table={held} />)
    expect(input).toHaveValue('cxrd')

    fireEvent.change(input, { target: { value: 'card' } })
    const climbed = view({ runners: [{ playerId: 'alice', words: 2, left: false, ladder: ['cord', 'card'], wins: 0 }, view().runners[1]] })
    rerender(<WordchainTable playerId="alice" connected view={climbed} table={held} />)
    expect(screen.getByRole('textbox', { name: 'next word' })).toHaveValue('')
  })

  it('holds Play and Take back while a move is unanswered, and takes back only a rung', () => {
    const { held, rerender } = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Take back' }))
    expect(held.retract).toHaveBeenCalledTimes(1)

    rerender(<WordchainTable playerId="alice" connected view={view()} table={{ ...held, sending: true }} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'next word' }), { target: { value: 'card' } })
    expect(screen.getByRole('button', { name: 'Play' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Take back' })).toHaveProperty('disabled', true)

    const fresh = view({ runners: [{ playerId: 'alice', words: 0, left: false, ladder: [], wins: 0 }, view().runners[1]] })
    rerender(<WordchainTable playerId="alice" connected view={fresh} table={held} />)
    expect(screen.getByRole('button', { name: 'Take back' })).toHaveProperty('disabled', true)
  })

  it('takes the box away once the viewer finishes', () => {
    const done = view({ runners: [{ playerId: 'alice', words: 4, left: false, ladder: ['cord', 'card', 'ward', 'warm'], finishedAtMs: NOW + 9000, wins: 0 }, view().runners[1]] })
    mount({ view: done })
    expect(screen.queryByRole('textbox', { name: 'next word' })).toBeNull()
    expect(screen.getByText('You reached warm in 4 steps. Waiting for the others.')).toBeTruthy()
  })

  it('counts down to the hub’s deadline', () => {
    vi.useFakeTimers({ now: NOW })
    mount()
    expect(screen.getByLabelText('time left').textContent).toBe('3:00')
    act(() => vi.advanceTimersByTime(61_000))
    expect(screen.getByLabelText('time left').textContent).toBe('1:59')
  })

  it('shows every ladder and the result once over, and starts the next race on the same letters', () => {
    const over = view({
      phase: 'over',
      result: { ending: 'finished', winners: ['bob'], standings: ['bob', 'alice'] },
      runners: [
        { playerId: 'alice', words: 1, left: false, ladder: ['cord'], wins: 0 },
        { playerId: 'bob', words: 4, left: false, ladder: ['word', 'ward', 'warm'], finishedAtMs: NOW + 5000, wins: 3 }
      ]
    })
    const { held } = mount({ view: over })
    expect(screen.getByText('bob won in 4 steps.')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'your ladder' })).toBeNull()
    expect(runners().getByText('cold → word → ward → warm')).toBeTruthy()
    expect(runners().getByText('cold → cord')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next race' }))
    expect(held.startTable).toHaveBeenCalledWith(4)
  })

  it('offers another table or the room once closed', () => {
    const { held } = mount({ view: view({ phase: 'closed' }) })
    expect(screen.queryByRole('button', { name: 'Leave table' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(held.playAgain).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
    expect(held.leaveTable).toHaveBeenCalledTimes(1)
  })
})
