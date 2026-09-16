import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DejaDashboard from '../components/DejaDashboard'
import { rowId } from '../rows'
import { TOKENS, anomalyEvent, hitEvent, netEvent, oneOfEach, stateOf } from './fixtures'
import { FakeEventSource, fakeDejaFetch } from './fakeStream'

vi.mock('recharts', () => ({
  LineChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="line-chart" data-row-count={data?.length ?? 0}>{children}</div>
  ),
  Line: ({ dataKey }: { dataKey: string }) => <div data-testid="line" data-key={dataKey} />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

beforeEach(() => {
  vi.useFakeTimers()
  FakeEventSource.reset()
})

afterEach(() => {
  vi.useRealTimers()
})

const mount = (script: Parameters<typeof fakeDejaFetch>[0]) => {
  const fake = fakeDejaFetch(script)
  const onStatusChange = vi.fn()
  render(<DejaDashboard onStatusChange={onStatusChange} deps={{ EventSource: FakeEventSource, fetch: fake.fetchMock }} />)
  return { ...fake, onStatusChange }
}

const goLive = async () => {
  await act(async () => FakeEventSource.last().open())
  await act(() => vi.advanceTimersByTimeAsync(0))
}

const rowOf = (seq: number) => {
  const row = document.getElementById(rowId(seq))
  if (!row) throw new Error(`no row for seq ${seq}`)
  return row
}

describe('DejaDashboard', () => {
  it('colours each row by its outcome and shows the actual token, newest on top', async () => {
    const { onStatusChange } = mount({ events: oneOfEach, state: stateOf() })
    expect(onStatusChange).toHaveBeenLastCalledWith('connecting')
    await goLive()
    expect(onStatusChange).toHaveBeenLastCalledWith('live')

    const tape = screen.getByRole('list', { name: 'Scored requests' })
    const rows = within(tape).getAllByRole('listitem')
    expect(rows.map((row) => row.getAttribute('data-outcome'))).toEqual([
      'novel', 'anomaly', 'miss', 'near', 'hit', 'warmup',
    ])
    for (const row of rows) {
      const outcome = row.getAttribute('data-outcome')!
      // The CSS hook is the outcome's own class, not only the data attribute.
      expect([...row.classList].some((c) => c.includes(outcome))).toBe(true)
    }
    expect(within(rowOf(hitEvent.seq)).getByTestId('actual')).toHaveTextContent(TOKENS.iili)
    expect(within(rowOf(anomalyEvent.seq)).getByTestId('actual')).toHaveTextContent(TOKENS.probe)
  })

  it('shows the context chips oldest first and the bigram top-3 as bars, the net as a dash', async () => {
    mount({ events: [anomalyEvent], state: stateOf() })
    await goLive()
    const row = within(rowOf(anomalyEvent.seq))
    expect(row.getAllByTestId('chip').map((c) => c.textContent)).toEqual([TOKENS.home, TOKENS.stats, TOKENS.iili])
    const bigram = within(row.getByTestId('bigram'))
    expect(bigram.getAllByRole('meter').map((m) => m.getAttribute('aria-valuenow'))).toEqual(['0.9', '0.1'])
    expect(row.getByTestId('net')).toHaveTextContent('—')
    expect(within(row.getByTestId('net')).queryAllByRole('meter')).toHaveLength(0)
  })

  it('draws the net bars and its curve only once the net is non-null', async () => {
    mount({ events: [hitEvent], state: stateOf() })
    await goLive()
    const lineKeys = () => screen.getAllByTestId('line').map((l) => l.getAttribute('data-key'))
    expect(lineKeys()).not.toContain('net')
    act(() => FakeEventSource.last().emit(netEvent))
    expect(within(within(rowOf(netEvent.seq)).getByTestId('net')).getAllByRole('meter')).toHaveLength(2)
    expect(lineKeys()).toContain('net')
  })

  it('counts from the state and shows warmup progress until the threshold is live', async () => {
    const { script } = mount({ events: [], state: stateOf({ step: 250, vocab_size: 12, anomalies: 3, novelties: 9 }) })
    await goLive()
    const counters = within(screen.getByRole('region', { name: 'Counters' }))
    expect(counters.getByTestId('steps')).toHaveTextContent('250')
    expect(counters.getByTestId('vocab')).toHaveTextContent('12 / 2,048')
    expect(counters.getByTestId('anomalies')).toHaveTextContent('3')
    expect(counters.getByTestId('novelties')).toHaveTextContent('9')
    expect(counters.getByRole('progressbar', { name: 'Warmup' })).toHaveAttribute('aria-valuenow', '250')
    expect(counters.getByTestId('warmup')).toHaveTextContent('250 / 1,000')

    script.state = stateOf({ step: 1200, threshold: 4.2, anomalies: 4 })
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(counters.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(counters.getByTestId('threshold')).toHaveTextContent('4.20')
    expect(counters.getByTestId('anomalies')).toHaveTextContent('4')
  })

  it('offers every token the page has seen to Ask it', async () => {
    mount({ events: [anomalyEvent], state: stateOf() })
    await goLive()
    const ask = within(screen.getByRole('region', { name: 'Ask it' }))
    expect(ask.getByText('4 tokens seen')).toBeInTheDocument()
  })
})
