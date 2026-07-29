import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, screen, fireEvent, within } from '@testing-library/react'
import ServiceDashboard from '../ServiceDashboard'

// `data` length is forwarded onto the chart stubs: whether a chart spans the
// full selected window or only the samples it happened to get is precisely a
// question about how many rows it was given.
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="line-chart" data-row-count={data?.length ?? 0}>{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="area-chart" data-row-count={data?.length ?? 0}>{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
}))

const scalarResponse = {
  timestamp: new Date().toISOString(),
  service: 'golf_hub',
  standard: {
    requests_total: 1234,
    rate_per_sec: 1.25,
    success_count_5m: 100,
    failure_count_5m: 5,
    error_rate_percent: 4.8,
    avg_duration_microseconds: 1500,
    p95_duration_microseconds: 9500,
    active_requests: 2,
  },
  custom: [
    { title: 'Sessions', metrics: [{ label: 'active', value: 3, unit: 'sessions' }] },
    { title: 'Activity', metrics: [{ label: 'commands_per_sec', value: 0.5, unit: '/s' }] },
  ],
}

const timeseriesResponse = {
  time_range: '1d',
  start_time: new Date(Date.now() - 86400000).toISOString(),
  end_time: new Date().toISOString(),
  step: '30s',
  series: [
    { metric_name: 'request_rate', values: [{ timestamp: new Date().toISOString(), value: 1.2 }] },
    { metric_name: 'sessions_active', values: [{ timestamp: new Date().toISOString(), value: 3 }] },
  ],
}

// A healthy container, with the fields MoonBase#1218 added. Overrides let each
// test state only the fields it is actually about.
const containerDetail = (overrides: Record<string, unknown> = {}) => ({
  timestamp: new Date().toISOString(),
  container: {
    name: 'ubuntu-golf_hub-1',
    service: 'golf_hub',
    cpu_usage_percent: 3.5,
    cpu_throttled_seconds: 0,
    memory_usage_bytes: 100,
    memory_limit_bytes: 1000,
    memory_usage_percent: 10,
    network_rx_bytes_per_sec: 0,
    network_tx_bytes_per_sec: 0,
    restarts_last_hour: 0,
    uptime_seconds: 7200,
    crash_looping: false,
    // A full 40-char commit SHA, which is what deploys actually pin (the old
    // `abc1234` fixture was a short SHA the backend never sends, and it hid an
    // overflow that shipped).
    image: 'ghcr.io/muchq/golf_hub:c0bcc5049c30e654c319ae39627a4a8f7800d077',
    version: 'c0bcc5049c30e654c319ae39627a4a8f7800d077',
    reporting: true,
    ...overrides,
  },
})

const ok = (body: unknown) => Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(body)) })
const notFound = () => Promise.resolve({ ok: false, text: () => Promise.resolve('') })

describe('ServiceDashboard', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/service/golf_hub/timeseries/')) return ok(timeseriesResponse)
      if (url.endsWith('/service/golf_hub')) return ok(scalarResponse)
      // Keyed on the exact name so a request for the wrong container 404s
      // rather than being answered with golf_hub's stats.
      if (url.endsWith('/container/golf_hub')) return ok(containerDetail())
      return notFound()
    })
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  it('renders the standard block above custom groups', async () => {
    const onConnectionStateChange = vi.fn()
    render(<ServiceDashboard service="golf_hub" onConnectionStateChange={onConnectionStateChange} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByText('Golf Hub')).toBeTruthy()
    // Standard tiles: rate, error %, avg/p95 converted to ms, active, total.
    expect(screen.getByText('1.25')).toBeTruthy()
    expect(screen.getByText('4.8')).toBeTruthy()
    expect(screen.getByText('1.5')).toBeTruthy()
    expect(screen.getByText('9.5')).toBeTruthy()
    expect(screen.getByText('1,234')).toBeTruthy()
    expect(onConnectionStateChange).toHaveBeenCalledWith('connected')
  })

  it('renders custom groups and trends generically from descriptors', async () => {
    render(<ServiceDashboard service="golf_hub" onConnectionStateChange={vi.fn()} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByText('Sessions')).toBeTruthy()
    expect(screen.getByText('Activity')).toBeTruthy()
    expect(screen.getByText('Commands Per Sec')).toBeTruthy()
    expect(screen.getByText('sessions')).toBeTruthy()
    // The custom series charts under Trends; the standard series does not.
    expect(screen.getByText('Trends')).toBeTruthy()
    expect(screen.getByText('Sessions Active')).toBeTruthy()
  })

  it('shows only the standard block when a service has no custom metrics', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/timeseries/')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ ...timeseriesResponse, series: [timeseriesResponse.series[0]] })),
        })
      }
      if (url.endsWith('/service/golf_hub')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ ...scalarResponse, custom: [] })),
        })
      }
      return Promise.resolve({ ok: false, text: () => Promise.resolve('') })
    })

    render(<ServiceDashboard service="golf_hub" onConnectionStateChange={vi.fn()} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByText('Serving')).toBeTruthy()
    expect(screen.queryByText('Sessions')).toBeNull()
    expect(screen.queryByText('Trends')).toBeNull()
  })

  it('drops stale data and refetches when the service changes', async () => {
    const { rerender } = render(<ServiceDashboard service="golf_hub" onConnectionStateChange={vi.fn()} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    expect(screen.getByText('Sessions')).toBeTruthy()

    // Portrait's endpoints resolve to nothing, so anything still on
    // screen after the switch would be golf_hub's stale data.
    rerender(<ServiceDashboard service="portrait" onConnectionStateChange={vi.fn()} />)
    expect(screen.queryByText('Sessions')).toBeNull()

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    expect(screen.queryByText('Sessions')).toBeNull()
    const urls = mockFetch.mock.calls.map((call) => String(call[0]))
    expect(urls.some((url) => url.endsWith('/service/portrait'))).toBe(true)
  })

  it('charts the full selected window, not just the buckets with samples', async () => {
    // The fixture's window is 1 day at a 30s step with a single sample. A
    // chart that plots only its samples gets one row; the filled grid gets
    // one per bucket — 86400/30 + 1 — so the x-axis spans the selected range
    // even when the service was only up for a fraction of it.
    render(<ServiceDashboard service="golf_hub" onConnectionStateChange={vi.fn()} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    const counts = screen
      .getAllByTestId('line-chart')
      .map((chart) => Number(chart.getAttribute('data-row-count')))
    expect(Math.max(...counts)).toBe(2881)
  })

  it('says loading, not "no data", before the first fetch resolves', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    render(<ServiceDashboard service="golf_hub" onConnectionStateChange={vi.fn()} />)

    // A pending fetch is a promise of an answer, not an answer. "No data
    // available" flashing before every load claims a gap that doesn't exist.
    expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0)
    expect(screen.queryByText('No data available')).toBeNull()
    expect(screen.getByTestId('container-state').textContent).toBe('loading')
  })

  it('refetches with the selected range', async () => {
    const { container } = render(<ServiceDashboard service="golf_hub" onConnectionStateChange={vi.fn()} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    fireEvent.change(container.querySelector('select')!, { target: { value: '30m' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    const urls = mockFetch.mock.calls.map((call) => String(call[0]))
    expect(urls.some((url) => url.endsWith('/service/golf_hub/timeseries/30m'))).toBe(true)
  })

  it('reports failure and keeps the page shape when the API is down', async () => {
    mockFetch.mockImplementation(() => Promise.resolve({ ok: false, text: () => Promise.resolve('') }))
    const onConnectionStateChange = vi.fn()
    render(<ServiceDashboard service="golf_hub" onConnectionStateChange={onConnectionStateChange} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(onConnectionStateChange).toHaveBeenCalledWith('failed')
    expect(screen.getByText('Serving')).toBeTruthy()
    expect(screen.getAllByText('No data available').length).toBeGreaterThan(0)
  })

  describe('container health', () => {
    const renderAndSettle = async (service = 'golf_hub') => {
      render(<ServiceDashboard service={service} onConnectionStateChange={vi.fn()} />)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })
      return mockFetch.mock.calls.map((call) => String(call[0]))
    }

    it('reads health from the per-container endpoint instead of the whole host payload', async () => {
      const urls = await renderAndSettle()

      expect(urls.some((url) => url.endsWith('/container/golf_hub'))).toBe(true)
      // The point of the rewiring: the page used to pull every container's
      // stats and keep one row. Asserting the absence is what makes this test
      // fail against the previous implementation rather than pass either way.
      expect(urls.some((url) => url.endsWith('/host'))).toBe(false)

      expect(screen.getByTestId('container-state').textContent).toBe('up')
      expect(screen.getByTestId('container-uptime').textContent).toBe('2h')
      expect(screen.getByTestId('container-restarts').textContent).toBe('0')
      expect(within(screen.getByTestId('container-version')).getByText('c0bcc50')).toBeTruthy()
    })

    it('shortens the pinned commit SHA but keeps the full one on hover', async () => {
      // Deploys pin by full SHA, so this card gets 40 unbroken hex characters.
      // Rendered raw it has no break opportunity and paints outside its card,
      // shoving the strip across the page — which is what shipped in #243.
      await renderAndSettle()

      const commit = within(screen.getByTestId('container-version')).getByText('c0bcc50')
      // Abbreviating is only acceptable because the full value stays reachable.
      expect(commit.getAttribute('title')).toBe('c0bcc5049c30e654c319ae39627a4a8f7800d077')
    })

    it('links the running revision to its commit and its build', async () => {
      // Seeing which revision is live is half the job; the other half is
      // getting from it to the code and the CI run without hand-assembling a
      // GitHub URL from a SHA (MoonBase#1208 §4).
      await renderAndSettle()

      const version = within(screen.getByTestId('container-version'))
      const sha = 'c0bcc5049c30e654c319ae39627a4a8f7800d077'
      // The full SHA is what's linked, even though the short one is displayed.
      expect(version.getByText('c0bcc50').getAttribute('href')).toBe(`https://github.com/muchq/MoonBase/commit/${sha}`)
      expect(version.getByText('build').getAttribute('href')).toBe(
        `https://github.com/muchq/MoonBase/commit/${sha}/checks`,
      )
    })

    it('does not link an upstream image tag', async () => {
      // caddy:2-alpine has no MoonBase commit behind it, so /commit/2-alpine
      // would be a 404 dressed up as a useful link.
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/container/golf_hub')) return ok(containerDetail({ version: '2-alpine' }))
        if (url.endsWith('/service/golf_hub')) return ok(scalarResponse)
        return ok(timeseriesResponse)
      })
      await renderAndSettle()

      const version = screen.getByTestId('container-version')
      expect(version.textContent).toContain('2-alpine')
      expect(version.querySelector('a')).toBeNull()
    })

    it('leaves a version that is not a SHA alone', async () => {
      // Truncating `v2.1.0` to `v2.1.0`'s first 7 chars would be lossless by
      // luck; truncating a longer tag would not. Only hex gets cut.
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/container/golf_hub')) return ok(containerDetail({ version: 'v2.1.0-rc.3' }))
        if (url.endsWith('/service/golf_hub')) return ok(scalarResponse)
        return ok(timeseriesResponse)
      })
      await renderAndSettle()

      expect(screen.getByTestId('container-version').textContent).toBe('v2.1.0-rc.3')
    })

    it('surfaces a crash loop even when the service emits no metrics at all', async () => {
      // The case the strip exists for. A container that dies during startup
      // serves nothing, so both service endpoints come back empty and every
      // panel below renders "no data" — indistinguishable from idle-healthy.
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/container/golf_hub')) {
          return ok(containerDetail({ crash_looping: true, restarts_last_hour: 47, uptime_seconds: 8 }))
        }
        return notFound()
      })

      await renderAndSettle()

      expect(screen.getByTestId('container-state').textContent).toBe('crash looping')
      expect(screen.getByTestId('container-restarts').textContent).toBe('47')
      expect(screen.getByTestId('container-uptime').textContent).toBe('8s')
      // Proves the strip is not gated on the standard block, which is null here.
      expect(screen.queryByText('Sessions')).toBeNull()
    })

    it('stays up on restarts that have not met the crash-loop rule', async () => {
      // A container that restarted and then stayed up is up. The count is
      // still worth showing — it just isn't the verdict.
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/container/golf_hub')) {
          return ok(containerDetail({ crash_looping: false, restarts_last_hour: 2 }))
        }
        return notFound()
      })

      await renderAndSettle()

      expect(screen.getByTestId('container-state').textContent).toBe('up')
      expect(screen.getByTestId('container-restarts').textContent).toBe('2')
    })

    it('separates a non-reporting container from a healthy zero', async () => {
      // cAdvisor returning nothing leaves 0 restarts and 0 uptime, which is
      // byte-identical to a container that has never restarted. Only the
      // `reporting` flag tells them apart, so rendering must consult it —
      // drop that check and this container reads as "up".
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/container/golf_hub')) {
          return ok(containerDetail({ reporting: false, restarts_last_hour: 0, uptime_seconds: 0 }))
        }
        return notFound()
      })

      await renderAndSettle()

      expect(screen.getByTestId('container-state').textContent).toBe('not reporting')
      expect(screen.getByTestId('container-uptime').textContent).toBe('—')
      expect(screen.getByTestId('container-restarts').textContent).toBe('—')
    })

    it('says unknown when no container backs the service', async () => {
      // portrait's container endpoint 404s under the default mock.
      await renderAndSettle('portrait')

      expect(screen.getByTestId('container-state').textContent).toBe('unknown')
    })

    it('clears the previous service\'s container when switching tabs', async () => {
      const { rerender } = render(<ServiceDashboard service="golf_hub" onConnectionStateChange={vi.fn()} />)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })
      expect(screen.getByTestId('container-state').textContent).toBe('up')

      // portrait has no container. Leaving golf_hub's "up" on screen would
      // report a healthy container for a service that has none.
      rerender(<ServiceDashboard service="portrait" onConnectionStateChange={vi.fn()} />)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(screen.getByTestId('container-state').textContent).toBe('unknown')
    })

    it('clears a container that disappears between polls', async () => {
      // Distinct from the tab switch, which resets during render. Here the
      // service never changes: the container is removed under it, by a rename
      // or a compose edit. Keeping the last good reading would report a
      // healthy container for one that no longer exists — and unlike a blank
      // panel, a stale "up" doesn't look like missing data.
      vi.useFakeTimers()
      try {
        render(<ServiceDashboard service="golf_hub" onConnectionStateChange={vi.fn()} />)
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0)
        })
        expect(screen.getByTestId('container-state').textContent).toBe('up')

        mockFetch.mockImplementation((url: string) => {
          if (url.includes('/service/golf_hub/timeseries/')) return ok(timeseriesResponse)
          if (url.endsWith('/service/golf_hub')) return ok(scalarResponse)
          return notFound()
        })
        await act(async () => {
          await vi.advanceTimersByTimeAsync(30000)
        })

        expect(screen.getByTestId('container-state').textContent).toBe('unknown')
      } finally {
        vi.useRealTimers()
      }
    })

    it('falls back to a dash when the image carries no tag', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith('/container/golf_hub')) return ok(containerDetail({ image: 'golf_hub', version: '' }))
        return notFound()
      })

      await renderAndSettle()

      expect(screen.getByTestId('container-version').textContent).toBe('—')
    })
  })
})
