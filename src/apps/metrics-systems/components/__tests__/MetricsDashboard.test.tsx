import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, screen, fireEvent, within } from '@testing-library/react'
import MetricsDashboard from '../MetricsDashboard'

// Mock the recharts library to avoid canvas issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}))

const hostResponse = {
  timestamp: new Date().toISOString(),
  system: {
    timestamp: new Date().toISOString(),
    cpu: { utilization_percent: 42.5, by_core: { '0': 40.1 } },
    memory: {
      total_bytes: 12884901888,
      used_bytes: 6442450944,
      free_bytes: 4294967296,
      cached_bytes: 2147483648,
      utilization_percent: 50.0,
    },
    disk: [],
    network: [],
  },
  containers: [
    {
      name: 'caddy',
      cpu_usage_percent: 5.5,
      cpu_throttled_seconds: 0,
      memory_usage_bytes: 1048576,
      memory_limit_bytes: 268435456,
      memory_usage_percent: 0.4,
      network_rx_bytes_per_sec: 0,
      network_tx_bytes_per_sec: 0,
    },
  ],
}

const hostTimeseriesResponse = {
  time_range: '1d',
  start_time: new Date(Date.now() - 86400000).toISOString(),
  end_time: new Date().toISOString(),
  step: '30s',
  series: [
    {
      metric_name: 'cpu_utilization',
      values: [{ timestamp: new Date().toISOString(), value: 40.0 }],
    },
    {
      metric_name: 'container_cpu_usage',
      labels: { name: 'caddy' },
      values: [{ timestamp: new Date().toISOString(), value: 5.0 }],
    },
  ],
}

describe('MetricsDashboard (host view)', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/host/timeseries/')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(hostTimeseriesResponse)) })
      }
      if (url.endsWith('/host')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(hostResponse)) })
      }
      return Promise.resolve({ ok: false, text: () => Promise.resolve('') })
    })
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  it('renders host scalars and the container table from the merged endpoint', async () => {
    const onConnectionStateChange = vi.fn()
    render(<MetricsDashboard onConnectionStateChange={onConnectionStateChange} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByText('Host Metrics')).toBeTruthy()
    expect(screen.getByText('42.5%')).toBeTruthy()
    expect(screen.getAllByText('caddy').length).toBeGreaterThan(0)
    expect(onConnectionStateChange).toHaveBeenCalledWith('connected')
  })

  it('fetches only the merged host endpoints', async () => {
    render(<MetricsDashboard onConnectionStateChange={vi.fn()} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    const urls = mockFetch.mock.calls.map((call) => String(call[0]))
    expect(urls.some((url) => url.endsWith('/host'))).toBe(true)
    expect(urls.some((url) => url.includes('/host/timeseries/'))).toBe(true)
    expect(urls.some((url) => url.includes('/scalar/'))).toBe(false)
    expect(urls.some((url) => url.includes('/timeseries/system'))).toBe(false)
  })

  it('refetches with the selected range', async () => {
    const { container } = render(<MetricsDashboard onConnectionStateChange={vi.fn()} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    const select = container.querySelector('select')!
    fireEvent.change(select, { target: { value: '7d' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    const urls = mockFetch.mock.calls.map((call) => String(call[0]))
    expect(urls.some((url) => url.endsWith('/host/timeseries/7d'))).toBe(true)
  })

  it('stays up with empty sections when the API is down', async () => {
    mockFetch.mockImplementation(() => Promise.resolve({ ok: false, text: () => Promise.resolve('') }))
    const onConnectionStateChange = vi.fn()
    render(<MetricsDashboard onConnectionStateChange={onConnectionStateChange} />)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByText('Host Metrics')).toBeTruthy()
    expect(screen.queryByText('caddy')).toBeNull()
  })

  describe('container cards', () => {
    // Six, because the bug this covers rendered the first four. A fixture of
    // four or fewer passes either way and would prove nothing.
    const makeContainer = (service: string, overrides: Record<string, unknown> = {}) => ({
      name: `ubuntu-${service}-1`,
      service,
      cpu_usage_percent: 1.5,
      cpu_throttled_seconds: 0,
      memory_usage_bytes: 1048576,
      memory_limit_bytes: 268435456,
      memory_usage_percent: 0.4,
      network_rx_bytes_per_sec: 0,
      network_tx_bytes_per_sec: 0,
      restarts_last_hour: 0,
      uptime_seconds: 7200,
      crash_looping: false,
      image: `ghcr.io/muchq/${service}:abc1234`,
      version: 'abc1234',
      reporting: true,
      ...overrides,
    })

    const withContainers = (containers: unknown[]) => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/host/timeseries/')) {
          return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(hostTimeseriesResponse)) })
        }
        if (url.endsWith('/host')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ ...hostResponse, containers })),
          })
        }
        return Promise.resolve({ ok: false, text: () => Promise.resolve('') })
      })
    }

    const settle = async () => {
      render(<MetricsDashboard onConnectionStateChange={vi.fn()} />)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })
    }

    it('renders every container, not just the first four', async () => {
      const services = ['caddy', 'postgres', 'prometheus', 'portrait', 'microgpt-serve', 'golf_hub']
      withContainers(services.map((s) => makeContainer(s)))

      await settle()

      const cards = screen.getByTestId('container-cards')
      expect(cards.children.length).toBe(6)
      // Naming the two a slice(0, 4) would drop beats asserting a count alone:
      // a truncated list still has a length, just the wrong one.
      for (const service of services) {
        expect(within(cards).getByText(service)).toBeTruthy()
      }
    })

    it('sorts an unhealthy container to the front however the API ordered it', async () => {
      // Last in the payload, so a render that preserves Prometheus's order
      // leaves the only container worth looking at at the bottom — and, before
      // the slice fix, off the page entirely.
      withContainers([
        makeContainer('caddy'),
        makeContainer('postgres'),
        makeContainer('prometheus'),
        makeContainer('portrait'),
        makeContainer('microgpt-serve', { restarts_last_hour: 2 }),
        makeContainer('golf_hub', { crash_looping: true, restarts_last_hour: 47, uptime_seconds: 8 }),
      ])

      await settle()

      const cards = screen.getByTestId('container-cards')
      const order = Array.from(cards.children).map((card) => card.querySelector('div')!.textContent)
      expect(order[0]).toBe('golf_hub')
      expect(order[1]).toBe('microgpt-serve')
      expect(screen.getByTestId('container-card-state-golf_hub').textContent).toBe('crash looping')
      expect(screen.getByTestId('container-card-state-microgpt-serve').textContent).toBe('2 restarts')
      expect(screen.getByTestId('container-card-state-caddy').textContent).toBe('up 2h')
    })

    it('marks a non-reporting container instead of rendering it as up', async () => {
      // Zeroes from a failed cAdvisor query are indistinguishable from a
      // container that simply has not restarted; only `reporting` separates
      // them, and "up —" is a worse lie than an explicit gap.
      withContainers([makeContainer('caddy', { reporting: false, restarts_last_hour: 0, uptime_seconds: 0 })])

      await settle()

      expect(screen.getByTestId('container-card-state-caddy').textContent).toBe('not reporting')
    })

    it('labels a container by its compose service, not by parsing the name', async () => {
      // The project prefix is `ubuntu-` on the deployed host but the directory
      // name under local_deploy.sh, so name-parsing is a guess that happens to
      // be right in production. A fixture prefixed `ubuntu-` would pass either
      // way; this one only passes if the label is what's rendered.
      //
      // The `-10` is the second trap: the old `.replace('-1', '')` cut the
      // first literal "-1" anywhere in the string, giving `caddy0`.
      withContainers([{ ...makeContainer('caddy'), name: 'moonbase-caddy-10' }])

      await settle()

      const cards = screen.getByTestId('container-cards')
      expect(within(cards).getByText('caddy')).toBeTruthy()
      expect(within(cards).queryByText('moonbase-caddy')).toBeNull()
      expect(within(cards).queryByText('caddy0')).toBeNull()
    })

    it('falls back to the container name when the service label is absent', async () => {
      // A prom_proxy older than MoonBase#1218 sends no `service` field.
      const legacy: Record<string, unknown> = makeContainer('caddy')
      delete legacy.service
      withContainers([legacy])

      await settle()

      expect(within(screen.getByTestId('container-cards')).getByText('caddy')).toBeTruthy()
    })
  })
})
