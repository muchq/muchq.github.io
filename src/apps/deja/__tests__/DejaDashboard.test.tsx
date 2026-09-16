import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DejaDashboard from '../components/DejaDashboard'
import { Row } from '../components/Tape'
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

    const tape = screen.getByRole('table', { name: 'Scored requests' })
    // The header names the columns for a reader too, so it is not hidden from one.
    expect(within(tape).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'outcome', 'seq', 'context', 'bigram', 'net', 'actual',
    ])
    const rows = within(tape).getAllByRole('row').filter((row) => row.hasAttribute('data-outcome'))
    expect(rows.map((row) => row.getAttribute('data-outcome'))).toEqual([
      'novel', 'anomaly', 'miss', 'near', 'hit', 'warmup',
    ])
    for (const row of rows) {
      const outcome = row.getAttribute('data-outcome')!
      // The CSS hook is the outcome's own class, not only the data attribute.
      expect([...row.classList].some((c) => c.includes(outcome))).toBe(true)
      expect(within(row).getByTestId('outcome')).toHaveTextContent(outcome)
    }
    expect(within(rowOf(hitEvent.seq)).getByTestId('actual')).toHaveTextContent('GET /iili/v1/r/*')
    expect(within(rowOf(hitEvent.seq)).getByTestId('actual')).toHaveAttribute('title', TOKENS.iili)
    expect(within(rowOf(anomalyEvent.seq)).getByTestId('actual')).toHaveTextContent('GET /.env')
    expect(within(rowOf(anomalyEvent.seq)).getByTestId('actual')).toHaveAttribute('title', TOKENS.probe)

    const legend = screen.getByRole('list', { name: 'Outcome key' })
    expect(within(legend).getAllByRole('listitem').map((item) => item.getAttribute('data-outcome'))).toEqual([
      'hit', 'near', 'miss', 'anomaly', 'novel', 'warmup',
    ])
    expect(screen.getByText(/newest 200/i)).toBeInTheDocument()
  })

  it('shows shortened context chips with the full token on title, and bigram bars', async () => {
    mount({ events: [anomalyEvent], state: stateOf() })
    await goLive()
    const row = within(rowOf(anomalyEvent.seq))
    const chips = row.getAllByTestId('chip')
    expect(chips.map((c) => c.getAttribute('title'))).toEqual([TOKENS.home, TOKENS.stats, TOKENS.iili])
    expect(chips.map((c) => c.textContent)).toEqual(['GET /', 'GET /stats/v1/summary', 'GET /iili/v1/r/*'])
    // The oldest chip is the faintest, but stays readable.
    const opacity = (chip: HTMLElement) => Number(chip.style.opacity)
    expect(opacity(chips[0])).toBeGreaterThanOrEqual(0.6)
    expect(opacity(chips[0])).toBeLessThan(opacity(chips[1]))
    expect(opacity(chips[2])).toBe(1)
    const bigram = within(row.getByTestId('bigram'))
    expect(bigram.getAllByRole('meter').map((m) => m.getAttribute('aria-valuenow'))).toEqual(['0.9', '0.1'])
    expect(row.getByTestId('net')).toHaveTextContent('—')
    expect(within(row.getByTestId('net')).queryAllByRole('meter')).toHaveLength(0)
  })

  it('draws the net bars and its curve only once the net is non-null', async () => {
    mount({ events: [hitEvent], state: stateOf() })
    await goLive()
    const lineKeys = () => screen.getAllByTestId('line').map((l) => l.getAttribute('data-key'))
    // Both charts: the threshold behind the bigram, learning curve first.
    expect(lineKeys()).toEqual(['threshold', 'bigram', 'threshold', 'surpriseBigram'])
    act(() => FakeEventSource.last().emit(netEvent))
    expect(within(within(rowOf(netEvent.seq)).getByTestId('net')).getAllByRole('meter')).toHaveLength(2)
    expect(lineKeys()).toEqual(['threshold', 'bigram', 'net', 'threshold', 'surpriseBigram', 'surpriseNet'])
  })

  it('a tape row is memoised, so the rows the reducer keeps do not re-render', () => {
    expect(Row).toHaveProperty('$$typeof', Symbol.for('react.memo'))
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
