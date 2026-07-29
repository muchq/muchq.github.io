import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, screen, within } from '@testing-library/react'
import ContainersDashboard from '../ContainersDashboard'

const SHA_A = 'c0bcc5049c30e654c319ae39627a4a8f7800d077'
const SHA_B = 'ff11aa22bb33cc44dd55ee66ff77aa88bb99cc00'

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
  last_seen_ago_seconds: 5,
  oom_events_last_hour: 0,
  image: `ghcr.io/muchq/${service}:${SHA_A}`,
  version: SHA_A,
  reporting: true,
  ...overrides,
})

describe('ContainersDashboard', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  const withContainers = (containers: unknown[]) => {
    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/containers')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ timestamp: new Date().toISOString(), containers })),
        })
      }
      return Promise.resolve({ ok: false, text: () => Promise.resolve('') })
    })
  }

  const settle = async () => {
    render(<ContainersDashboard onConnectionStateChange={() => {}} />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
  }

  beforeEach(() => {
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch as unknown as typeof fetch
    withContainers([makeContainer('golf_hub')])
  })

  it('lists infrastructure containers that have no service page at all', async () => {
    // The reason this tab exists. Caddy, prometheus and postgres emit no app
    // metrics, so the catalog never lists them and they appear on no service
    // page — the infrastructure everything else depends on was invisible.
    withContainers([
      makeContainer('golf_hub'),
      makeContainer('caddy', { image: 'caddy:2-alpine', version: '2-alpine' }),
      makeContainer('prometheus', { image: 'prom/prometheus:v2.55.0', version: 'v2.55.0' }),
      makeContainer('postgres', { image: 'postgres:16', version: '16' }),
    ])

    await settle()

    expect(screen.getByTestId('container-row-caddy')).toBeTruthy()
    expect(screen.getByTestId('container-row-prometheus')).toBeTruthy()
    expect(screen.getByTestId('container-row-postgres')).toBeTruthy()
  })

  it('sorts unhealthy containers to the top', async () => {
    // ~14 containers means anything ordered by name puts the one worth looking
    // at halfway down a list nobody scrolls to the bottom of.
    withContainers([
      makeContainer('aaa_healthy'),
      makeContainer('zzz_looping', { crash_looping: true, restarts_last_hour: 5, uptime_seconds: 30 }),
      makeContainer('mmm_churn', { restarts_last_hour: 2 }),
    ])

    await settle()

    const rows = within(screen.getByTestId('containers-table')).getAllByRole('row').slice(1)
    const labels = rows.map((row) => row.getAttribute('data-testid'))
    expect(labels).toEqual(['container-row-zzz_looping', 'container-row-mmm_churn', 'container-row-aaa_healthy'])
  })

  it('does not flag a container that restarted and then stayed up', async () => {
    // Every container restarts once when the host reboots, and the count sits
    // at 1 for the following hour. Treating that as a state marked the entire
    // stack unhealthy while every service was answering requests.
    withContainers([makeContainer('golf_hub', { restarts_last_hour: 1, uptime_seconds: 720 })])

    await settle()

    expect(screen.getByTestId('container-row-state-golf_hub').textContent).toBe('up')
    expect(screen.getByTestId('container-row-golf_hub').className).toBe('')
  })

  it('shows how stale each container is, which uptime cannot answer', async () => {
    // A stopped container has no current run, so uptime says nothing; its
    // last_seen keeps counting up until retention drops the series, which is
    // what keeps "deployed but down" on the page rather than absent from it.
    withContainers([makeContainer('golf_hub', { last_seen_ago_seconds: 240 })])

    await settle()

    expect(within(screen.getByTestId('container-row-golf_hub')).getByText('4m')).toBeTruthy()
  })

  it('flags a container running a revision the rest of the stack is not', async () => {
    // The deploy-did-not-recreate-it case: every other signal looks healthy
    // while one service quietly serves yesterday's code.
    withContainers([
      makeContainer('golf_hub'),
      makeContainer('mithril'),
      makeContainer('portrait', { version: SHA_B, image: `ghcr.io/muchq/portrait:${SHA_B}` }),
    ])

    await settle()

    expect(within(screen.getByTestId('container-row-portrait')).getByTestId('version-drift')).toBeTruthy()
    expect(within(screen.getByTestId('container-row-golf_hub')).queryByTestId('version-drift')).toBeNull()
  })

  it('flags nothing when the whole stack agrees', async () => {
    withContainers([makeContainer('golf_hub'), makeContainer('mithril'), makeContainer('portrait')])

    await settle()

    expect(screen.queryByTestId('version-drift')).toBeNull()
  })

  it('never calls an upstream image tag drift', async () => {
    // caddy:2-alpine is not pinned per commit and never will be, so comparing
    // it against a deploy SHA would flag it on every single deploy.
    withContainers([
      makeContainer('golf_hub'),
      makeContainer('mithril'),
      makeContainer('caddy', { image: 'caddy:2-alpine', version: '2-alpine' }),
    ])

    await settle()

    const caddy = within(screen.getByTestId('container-row-caddy'))
    expect(caddy.queryByTestId('version-drift')).toBeNull()
    // And no link either — /commit/2-alpine is a 404 dressed as a useful link.
    expect(screen.getByTestId('container-row-caddy').querySelector('a')).toBeNull()
  })

  it('links a pinned revision to its commit and build', async () => {
    await settle()

    const row = within(screen.getByTestId('container-row-golf_hub'))
    expect(row.getByText('c0bcc50').getAttribute('href')).toBe(`https://github.com/muchq/MoonBase/commit/${SHA_A}`)
    expect(row.getByText('build').getAttribute('href')).toBe(
      `https://github.com/muchq/MoonBase/commit/${SHA_A}/checks`,
    )
  })

  it('does not report figures for a container it cannot see', async () => {
    // A failed cAdvisor query leaves zeros, and 0% CPU on a healthy-looking row
    // is a claim. The dash says we have no reading rather than a reading of 0.
    withContainers([makeContainer('golf_hub', { reporting: false, uptime_seconds: 0, restarts_last_hour: 0 })])

    await settle()

    const row = within(screen.getByTestId('container-row-golf_hub'))
    expect(screen.getByTestId('container-row-state-golf_hub').textContent).toContain('not reporting')
    expect(row.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('names the memory cause when cAdvisor reports one', async () => {
    // Restart churn says a container is flapping; OOM says whether memory is
    // why — the difference between a bad deploy and an undersized limit.
    withContainers([makeContainer('golf_hub', { restarts_last_hour: 3, oom_events_last_hour: 2 })])

    await settle()

    expect(screen.getByTestId('container-row-state-golf_hub').textContent).toContain('2 OOM')
  })
})
