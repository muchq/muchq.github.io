import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import MetricsPage from '../MetricsPage'

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

const catalogResponse = {
  services: [
    { name: 'golf_hub', has_custom: true },
    { name: 'microgpt-serve', has_custom: true },
    { name: 'portrait', has_custom: true },
  ],
}

const containersResponse = {
  timestamp: new Date().toISOString(),
  containers: [
    {
      name: 'ubuntu-caddy-1',
      service: 'caddy',
      cpu_usage_percent: 1.0,
      cpu_throttled_seconds: 0,
      memory_usage_bytes: 1048576,
      memory_limit_bytes: 268435456,
      memory_usage_percent: 0.4,
      network_rx_bytes_per_sec: 0,
      network_tx_bytes_per_sec: 0,
      restarts_last_hour: 0,
      uptime_seconds: 7200,
      crash_looping: false,
      image: 'caddy:2-alpine',
      version: '2-alpine',
      reporting: true,
    },
  ],
}

const LocationSpy = () => {
  const location = useLocation()
  return <span data-testid="location">{location.pathname}</span>
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/metrics/:tab" element={<><MetricsPage /><LocationSpy /></>} />
      </Routes>
    </MemoryRouter>
  )

describe('MetricsPage', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/services')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(catalogResponse)) })
      }
      if (url.endsWith('/containers')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(containersResponse)) })
      }
      return Promise.resolve({ ok: false, text: () => Promise.resolve('') })
    }) as unknown as typeof fetch
  })

  it('builds tabs from the catalog with Host first', async () => {
    renderAt('/metrics/host')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Host and Containers are the two tabs that aren't services: the catalog
    // never lists them, so they're prepended rather than derived from it.
    const tabs = screen.getAllByRole('button').map((button) => button.textContent)
    expect(tabs.slice(0, 5)).toEqual(['Host', 'Containers', 'Golf Hub', 'MicroGPT', 'Portrait'])
    expect(screen.getByText('Host Metrics')).toBeTruthy()
  })

  it('resolves the containers tab instead of bouncing it to host', async () => {
    // `containers` was a legacy redirect to `host` while the overhaul had no
    // container view. It has one again, so the route resolves rather than
    // redirecting — and the catalog can't vouch for it, so the unknown-tab
    // redirect has to know it's built in.
    renderAt('/metrics/containers')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByTestId('location').textContent).toBe('/metrics/containers')
    expect(screen.getByTestId('containers-table')).toBeTruthy()
  })

  it('redirects legacy tabs to their new homes', async () => {
    renderAt('/metrics/system')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByTestId('location').textContent).toBe('/metrics/host')
  })

  it('maps the legacy microgpt tab to the catalog name', async () => {
    renderAt('/metrics/microgpt')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByTestId('location').textContent).toBe('/metrics/microgpt-serve')
  })

  it('bounces unknown services to host once the catalog loads', async () => {
    renderAt('/metrics/nonesuch')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByTestId('location').textContent).toBe('/metrics/host')
  })

  it('keeps the Host page alive when the catalog never loads', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: false, text: () => Promise.resolve('') })
    ) as unknown as typeof fetch

    renderAt('/metrics/host')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByText('Host Metrics')).toBeTruthy()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toContain('Host')
  })

  it('renders a service dashboard for a catalog service', async () => {
    renderAt('/metrics/golf_hub')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(screen.getByRole('heading', { level: 1, name: 'Golf Hub' })).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe('/metrics/golf_hub')
  })
})
