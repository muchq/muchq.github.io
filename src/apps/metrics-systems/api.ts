// Types and helpers for the prom_proxy dashboard API (MoonBase#1199):
// the service catalog, the merged host payload, and the generic
// per-service standard + custom blocks.

export const METRICS_API_URL =
  import.meta.env.VITE_METRICS_API_URL || 'https://api.muchq.com/metrics/v1'

export interface ServiceCatalogEntry {
  name: string
  has_custom: boolean
}

export interface ServiceCatalog {
  services: ServiceCatalogEntry[]
}

export interface StandardMetrics {
  requests_total: number
  rate_per_sec: number
  success_count_5m: number
  failure_count_5m: number
  error_rate_percent: number
  avg_duration_microseconds: number
  p95_duration_microseconds: number
  active_requests: number
}

export interface CustomMetricValue {
  label: string
  value: number
  unit: string
}

export interface CustomMetricGroup {
  title: string
  metrics: CustomMetricValue[]
}

export interface ServiceMetricsResponse {
  timestamp: string
  service: string
  standard: StandardMetrics
  custom: CustomMetricGroup[]
}

// Per-container stats. A service that dies during startup never serves a
// request, so its http_server_* series stay flat and read as idle — restarts
// and uptime are the only thing separating "crash-looping" from "quiet"
// (MoonBase#1215).
export interface ContainerStats {
  name: string
  // The compose service behind the container, stamped by the daemon. Optional
  // only because the UI deploys independently of prom_proxy: a Pages build can
  // land while the host is still running an image from before MoonBase#1218.
  service?: string
  cpu_usage_percent: number
  cpu_throttled_seconds: number
  memory_usage_bytes: number
  memory_limit_bytes: number
  memory_usage_percent: number
  network_rx_bytes_per_sec: number
  network_tx_bytes_per_sec: number
  restarts_last_hour: number
  uptime_seconds: number
  crash_looping: boolean
  // Deploys pin images per commit (MoonBase#1210), so the tag is the revision
  // actually running — as opposed to whatever the host was told to run.
  image?: string
  version?: string
  // False when cAdvisor returned nothing. Without it a failed query leaves
  // zeroes, and zero restarts with zero uptime reads as a healthy container.
  reporting?: boolean
  // Seconds since cAdvisor last saw the container. Optional for the same
  // reason as `service`: the UI deploys independently of prom_proxy.
  last_seen_ago_seconds?: number
  // Best-effort — absent on cAdvisor builds without the counter, which leaves
  // it zero and indistinguishable from no kills.
  oom_events_last_hour?: number
}

// Every container in the stack, including the infrastructure ones that emit no
// app metrics and so have no service page at all.
export interface ContainersResponse {
  timestamp: string
  containers: ContainerStats[]
}

// Single-container response from /metrics/v1/container/{name}.
export interface ContainerDetail {
  timestamp: string
  container: ContainerStats
}

// Compose names containers `<project>-<service>-<index>`, e.g.
// `ubuntu-golf_hub-1`. Strip both ends so a container lines up with the service
// it backs. The index is anchored: a bare `-1` replace also mangles `svc-10`.
export function containerDisplayName(name: string): string {
  return name.replace(/^ubuntu-/, '').replace(/-\d+$/, '')
}

// Prefer the daemon's label over re-deriving it from the container name: the
// project prefix differs between the deployed host and local_deploy.sh, so
// parsing is a guess where the label is a fact. Falls back for payloads from a
// prom_proxy older than MoonBase#1218.
export function containerLabel(container: ContainerStats): string {
  return container.service || containerDisplayName(container.name)
}

// Timeseries labels carry only the raw container name — the compose service
// label rides on the containers list, not on the series. Charts therefore used
// to re-derive a name with containerDisplayName while the cards next to them
// used the label, so the two disagreed on any host whose compose project isn't
// `ubuntu-`. Build the mapping once from the list and let both read from it.
export function containerLabelLookup(containers: ContainerStats[]): (name: string) => string {
  const byName = new Map(containers.map((c) => [c.name, containerLabel(c)]))
  return (name: string) => byName.get(name) ?? containerDisplayName(name)
}

// Crash-looping first, then whatever has churned most, so a failing container
// can't sit below the fold of a long list. Restart count orders the tail even
// though it is no longer a state of its own: a container that restarted twice
// is still the more interesting one to look at first.
export function byHealthThenName(a: ContainerStats, b: ContainerStats): number {
  if (!!a.crash_looping !== !!b.crash_looping) return a.crash_looping ? -1 : 1
  const restarts = (b.restarts_last_hour ?? 0) - (a.restarts_last_hour ?? 0)
  if (restarts !== 0) return restarts
  return containerLabel(a).localeCompare(containerLabel(b))
}

// Deploys pin images by full commit SHA (MoonBase#1210), so `version` arrives as
// 40 hex characters — an unbroken string with nowhere to wrap, which paints
// straight out of its card. Show git's short form instead.
//
// Only strings that are actually hex are cut. A semver tag or `latest` is left
// alone: truncating those would lose information rather than abbreviate it.
const LONG_SHA = /^[0-9a-f]{12,}$/i

export function shortVersion(version: string): string {
  return LONG_SHA.test(version) ? version.slice(0, 7) : version
}

// Only MoonBase images are pinned to a commit. `caddy:2-alpine` and
// `prom/prometheus:v2.55.0` are upstream tags that have no business being
// compared against a deploy SHA, so drift detection has to exclude them.
export function isCommitSha(version: string): boolean {
  return LONG_SHA.test(version)
}

const SOURCE_REPO = 'https://github.com/muchq/MoonBase'

// The repo is public, so these need no auth. Display the short SHA, link the
// full one (MoonBase#1208 §4).
export function commitUrl(version: string): string {
  return `${SOURCE_REPO}/commit/${version}`
}

export function buildUrl(version: string): string {
  return `${SOURCE_REPO}/commit/${version}/checks`
}

// The revision most of the stack is running. Drift is measured against peers
// rather than against the latest published build because the dashboard can't
// see the registry — what it can see is one container disagreeing with the
// others, which is exactly the "deploy didn't recreate it" case.
//
// Ties resolve to whichever revision appears first in the list; with a stack
// split evenly across two revisions, either answer flags the other half, and
// both readings are true.
export function stackVersion(containers: ContainerStats[]): string | null {
  const counts = new Map<string, number>()
  for (const c of containers) {
    if (c.version && isCommitSha(c.version)) {
      counts.set(c.version, (counts.get(c.version) ?? 0) + 1)
    }
  }
  let winner: string | null = null
  let best = 0
  for (const [version, count] of counts) {
    if (count > best) {
      winner = version
      best = count
    }
  }
  return winner
}

// A container has drifted when it runs a MoonBase revision that isn't the one
// the rest of the stack runs. Upstream tags never drift — they aren't deployed
// per commit — and neither does anything when the whole stack agrees.
export function hasDrifted(container: ContainerStats, stack: string | null): boolean {
  if (!stack || !container.version || !isCommitSha(container.version)) return false
  return container.version !== stack
}

export type ContainerState = 'up' | 'crash looping' | 'not reporting'

// The health verdict, in one place so the service strip and the Containers tab
// can't drift apart about what "up" means.
//
// State is liveness, never history. `restarts_last_hour` is a count over a
// trailing window — prom_proxy derives it from changes(container_start_time_
// seconds[1h]) — so a host reboot puts every container at 1 for the next hour.
// Reading that as its own state painted a fully healthy stack red until the
// window rolled off. The RESTARTS column already carries the churn; the only
// thing that turns a restart count into a condition is pairing it with uptime,
// and `crash_looping` is where that pairing lives.
//
// `not reporting` cannot collapse into `up`: a failed cAdvisor query leaves
// zero restarts and zero uptime, which is byte-identical to a healthy
// container. `reporting !== false` rather than `=== true` so a payload from a
// prom_proxy older than MoonBase#1218 reads as reporting rather than degraded.
export function containerState(container: ContainerStats): ContainerState {
  if (container.reporting === false) return 'not reporting'
  if (container.crash_looping) return 'crash looping'
  return 'up'
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`
}

export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export interface TimeSeries {
  metric_name: string
  labels?: Record<string, string>
  values: Array<{
    timestamp: string
    value: number
  }>
}

export interface TimeSeriesResponse {
  time_range: string
  start_time: string
  end_time: string
  step: string
  series: TimeSeries[]
}

// Go's Duration.String() emits "30s", "5m0s", "1h0m0s"; hand-written configs
// may send bare "5m". Sum every number+unit pair; null when nothing matches.
export function parseDurationMs(text: string | undefined): number | null {
  if (!text) return null
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)]
  if (!matches.length) return null
  const unitMs: Record<string, number> = { h: 3600000, m: 60000, s: 1000, ms: 1 }
  return matches.reduce((total, match) => total + Number(match[1]) * unitMs[match[2]], 0)
}

// What the proxy's step is expected to be per range, for payloads whose step
// field is missing or unparseable.
const FALLBACK_STEP_MS: Record<string, number> = {
  '30m': 30_000,
  '1d': 5 * 60_000,
  '7d': 30 * 60_000,
}

export interface SeriesWindow {
  startMs: number
  endMs: number
  stepMs: number
}

// The bucket grid the API actually answered for. A chart that plots only the
// samples it got shrinks its axis to wherever data happens to exist — select
// 7d with four hours of samples and the graph shows four hours. Everything
// here comes from the response so the grid matches the samples' own alignment
// rather than a client-side guess anchored to "now".
export function seriesWindow(
  response: Pick<TimeSeriesResponse, 'start_time' | 'end_time' | 'step' | 'time_range'> | null,
): SeriesWindow | null {
  if (!response) return null
  const startMs = Date.parse(response.start_time)
  const endMs = Date.parse(response.end_time)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null
  let stepMs = parseDurationMs(response.step) ?? FALLBACK_STEP_MS[response.time_range] ?? 0
  if (stepMs <= 0) return null
  // Backstop: a pathologically small step would mint tens of thousands of
  // buckets and stall the chart. Coarsen rather than refuse to draw.
  while ((endMs - startMs) / stepMs > 4000) stepMs *= 2
  return { startMs, endMs, stepMs }
}

// Snap a sample onto the window's grid so filling can key on exact bucket
// times instead of hoping timestamps line up.
export function bucketMs(timestamp: string, window: SeriesWindow): number {
  return window.startMs + Math.round((Date.parse(timestamp) - window.startMs) / window.stepMs) * window.stepMs
}

// Six ticks that all say "6:35 AM" identify no day at all, so multi-day
// windows carry the date in the label.
export function timeTickFormatter(window: SeriesWindow): (ms: number) => string {
  const multiDay = window.endMs - window.startMs > 24 * 3600 * 1000
  return (ms: number) => {
    const date = new Date(ms)
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (!multiDay) return time
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
  }
}

// One row per bucket across the whole window, missing buckets taking
// `defaults` (zeroes), so the x-axis always spans the range the user selected.
export function fillWindow<T extends Record<string, number | string>>(
  window: SeriesWindow,
  rows: Map<number, Partial<T>>,
  defaults: T,
): Array<T & { time: string; timeMs: number }> {
  const format = timeTickFormatter(window)
  const filled: Array<T & { time: string; timeMs: number }> = []
  for (let t = window.startMs; t <= window.endMs; t += window.stepMs) {
    filled.push({ ...defaults, ...(rows.get(t) ?? {}), time: format(t), timeMs: t } as T & {
      time: string
      timeMs: number
    })
  }
  return filled
}

// null on any failure — sections render their no-data state instead of
// tearing the page down.
export async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const text = await response.text()
    if (!text.trim()) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

const DISPLAY_NAMES: Record<string, string> = {
  golf_hub: 'Golf Hub',
  'microgpt-serve': 'MicroGPT',
  portrait: 'Portrait',
}

// Catalog names the registry hasn't special-cased render title-cased.
export function serviceDisplayName(name: string): string {
  if (DISPLAY_NAMES[name]) return DISPLAY_NAMES[name]
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// The host timeseries payload merges host and container series, the
// latter namespaced with a container_ prefix (see prom_proxy's
// GetHostMetricsTimeSeries). Split and strip here so chart code keys on
// the bare cadvisor names.
export function splitHostTimeseries(merged: TimeSeriesResponse): {
  system: TimeSeries[]
  container: TimeSeries[]
} {
  const system: TimeSeries[] = []
  const container: TimeSeries[] = []
  for (const series of merged.series ?? []) {
    if (series.metric_name.startsWith('container_')) {
      container.push({ ...series, metric_name: series.metric_name.slice('container_'.length) })
    } else {
      system.push(series)
    }
  }
  return { system, container }
}
