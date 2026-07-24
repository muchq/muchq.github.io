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
