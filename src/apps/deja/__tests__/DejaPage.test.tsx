import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DejaPage from '../pages/DejaPage'
import { fakeDejaFetch } from './fakeStream'
import { eventOf, stateOf } from './fixtures'

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// jsdom has no EventSource, so the page polls: the nav says so, in the
// page's own words, and the polled rows land.
describe('DejaPage', () => {
  it('shows the stream status in the nav and the rows the poll brings', async () => {
    const { fetchMock } = fakeDejaFetch({ events: [eventOf({ seq: 1 })], state: stateOf() })
    vi.stubGlobal('fetch', fetchMock)
    render(
      <MemoryRouter>
        <DejaPage />
      </MemoryRouter>
    )
    await act(() => vi.advanceTimersByTimeAsync(0))
    const nav = within(screen.getByRole('navigation'))
    expect(nav.getByText('MuchQ : Deja')).toBeInTheDocument()
    expect(nav.getByText('Polling')).toBeInTheDocument()
    expect(document.getElementById('deja-row-1')).not.toBeNull()
  })
})
