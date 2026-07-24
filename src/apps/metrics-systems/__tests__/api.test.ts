import { describe, it, expect, vi } from 'vitest'
import { fetchJson, serviceDisplayName, splitHostTimeseries, type TimeSeriesResponse } from '../api'

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
