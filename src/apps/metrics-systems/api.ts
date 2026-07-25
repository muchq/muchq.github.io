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

// Crash-looping first, then whatever else is restarting, so a failing container
// can't sit below the fold of a long list.
export function byHealthThenName(a: ContainerStats, b: ContainerStats): number {
  if (!!a.crash_looping !== !!b.crash_looping) return a.crash_looping ? -1 : 1
  const restarts = (b.restarts_last_hour ?? 0) - (a.restarts_last_hour ?? 0)
  if (restarts !== 0) return restarts
  return containerLabel(a).localeCompare(containerLabel(b))
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
