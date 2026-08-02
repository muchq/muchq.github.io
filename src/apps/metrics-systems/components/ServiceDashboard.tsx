import { useState, useEffect } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ChartErrorBoundary from './ChartErrorBoundary'
import styles from './MetricsDashboard.module.css'
import ContainerHealthStrip from './ContainerHealth'
import {
  METRICS_API_URL,
  bucketMs,
  fetchJson,
  fillWindow,
  hasToggleableMetrics,
  requestsTotalLabel,
  seriesWindow,
  serviceDisplayName,
  type ContainerDetail,
  type ContainerStats,
  type MetricView,
  type SeriesWindow,
  type ServiceMetricsResponse,
  type TimeSeries,
  type TimeSeriesResponse,
} from '../api'

interface ServiceDashboardProps {
  service: string
  onConnectionStateChange: (status: 'connecting' | 'connected' | 'disconnected' | 'failed') => void
}

// The five series every service page charts; anything else in the
// timeseries payload is a custom series and renders generically below.
// Must match the keys of standardTimeseriesQueries in prom_proxy's
// registry.go — and custom series names must not collide with these, or
// they classify as standard and never chart.
const STANDARD_SERIES = new Set([
  'request_rate',
  'error_rate_percent',
  'avg_duration_us',
  'p95_duration_us',
  'active_requests',
])

const formatValue = (value: number) => {
  const magnitude = Math.abs(value)
  if (magnitude >= 1000) return Math.round(value).toLocaleString()
  if (magnitude >= 100) return value.toFixed(0)
  if (magnitude >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

const prettyLabel = (label: string) =>
  label.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

const NoDataMessage = ({ message = 'No data available' }: { message?: string }) => (
  <div className={styles.noData}>{message}</div>
)

const SeriesChart = ({
  title,
  series,
  frame,
  color,
  unit,
  area = false,
  scale = (value: number) => value,
  emptyMessage,
}: {
  title: string
  series: TimeSeries | undefined
  frame: SeriesWindow | null
  color: string
  unit: string
  area?: boolean
  scale?: (value: number) => number
  emptyMessage?: string
}) => {
  if (!series?.values?.length) {
    return (
      <div className={styles.compactChart}>
        <h4>{title}</h4>
        <NoDataMessage message={emptyMessage} />
      </div>
    )
  }

  // The samples cover whatever slice of the window the service was actually up
  // and scraped for; the chart still spans the range the user selected, with
  // the uncovered buckets zero-filled, instead of shrinking to fit the data.
  let data: Array<{ time: string; value: number }>
  if (frame) {
    const rows = new Map<number, { value: number }>()
    series.values.forEach((v) => {
      rows.set(bucketMs(v.timestamp, frame), { value: scale(Math.max(0, v.value || 0)) })
    })
    data = fillWindow(frame, rows, { value: 0 })
  } else {
    data = series.values.map((v) => ({
      time: new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: scale(Math.max(0, v.value || 0)),
    }))
  }
  const ChartComponent = area ? AreaChart : LineChart

  return (
    <div className={styles.compactChart}>
      <h4>{title}</h4>
      <ChartErrorBoundary>
        <ResponsiveContainer width="100%" height={180}>
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
            <YAxis stroke="#888" fontSize={10} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value) => [`${formatValue(Number(value))}${unit ? ` ${unit}` : ''}`, title]}
            />
            {area ? (
              <Area type="monotone" dataKey="value" stroke={color} fill={`${color}44`} strokeWidth={2} />
            ) : (
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </ChartErrorBoundary>
    </div>
  )
}

const ServiceDashboard = ({ service, onConnectionStateChange }: ServiceDashboardProps) => {
  const [scalar, setScalar] = useState<ServiceMetricsResponse | null>(null)
  const [timeseries, setTimeseries] = useState<TimeSeriesResponse | null>(null)
  const [container, setContainer] = useState<ContainerStats | null>(null)
  const [timeRange, setTimeRange] = useState<'30m' | '1d' | '7d'>('1d')
  // Which form counter tiles are asked for (MoonBase#1287). Count matches the
  // proxy's own default, so the first paint is one request rather than two.
  const [view, setView] = useState<MetricView>('count')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [lastService, setLastService] = useState(service)
  // True until the first fetch for this service settles either way. Empty
  // panels say "Loading…" during it — flashing "No data available" for the
  // second before data lands claims a gap that doesn't exist.
  const [loading, setLoading] = useState(true)

  // Tab switches drop the previous service's data during render, so a
  // slow fetch can't flash stale numbers under the new title.
  if (service !== lastService) {
    setLastService(service)
    setScalar(null)
    setTimeseries(null)
    setContainer(null)
    setLoading(true)
  }

  useEffect(() => {
    // The flag discards resolutions that land after a service or range
    // switch — without it, a slow fetch for the previous service would
    // write its data back under the new title.
    let active = true
    const fetchMetrics = async () => {
      onConnectionStateChange('connecting')

      // Container health can't come from the service endpoint: that reports
      // what the app emitted, which is exactly what a container that won't
      // start has none of. The dedicated endpoint (MoonBase#1218) resolves by
      // service name server-side, so this no longer pulls the whole host
      // payload — every other container's stats — to use one row of it.
      const [scalarData, seriesData, containerData] = await Promise.all([
        // ?view= is safe against an older proxy: Go's mux ignores query
        // parameters nothing reads, so the request still succeeds and comes
        // back in the only form that proxy has. The switch stays hidden in
        // that case anyway — see hasToggleableMetrics.
        fetchJson<ServiceMetricsResponse>(`${METRICS_API_URL}/service/${service}?view=${view}`),
        fetchJson<TimeSeriesResponse>(`${METRICS_API_URL}/service/${service}/timeseries/${timeRange}?view=${view}`),
        fetchJson<ContainerDetail>(`${METRICS_API_URL}/container/${service}`),
      ])
      if (!active) return
      setLoading(false)

      if (scalarData) setScalar(scalarData)
      if (seriesData) setTimeseries(seriesData)
      // 404s to null — a service with no container is a real state, not a
      // stale reading, so it must overwrite rather than leave the last one up.
      setContainer(containerData?.container ?? null)

      if (scalarData || seriesData) {
        setLastUpdate(new Date())
        onConnectionStateChange('connected')
      } else {
        onConnectionStateChange('failed')
      }
    }

    const start = setTimeout(fetchMetrics, 0)
    const interval = setInterval(fetchMetrics, 30000)
    return () => {
      active = false
      clearTimeout(start)
      clearInterval(interval)
    }
  }, [service, timeRange, view, onConnectionStateChange])

  const findSeries = (name: string) => timeseries?.series?.find((s) => s.metric_name === name)
  const customSeries = (timeseries?.series ?? []).filter((s) => !STANDARD_SERIES.has(s.metric_name))
  const standard = scalar?.standard
  const frame = seriesWindow(timeseries)
  const emptyMessage = loading ? 'Loading…' : undefined

  const COLORS = {
    primary: '#66b6ff',
    success: '#66ff88',
    warning: '#ffaa44',
    danger: '#ff6666',
    info: '#ff66ff',
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>{serviceDisplayName(service)}</h1>
        <div className={styles.controls}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '30m' | '1d' | '7d')}
            className={styles.timeRangeSelect}
          >
            <option value="30m">30m</option>
            <option value="1d">1d</option>
            <option value="7d">7d</option>
          </select>
          {/* Only when the payload actually has counter tiles to switch. A
              service whose custom block is all gauges and windowed means has
              nothing this would change, and neither does a host still running
              a pre-MoonBase#1287 proxy. */}
          {hasToggleableMetrics(scalar) && (
            <select
              value={view}
              onChange={(e) => setView(e.target.value as MetricView)}
              className={styles.timeRangeSelect}
              aria-label="Counter view"
            >
              <option value="count">count</option>
              <option value="rate">rate</option>
            </select>
          )}
          {lastUpdate && (
            <span className={styles.lastUpdate}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {/* Above the serving block, and deliberately not behind `standard`:
            the case this exists for is a container that never got far enough
            to emit a single metric, which is exactly when `standard` is null
            and everything below renders empty. A one-line strip rather than a
            card cluster — it's context for the page, not the page. */}
        <ContainerHealthStrip container={container} loading={loading} />

        {/* The standard serving block, identical for every service. The
            point-in-time tiles live inside the section, under its title, so
            the first thing on the page is a labeled unit rather than a
            free-floating cluster of numbers. */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Serving</h2>
          {standard && (
            <div className={styles.overviewCards}>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>Req/s</div>
                <div className={styles.miniValue}>{(standard.rate_per_sec || 0).toFixed(2)}</div>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>Error %</div>
                <div className={styles.miniValue}>{(standard.error_rate_percent || 0).toFixed(1)}</div>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>Avg ms</div>
                <div className={styles.miniValue}>{((standard.avg_duration_microseconds || 0) / 1000).toFixed(1)}</div>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>P95 ms</div>
                <div className={styles.miniValue}>{((standard.p95_duration_microseconds || 0) / 1000).toFixed(1)}</div>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>Active</div>
                <div className={styles.miniValue}>{(standard.active_requests || 0).toFixed(0)}</div>
              </div>
              <div className={styles.miniCard}>
                {/* Not "Total" once the proxy is new enough: the field still
                    says total, but MoonBase#1287 made it a 5-minute count. */}
                <div className={styles.miniLabel}>{requestsTotalLabel(scalar)}</div>
                <div className={styles.miniValue}>{formatValue(standard.requests_total || 0)}</div>
              </div>
            </div>
          )}
          <div className={styles.sectionGrid}>
            {/* request_rate is the one standard series built from a counter,
                so it's the one that answers to the view toggle: increase()
                per bucket in count, rate() per second in rate. The other
                three charts below have no count form and stay put — see
                standardRequestRateQuery in prom_proxy's registry.go. */}
            <SeriesChart
              title={view === 'count' ? 'Requests' : 'Request Rate'}
              series={findSeries('request_rate')}
              frame={frame}
              color={COLORS.primary}
              unit={view === 'count' ? 'requests' : 'req/s'}
              emptyMessage={emptyMessage}
            />
            <SeriesChart title="Error Rate" series={findSeries('error_rate_percent')} frame={frame} color={COLORS.danger} unit="%" emptyMessage={emptyMessage} />
            <SeriesChart title="P95 Latency" series={findSeries('p95_duration_us')} frame={frame} color={COLORS.warning} unit="ms" scale={(v) => v / 1000} area emptyMessage={emptyMessage} />
            <SeriesChart title="Active Requests" series={findSeries('active_requests')} frame={frame} color={COLORS.success} unit="" area emptyMessage={emptyMessage} />
          </div>
        </div>

        {/* Custom scalar groups, rendered from the API's descriptors. */}
        {scalar?.custom?.map((group) => (
          <div className={styles.section} key={group.title}>
            <h2 className={styles.sectionTitle}>{group.title}</h2>
            <div className={styles.overviewCards}>
              {group.metrics.map((metric) => (
                <div className={styles.miniCard} key={metric.label}>
                  <div className={styles.miniLabel}>{prettyLabel(metric.label)}</div>
                  <div className={styles.miniValue}>
                    {formatValue(metric.value || 0)}
                    {metric.unit && <span className={styles.miniUnit}> {metric.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Every non-standard series charts generically. */}
        {customSeries.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Trends</h2>
            <div className={styles.sectionGrid}>
              {customSeries.map((series, index) => (
                <SeriesChart
                  key={series.metric_name}
                  title={prettyLabel(series.metric_name)}
                  series={series}
                  frame={frame}
                  color={[COLORS.primary, COLORS.info, COLORS.success, COLORS.warning][index % 4]}
                  unit=""
                  emptyMessage={emptyMessage}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ServiceDashboard
