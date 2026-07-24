import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import ServiceDashboard from '../ServiceDashboard'

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

describe('ServiceDashboard', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/service/golf_hub/timeseries/')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(timeseriesResponse)) })
      }
      if (url.endsWith('/service/golf_hub')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(scalarResponse)) })
      }
      return Promise.resolve({ ok: false, text: () => Promise.resolve('') })
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
})
