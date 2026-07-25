import { describe, it, expect, vi } from 'vitest'
import {
  byHealthThenName,
  containerDisplayName,
  containerLabel,
  fetchJson,
  formatUptime,
  serviceDisplayName,
  splitHostTimeseries,
  type ContainerStats,
  type TimeSeriesResponse,
} from '../api'

describe('fetchJson', () => {
  it('parses a successful response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{"a":1}') }) as unknown as typeof fetch
    expect(await fetchJson<{ a: number }>('/x')).toEqual({ a: 1 })
  })

  it('returns null on non-ok responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('') }) as unknown as typeof fetch
    expect(await fetchJson('/x')).toBeNull()
  })

  it('returns null on empty or whitespace bodies', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('  \n') }) as unknown as typeof fetch
    expect(await fetchJson('/x')).toBeNull()
  })

  it('returns null on invalid JSON and thrown fetches', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('nope{') }) as unknown as typeof fetch
    expect(await fetchJson('/x')).toBeNull()
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch
    expect(await fetchJson('/x')).toBeNull()
  })
})

describe('serviceDisplayName', () => {
  it('uses the override table for known services', () => {
    expect(serviceDisplayName('golf_hub')).toBe('Golf Hub')
    expect(serviceDisplayName('microgpt-serve')).toBe('MicroGPT')
    expect(serviceDisplayName('portrait')).toBe('Portrait')
  })

  it('titleizes unknown names on both delimiters', () => {
    expect(serviceDisplayName('some_new-svc')).toBe('Some New Svc')
  })
})

describe('splitHostTimeseries', () => {
  const merged = {
    time_range: '1d',
    start_time: '',
    end_time: '',
    step: '30s',
    series: [
      { metric_name: 'cpu_utilization', values: [] },
      { metric_name: 'container_cpu_usage', labels: { name: 'caddy' }, values: [] },
      { metric_name: 'container_memory_usage_percent', labels: { name: 'caddy' }, values: [] },
    ],
  } as TimeSeriesResponse

  it('routes by namespace and strips the container_ prefix', () => {
    const { system, container } = splitHostTimeseries(merged)
    expect(system.map((s) => s.metric_name)).toEqual(['cpu_utilization'])
    expect(container.map((s) => s.metric_name)).toEqual(['cpu_usage', 'memory_usage_percent'])
    // Labels survive the rename — the container charts key on them.
    expect(container[0].labels).toEqual({ name: 'caddy' })
  })

  it('handles an absent series list', () => {
    const { system, container } = splitHostTimeseries({ ...merged, series: undefined as unknown as TimeSeriesResponse['series'] })
    expect(system).toEqual([])
    expect(container).toEqual([])
  })
})

const stats = (overrides: Partial<ContainerStats> & { name: string }): ContainerStats => ({
  cpu_usage_percent: 0,
  cpu_throttled_seconds: 0,
  memory_usage_bytes: 0,
  memory_limit_bytes: 0,
  memory_usage_percent: 0,
  network_rx_bytes_per_sec: 0,
  network_tx_bytes_per_sec: 0,
  restarts_last_hour: 0,
  uptime_seconds: 0,
  crash_looping: false,
  ...overrides,
})

describe('containerDisplayName', () => {
  it('strips the compose project prefix and the replica index', () => {
    expect(containerDisplayName('ubuntu-golf_hub-1')).toBe('golf_hub')
  })

  it('only strips a trailing index, so a two-digit replica survives', () => {
    // An unanchored replace('-1', '') cuts the first literal "-1" anywhere,
    // which turns caddy-10 into caddy0 and svc-1x into svcx.
    expect(containerDisplayName('ubuntu-caddy-10')).toBe('caddy')
    expect(containerDisplayName('ubuntu-svc-1x')).toBe('svc-1x')
  })

  it('leaves a name with no prefix or index alone', () => {
    expect(containerDisplayName('caddy')).toBe('caddy')
  })
})

describe('containerLabel', () => {
  it('prefers the compose service label over the container name', () => {
    // The name parse is a guess about the project prefix, which differs
    // between the deployed host and local_deploy.sh. The label is a fact.
    expect(containerLabel(stats({ name: 'moonbase-golf_hub-1', service: 'golf_hub' }))).toBe('golf_hub')
  })

  it('falls back to the parsed name when the label is missing or empty', () => {
    expect(containerLabel(stats({ name: 'ubuntu-caddy-1' }))).toBe('caddy')
    expect(containerLabel(stats({ name: 'ubuntu-caddy-1', service: '' }))).toBe('caddy')
  })
})

describe('byHealthThenName', () => {
  it('puts a crash-looping container first even with fewer restarts', () => {
    const looping = stats({ name: 'a', service: 'a', crash_looping: true, restarts_last_hour: 3 })
    const noisy = stats({ name: 'b', service: 'b', restarts_last_hour: 40 })
    expect([noisy, looping].sort(byHealthThenName).map((c) => c.service)).toEqual(['a', 'b'])
  })

  it('orders the rest by restart count before falling back to the name', () => {
    const quiet = stats({ name: 'a', service: 'a' })
    const restarted = stats({ name: 'z', service: 'z', restarts_last_hour: 2 })
    expect([quiet, restarted].sort(byHealthThenName).map((c) => c.service)).toEqual(['z', 'a'])
  })

  it('is a stable alphabetical sort when everything is healthy', () => {
    const names = ['prometheus', 'caddy', 'golf_hub']
    const sorted = names.map((n) => stats({ name: n, service: n })).sort(byHealthThenName)
    expect(sorted.map((c) => c.service)).toEqual(['caddy', 'golf_hub', 'prometheus'])
  })
})

describe('formatUptime', () => {
  it('picks the largest whole unit', () => {
    expect(formatUptime(8)).toBe('8s')
    expect(formatUptime(90)).toBe('1m')
    expect(formatUptime(7200)).toBe('2h')
    expect(formatUptime(172800)).toBe('2d')
  })

  it('renders a dash rather than 0s for absent data', () => {
    // A container Prometheus has never seen arrives as zero, and "0s uptime"
    // reads like a fact about a running container.
    expect(formatUptime(0)).toBe('—')
    expect(formatUptime(NaN)).toBe('—')
  })
})
