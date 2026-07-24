import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, screen, fireEvent } from '@testing-library/react'
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
})
