import { useState, useEffect } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ChartErrorBoundary from './ChartErrorBoundary'
import styles from './MetricsDashboard.module.css'
import {
  METRICS_API_URL,
  fetchJson,
  serviceDisplayName,
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

const NoDataMessage = () => <div className={styles.noData}>No data available</div>

const SeriesChart = ({
  title,
  series,
  color,
  unit,
  area = false,
  scale = (value: number) => value,
}: {
  title: string
  series: TimeSeries | undefined
  color: string
  unit: string
  area?: boolean
  scale?: (value: number) => number
}) => {
  const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (!series?.values?.length) {
    return (
      <div className={styles.compactChart}>
        <h4>{title}</h4>
        <NoDataMessage />
      </div>
    )
  }

  const data = series.values.map((v) => ({
    time: formatTimestamp(v.timestamp),
    value: scale(Math.max(0, v.value || 0)),
  }))
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
  const [timeRange, setTimeRange] = useState<'30m' | '1d' | '7d'>('1d')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [lastService, setLastService] = useState(service)

  // Tab switches drop the previous service's data during render, so a
  // slow fetch can't flash stale numbers under the new title.
  if (service !== lastService) {
    setLastService(service)
    setScalar(null)
    setTimeseries(null)
  }

  useEffect(() => {
    // The flag discards resolutions that land after a service or range
    // switch — without it, a slow fetch for the previous service would
    // write its data back under the new title.
    let active = true
    const fetchMetrics = async () => {
      onConnectionStateChange('connecting')

      const [scalarData, seriesData] = await Promise.all([
        fetchJson<ServiceMetricsResponse>(`${METRICS_API_URL}/service/${service}`),
        fetchJson<TimeSeriesResponse>(`${METRICS_API_URL}/service/${service}/timeseries/${timeRange}`),
      ])
      if (!active) return

      if (scalarData) setScalar(scalarData)
      if (seriesData) setTimeseries(seriesData)

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
  }, [service, timeRange, onConnectionStateChange])

  const findSeries = (name: string) => timeseries?.series?.find((s) => s.metric_name === name)
  const customSeries = (timeseries?.series ?? []).filter((s) => !STANDARD_SERIES.has(s.metric_name))
  const standard = scalar?.standard

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
          {lastUpdate && (
            <span className={styles.lastUpdate}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {/* The standard serving block, identical for every service. */}
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
              <div className={styles.miniLabel}>Total</div>
              <div className={styles.miniValue}>{formatValue(standard.requests_total || 0)}</div>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Serving</h2>
          <div className={styles.sectionGrid}>
            <SeriesChart title="Request Rate" series={findSeries('request_rate')} color={COLORS.primary} unit="req/s" />
            <SeriesChart title="Error Rate" series={findSeries('error_rate_percent')} color={COLORS.danger} unit="%" />
            <SeriesChart title="P95 Latency" series={findSeries('p95_duration_us')} color={COLORS.warning} unit="ms" scale={(v) => v / 1000} area />
            <SeriesChart title="Active Requests" series={findSeries('active_requests')} color={COLORS.success} unit="" area />
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
                  color={[COLORS.primary, COLORS.info, COLORS.success, COLORS.warning][index % 4]}
                  unit=""
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
