import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SoloRound from '../SoloRound'
import type { Puzzle } from '../contract'

const TIME_UP = 'Time’s up'
const BEST_KEY = 'wordchains.timeAttackBest.3.90s'
const puzzle: Puzzle = { start: 'cat', target: 'dog' }

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })

const renderRound = (startedAt: number, onSolved = vi.fn(), mode: 'sprint' | 'quick' = 'sprint') => render(
  <SoloRound
    starting={false}
    length={3}
    mode={mode}
    firstPuzzle={puzzle}
    startedAt={startedAt}
    onSolved={onSolved}
    onReplay={vi.fn()}
    onMenu={vi.fn()}
  />
)

const submit = async (word: string) => {
  const input = screen.getByRole('textbox', { name: 'Next word' })
  fireEvent.change(input, { target: { value: word } })
  await act(async () => {
    fireEvent.submit(input.closest('form')!)
  })
}

describe('a Time Attack round', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-26T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('offers Hint in Quick Play and not in Time Attack', () => {
    const quick = renderRound(Date.now(), vi.fn(), 'quick')
    expect(screen.getByRole('button', { name: 'Hint' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    quick.unmount()
    renderRound(Date.now())
    expect(screen.queryByRole('button', { name: 'Hint' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('runs the clock down and ends at the deadline, not before', () => {
    renderRound(Date.now())
    expect(screen.getByText('1:30')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(89_000)
    })
    expect(screen.getByText('0:01')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: TIME_UP })).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(screen.getByRole('heading', { name: TIME_UP })).toBeInTheDocument()
    expect(screen.queryByText('New personal best!')).not.toBeInTheDocument()
    expect(localStorage.getItem(BEST_KEY)).toBeNull()
  })

  it('keeps a personal best that a scoreless round does not replace', async () => {
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      void input
      const request = JSON.parse(String(init?.body)) as { action?: string; word?: string }
      if (request.action === 'start') return json(puzzle)
      if (request.word === 'dog') return json({ status: 'solved', result: { optimalSteps: 3, points: 150 } })
      return json({ status: 'accepted' })
    })
    const started = Date.now()
    const onSolved = vi.fn()
    const first = renderRound(started - 89_500, onSolved)
    await submit('cot')
    await submit('dot')
    await submit('dog')
    expect(screen.getByRole('status')).toHaveTextContent('Solved! +150 points')
    expect(onSolved).toHaveBeenCalledWith(150, true)
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(screen.getByRole('heading', { name: TIME_UP })).toBeInTheDocument()
    expect(screen.getByText('New personal best!')).toBeInTheDocument()
    expect(localStorage.getItem(BEST_KEY)).toBe('150')

    first.unmount()
    renderRound(Date.now())
    act(() => {
      vi.advanceTimersByTime(90_000)
    })
    expect(screen.getByRole('heading', { name: TIME_UP })).toBeInTheDocument()
    expect(screen.queryByText('New personal best!')).not.toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(localStorage.getItem(BEST_KEY)).toBe('150')
  })
})
