import { describe, it, expect, vi } from 'vitest'
import {
  bucketMs,
  byHealthThenName,
  containerDisplayName,
  containerLabel,
  fetchJson,
  fillWindow,
  formatUptime,
  buildUrl,
  commitUrl,
  containerState,
  formatBytes,
  hasDrifted,
  parseDurationMs,
  seriesWindow,
  serviceDisplayName,
  stackVersion,
  shortVersion,
  splitHostTimeseries,
  timeTickFormatter,
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

describe('shortVersion', () => {
  it('cuts a full commit SHA to git short form', () => {
    // What deploys actually pin. 40 unbroken hex characters have no break
    // opportunity, so rendering them raw overflows the card they sit in.
    expect(shortVersion('c0bcc5049c30e654c319ae39627a4a8f7800d077')).toBe('c0bcc50')
  })

  it('leaves anything that is not hex alone', () => {
    // Cutting these would lose information rather than abbreviate it.
    expect(shortVersion('v2.1.0-rc.3')).toBe('v2.1.0-rc.3')
    expect(shortVersion('latest')).toBe('latest')
    expect(shortVersion('')).toBe('')
  })

  it('leaves an already-short SHA alone', () => {
    // Nothing to gain, and re-cutting a 7-char SHA to 7 chars would make the
    // threshold invisible if it ever changed.
    expect(shortVersion('abc1234')).toBe('abc1234')
  })
})

describe('containerState', () => {
  it('separates a container it cannot see from a healthy one', () => {
    // A failed cAdvisor query leaves 0 restarts and 0 uptime, which is
    // byte-identical to a healthy container. Only `reporting` tells them apart.
    expect(containerState(stats({ name: 'a', reporting: false }))).toBe('not reporting')
    expect(containerState(stats({ name: 'a', reporting: true }))).toBe('up')
  })

  it('reads a missing reporting field as reporting', () => {
    // A prom_proxy older than MoonBase#1218 sends no such field; defaulting it
    // to false would show the whole stack as blind after a UI-only deploy.
    const legacy = stats({ name: 'a' }) as unknown as Record<string, unknown>
    delete legacy.reporting
    expect(containerState(legacy as unknown as ContainerStats)).toBe('up')
  })

  it('does not read restart churn as a state', () => {
    // `restarts_last_hour` is a count over a trailing hour, not a current
    // condition: a host reboot leaves every container at 1 for the next hour,
    // which painted the whole stack red while it was up and serving. Only the
    // crash-loop rule pairs that count with uptime, so only it is a state.
    expect(containerState(stats({ name: 'a', restarts_last_hour: 2 }))).toBe('up')
    expect(containerState(stats({ name: 'a', crash_looping: true, restarts_last_hour: 5 }))).toBe('crash looping')
  })
})

describe('stackVersion and hasDrifted', () => {
  const at = (service: string, version: string) => stats({ name: service, service, version })

  it('takes the revision most of the stack is running', () => {
    const containers = [at('a', 'aaaaaaaaaaaa1'), at('b', 'aaaaaaaaaaaa1'), at('c', 'bbbbbbbbbbbb2')]
    expect(stackVersion(containers)).toBe('aaaaaaaaaaaa1')
  })

  it('flags only the container that disagrees', () => {
    const containers = [at('a', 'aaaaaaaaaaaa1'), at('b', 'aaaaaaaaaaaa1'), at('c', 'bbbbbbbbbbbb2')]
    const stack = stackVersion(containers)
    expect(hasDrifted(containers[0], stack)).toBe(false)
    expect(hasDrifted(containers[2], stack)).toBe(true)
  })

  it('flags nothing when the stack agrees', () => {
    const containers = [at('a', 'aaaaaaaaaaaa1'), at('b', 'aaaaaaaaaaaa1')]
    const stack = stackVersion(containers)
    expect(containers.every((c) => !hasDrifted(c, stack))).toBe(true)
  })

  it('ignores upstream tags entirely', () => {
    // caddy:2-alpine is not pinned per commit, so counting it toward the stack
    // revision or flagging it against one would misfire on every deploy.
    const containers = [at('golf_hub', 'aaaaaaaaaaaa1'), at('caddy', '2-alpine'), at('pg', '16')]
    expect(stackVersion(containers)).toBe('aaaaaaaaaaaa1')
    expect(hasDrifted(containers[1], 'aaaaaaaaaaaa1')).toBe(false)
    expect(hasDrifted(containers[2], 'aaaaaaaaaaaa1')).toBe(false)
  })

  it('has no opinion when nothing is pinned to a commit', () => {
    expect(stackVersion([at('caddy', '2-alpine'), at('pg', '16')])).toBeNull()
    expect(hasDrifted(at('caddy', '2-alpine'), null)).toBe(false)
  })
})

describe('commit and build links', () => {
  it('links the full SHA even though the short one is displayed', () => {
    const sha = 'c0bcc5049c30e654c319ae39627a4a8f7800d077'
    expect(commitUrl(sha)).toBe(`https://github.com/muchq/MoonBase/commit/${sha}`)
    expect(buildUrl(sha)).toBe(`https://github.com/muchq/MoonBase/commit/${sha}/checks`)
    expect(shortVersion(sha)).toBe('c0bcc50')
  })
})

describe('parseDurationMs', () => {
  it('parses bare and Go-composed durations', () => {
    // Go's Duration.String() writes 5 minutes as "5m0s" and an hour as
    // "1h0m0s"; hand-written configs send the bare forms.
    expect(parseDurationMs('30s')).toBe(30_000)
    expect(parseDurationMs('5m')).toBe(300_000)
    expect(parseDurationMs('5m0s')).toBe(300_000)
    expect(parseDurationMs('1h0m0s')).toBe(3_600_000)
    expect(parseDurationMs('100ms')).toBe(100)
  })

  it('has no opinion on text with no duration in it', () => {
    expect(parseDurationMs('')).toBeNull()
    expect(parseDurationMs(undefined)).toBeNull()
    expect(parseDurationMs('soon')).toBeNull()
  })
})

describe('seriesWindow', () => {
  const response = (overrides: Record<string, string> = {}) => ({
    time_range: '1d',
    start_time: '2026-07-24T00:00:00Z',
    end_time: '2026-07-25T00:00:00Z',
    step: '5m0s',
    ...overrides,
  })

  it('reads the grid from the response rather than guessing client-side', () => {
    expect(seriesWindow(response())).toEqual({
      startMs: Date.parse('2026-07-24T00:00:00Z'),
      endMs: Date.parse('2026-07-25T00:00:00Z'),
      stepMs: 300_000,
    })
  })

  it('falls back to the known step for the range when the field is unusable', () => {
    expect(seriesWindow(response({ step: 'garbage' }))?.stepMs).toBe(300_000)
    expect(seriesWindow(response({ step: '', time_range: '7d' }))?.stepMs).toBe(1_800_000)
  })

  it('returns null when the window itself is unusable', () => {
    expect(seriesWindow(null)).toBeNull()
    expect(seriesWindow(response({ start_time: 'nope' }))).toBeNull()
    expect(seriesWindow(response({ end_time: '2026-07-24T00:00:00Z' }))).toBeNull()
    expect(seriesWindow(response({ step: 'garbage', time_range: 'nope' }))).toBeNull()
  })

  it('coarsens a step that would mint an absurd number of buckets', () => {
    const window = seriesWindow(response({ step: '1s' }))!
    expect((window.endMs - window.startMs) / window.stepMs).toBeLessThanOrEqual(4000)
  })
})

describe('bucketMs and fillWindow', () => {
  // One hour at a 5-minute step: 13 buckets.
  const frame = {
    startMs: Date.parse('2026-07-24T00:00:00Z'),
    endMs: Date.parse('2026-07-24T01:00:00Z'),
    stepMs: 300_000,
  }

  it('snaps samples onto the grid, including ones slightly off it', () => {
    expect(bucketMs('2026-07-24T00:05:00Z', frame)).toBe(frame.startMs + 300_000)
    expect(bucketMs('2026-07-24T00:06:40Z', frame)).toBe(frame.startMs + 300_000)
  })

  it('spans the whole window, zero-filling buckets with no sample', () => {
    // The complaint this fixes: select 7d with four hours of samples and the
    // chart used to show four hours, because only sampled points became rows.
    const rows = new Map([[bucketMs('2026-07-24T00:10:00Z', frame), { value: 7 }]])
    const filled = fillWindow(frame, rows, { value: 0 })
    expect(filled.length).toBe(13)
    expect(filled.filter((row) => row.value === 7).length).toBe(1)
    expect(filled[0].value).toBe(0)
    expect(filled[12].value).toBe(0)
  })

  it('labels ticks with the day only on multi-day windows', () => {
    // Six ticks all reading "6:35 AM" on a 7d axis identify no day at all.
    const dayless = timeTickFormatter(frame)(frame.startMs)
    const wide = { ...frame, endMs: frame.startMs + 7 * 86_400_000 }
    const dayful = timeTickFormatter(wide)(frame.startMs)
    expect(dayful).toContain(dayless)
    expect(dayful.length).toBeGreaterThan(dayless.length)
  })
})

describe('formatBytes', () => {
  it('picks the largest whole unit', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(1610612736)).toBe('1.5 GB')
  })

  it('does not run off the end of the unit list', () => {
    // Memory limits arrive unset as enormous sentinels on some containers.
    expect(formatBytes(Number.MAX_SAFE_INTEGER)).toContain('TB')
    expect(formatBytes(0)).toBe('0 B')
  })
})
