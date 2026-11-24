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
  practice: false,
  ...over
})

const table = (over: Partial<WordchainTableProps['table']> = {}): WordchainTableProps['table'] => ({
  opening: false,
  sending: false,
  refusals: 0,
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

// Each runner's row as its cells read: name, climb, wins.
const rows = () =>
  runners()
    .getAllByRole('row')
    .slice(1)
    .map(row => [...row.querySelectorAll('th, td')].map(cell => cell.textContent))

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
})

describe('WordchainTable', () => {
  // A new race is a new puzzle: what was typed for the last one, and the
  // letters picked before it, give way to the race the hub started.
  describe('between races', () => {
    it('drops a word typed and never sent when the next race starts', () => {
      const fresh = (over: Partial<WordchainView>) =>
        view({ runners: [{ playerId: 'alice', words: 0, left: false, ladder: [], wins: 0 }, view().runners[1]], ...over })
      const { held, rerender } = mount({ view: fresh({}) })
      fireEvent.change(screen.getByRole('textbox', { name: 'next word' }), { target: { value: 'cot' } })
      rerender(<WordchainTable playerId="alice" connected view={fresh({ start: 'heat', target: 'cool', startedAtMs: NOW + 200_000 })} table={held} />)
      expect(screen.getByRole('textbox', { name: 'next word' })).toHaveValue('')
    })

    it('offers the last race’s letters for the next', () => {
      const over = (start: string) => view({ phase: 'over', start, result: { ending: 'timeout', winners: [], standings: [] } })
      const { held, rerender } = mount({ view: over('cold') })
      expect(screen.getByRole('combobox', { name: 'Race' })).toHaveValue('4')
      rerender(<WordchainTable playerId="alice" connected view={over('heats')} table={held} />)
      expect(screen.getByRole('combobox', { name: 'Race' })).toHaveValue('5')
    })
  })

  describe('focus and leaving', () => {
    it('moves focus to the heading when the word box goes at a finish', () => {
      const { held, rerender } = mount()
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'next word' }))
      const done = view({ runners: [{ playerId: 'alice', words: 1, left: false, ladder: ['warm'], finishedAtMs: NOW + 1, wins: 0 }, view().runners[1]] })
      rerender(<WordchainTable playerId="alice" connected view={done} table={held} />)
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Word chains · W1' }))
    })

    it('asks before leaving a race, and Stay puts the button and focus back', () => {
      const { held } = mount()
      fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
      expect(held.leaveTable).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Leave the race' }))
      fireEvent.click(screen.getByRole('button', { name: 'Stay' }))
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Leave table' }))
      fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
      fireEvent.click(screen.getByRole('button', { name: 'Leave the race' }))
      expect(held.leaveTable).toHaveBeenCalledTimes(1)
    })

    it('leaves at once between races', () => {
      const { held } = mount({ view: view({ phase: 'over', result: { ending: 'timeout', winners: [], standings: [] } }) })
      fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
      expect(held.leaveTable).toHaveBeenCalledTimes(1)
    })
  })

  it('offers practice alone, then a race of the letters picked once a second seat comes', () => {
    const alone = view({ phase: 'waiting', start: undefined, target: undefined, par: undefined, runners: [{ playerId: 'alice', words: 0, left: false, wins: 0 }] })
    const { held, rerender } = mount({ view: alone })
    expect(screen.getByText('Waiting for a second seat, or practice alone.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Start the race' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Practice' }))
    expect(held.startTable).toHaveBeenCalledWith(4)

    const two = { ...alone, runners: [...alone.runners, { playerId: 'bob', words: 0, left: false, wins: 0 }] }
    rerender(<WordchainTable playerId="alice" connected view={two} table={held} />)
    expect(screen.queryByRole('button', { name: 'Practice' })).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: 'Race' }), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start the race' }))
    expect(held.startTable).toHaveBeenLastCalledWith(5)
  })

  describe('practice', () => {
    const solo = (over: Partial<WordchainView> = {}) =>
      view({ practice: true, runners: [{ playerId: 'alice', words: 1, left: false, ladder: ['cord'], wins: 0 }], ...over })

    it('says how the practice went, naming no winner, and practises again', () => {
      const done = solo({
        phase: 'over',
        runners: [{ playerId: 'alice', words: 3, left: false, ladder: ['cord', 'word', 'warm'], finishedAtMs: NOW + 1, wins: 0 }],
        result: { ending: 'finished', winners: ['alice'], standings: ['alice'] }
      })
      const { held } = mount({ view: done })
      expect(screen.getByText('Finished in 3 steps (par 4).')).toBeTruthy()
      expect(screen.getByText('Practice again when you’re ready.')).toBeTruthy()
      expect(screen.queryByText('Anyone can start the next race.')).toBeNull()
      expect(screen.queryByText(/won/)).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Practice again' }))
      expect(held.startTable).toHaveBeenCalledWith(4)
    })

    it('says so while racing alone', () => {
      mount({ view: solo() })
      expect(screen.getByText('Practice: one letter at a time, every rung a word: cold to warm.')).toBeTruthy()
    })

    it('leaves at once, with nothing to give up', () => {
      const { held } = mount({ view: solo() })
      fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
      expect(held.leaveTable).toHaveBeenCalledTimes(1)
    })
  })

  it('shows the puzzle with par in steps, its own ladder, and others only as counts', () => {
    mount()
    const puzzle = within(screen.getByRole('region', { name: 'puzzle' }))
    expect(puzzle.getByText('cold')).toBeTruthy()
    expect(puzzle.getByText('warm')).toBeTruthy()
    expect(puzzle.getByText('par 4 steps')).toBeTruthy()
    const ladder = within(screen.getByRole('region', { name: 'your ladder' }))
    expect(ladder.getAllByRole('listitem').map(item => item.textContent)).toEqual(['cold', 'cord'])
    expect(rows()).toEqual([
      ['you', '1 step', '0'],
      ['bob', '3 steps', '2']
    ])
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
    expect(screen.getByText('3:00 left')).toBeTruthy()
    act(() => vi.advanceTimersByTime(61_000))
    expect(screen.getByText('1:59 left')).toBeTruthy()
  })

  it('shows no clock once the race is over', () => {
    mount({ view: view({ phase: 'over', result: { ending: 'timeout', winners: [], standings: ['alice', 'bob'] } }) })
    expect(screen.queryByText(/ left$/)).toBeNull()
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
    expect(rows()).toEqual([
      ['you', '1 stepcold → cord', '0'],
      ['bob', 'finished in 4 stepscold → word → ward → warm', '3']
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Next race' }))
    expect(held.startTable).toHaveBeenCalledWith(4)
    // Every ladder's words, and the puzzle's, can be looked up.
    for (const word of ['cold', 'cord', 'word', 'ward', 'warm']) {
      expect(runners().getAllByRole('button', { name: `Define ${word}` }).length).toBeGreaterThan(0)
    }
    const puzzle = within(screen.getByRole('region', { name: 'puzzle' }))
    expect(puzzle.getByRole('button', { name: 'Define cold' })).toBeTruthy()
    expect(puzzle.getByRole('button', { name: 'Define warm' })).toBeTruthy()
  })

  it('looks up the words on the viewer’s own ladder while racing, and nobody else’s', () => {
    mount()
    const ladder = within(screen.getByRole('region', { name: 'your ladder' }))
    expect(ladder.getByRole('button', { name: 'Define cord' })).toBeTruthy()
    expect(runners().queryAllByRole('button')).toEqual([])
  })

  it('offers another table or the room once closed', () => {
    const { held } = mount({ view: view({ phase: 'closed' }) })
    expect(screen.queryByRole('button', { name: 'Leave table' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(held.playAgain).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
    expect(held.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('turns sound effects off and on, remembered on this device', () => {
    mount()
    const toggle = screen.getByRole('checkbox', { name: 'Sound effects' })
    expect(toggle).toBeChecked()
    fireEvent.click(toggle)
    expect(toggle).not.toBeChecked()
    cleanup()
    mount()
    expect(screen.getByRole('checkbox', { name: 'Sound effects' })).not.toBeChecked()
  })
})
