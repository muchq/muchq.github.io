import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import ChartErrorBoundary from './ChartErrorBoundary'
import styles from './MetricsDashboard.module.css'
import {
  METRICS_API_URL,
  bucketMs,
  byHealthThenName,
  containerLabel,
  containerLabelLookup,
  fetchJson,
  fillWindow,
  formatBytes,
  formatUptime,
  seriesWindow,
  splitHostTimeseries,
  type ContainerStats,
  type TimeSeriesResponse,
} from '../api'

interface SystemMetrics {
  timestamp: string
  cpu: {
    utilization_percent: number
    by_core: Record<string, number>
  }
  memory: {
    total_bytes: number
    used_bytes: number
    free_bytes: number
    cached_bytes: number
    utilization_percent: number
  }
  disk: Array<{
    device: string
    used_bytes: number
    total_bytes: number
    utilization_percent: number
    io_rate_bytes_per_sec: number
  }>
  network: Array<{
    interface: string
    rx_rate_bytes_per_sec: number
    tx_rate_bytes_per_sec: number
    errors_per_sec: number
  }>
}

interface ContainerMetrics {
  timestamp: string
  containers: ContainerStats[]
}

interface HostMetricsResponse {
  timestamp: string
  system: SystemMetrics | null
  containers: ContainerStats[]
}

interface MetricsDashboardProps {
  onConnectionStateChange: (status: 'connecting' | 'connected' | 'disconnected' | 'failed') => void
}

// Helper component for no data state
const NoDataMessage = ({ message = "No data available" }: { message?: string }) => (
  <div className={styles.noData}>
    {message}
  </div>
)

// Custom tooltip that sorts values in descending order
const SortedTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value)
    return (
      <div style={{
        backgroundColor: 'rgba(13, 17, 32, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px'
      }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{label}</p>
        {sortedPayload.map((entry, index) => (
          <p key={index} style={{ margin: '2px 0', color: entry.color }}>
            {entry.name}: {Number(entry.value).toFixed(1)}%
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Custom tooltip for Memory Breakdown pie chart
const MemoryTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; value: number; percentage: number } }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div style={{
        backgroundColor: 'rgba(13, 17, 32, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        color: '#fff'
      }}>
        <p style={{ margin: '0', color: '#fff' }}>
          {data.name}: {data.percentage.toFixed(1)}% ({formatBytes(data.value)})
        </p>
      </div>
    )
  }
  return null
}

const MetricsDashboard = ({ onConnectionStateChange }: MetricsDashboardProps) => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [systemTimeseries, setSystemTimeseries] = useState<TimeSeriesResponse | null>(null)
  const [containerMetrics, setContainerMetrics] = useState<ContainerMetrics | null>(null)
  const [containerTimeseries, setContainerTimeseries] = useState<TimeSeriesResponse | null>(null)
  const [timeRange, setTimeRange] = useState<'30m' | '1d' | '7d'>('1d')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  // True until the first fetch settles either way. Empty panels say
  // "Loading…" during it — flashing "No data available" at someone for the
  // second before data lands claims a gap that doesn't exist.
  const [loading, setLoading] = useState(true)

  // Charts get their container names from timeseries labels, which carry only
  // the raw name. Resolving through the containers list keeps every chart
  // series named the same as the card above it.
  const seriesLabel = useMemo(
    () => containerLabelLookup(containerMetrics?.containers ?? []),
    [containerMetrics],
  )

  useEffect(() => {
    // The flag discards resolutions that land after a range change (or
    // unmount), so a slow fetch can't write back stale data.
    let active = true
    const fetchMetrics = async () => {
      onConnectionStateChange('connecting')

      const [hostData, merged] = await Promise.all([
        fetchJson<HostMetricsResponse>(`${METRICS_API_URL}/host`),
        fetchJson<TimeSeriesResponse>(`${METRICS_API_URL}/host/timeseries/${timeRange}`),
      ])
      if (!active) return
      setLoading(false)

      if (hostData) {
        if (hostData.system) setSystemMetrics(hostData.system)
        setContainerMetrics({ timestamp: hostData.timestamp, containers: hostData.containers || [] })
      }
      if (merged) {
        const { system, container } = splitHostTimeseries(merged)
        setSystemTimeseries({ ...merged, series: system })
        setContainerTimeseries({ ...merged, series: container })
      }

      if (hostData || merged) {
        setLastUpdate(new Date())
        onConnectionStateChange('connected')
      } else {
        onConnectionStateChange('failed')
      }
    }

    const start = setTimeout(fetchMetrics, 0)
    const interval = setInterval(fetchMetrics, 30000) // Update every 30 seconds
    return () => {
      active = false
      clearTimeout(start)
      clearInterval(interval)
    }
  }, [timeRange, onConnectionStateChange])

  // The chart grids come from the responses themselves (start/end/step), so a
  // 7d selection charts 7 days even when samples cover four hours — the
  // uncovered buckets zero-fill. The old grid was generated client-side from
  // "now" with 30s rounding, whose keys rarely matched the samples' step
  // alignment on the wider ranges, silently dropping most of the data.
  const systemFrame = seriesWindow(systemTimeseries)
  const containerFrame = seriesWindow(containerTimeseries)

  const emptyMessage = loading ? 'Loading…' : 'No data available'

  const getCpuTimeseriesData = () => {
    const cpuSeries = systemTimeseries?.series?.find(s => s.metric_name === 'cpu_utilization')
    if (!systemFrame || !cpuSeries?.values?.length) return []

    const rows = new Map<number, { value: number }>()
    cpuSeries.values.forEach(v => {
      rows.set(bucketMs(v.timestamp, systemFrame), { value: Math.max(0, Math.min(100, v.value || 0)) })
    })
    return fillWindow(systemFrame, rows, { value: 0 })
  }

  const getMemoryTimeseriesData = () => {
    const memorySeries = systemTimeseries?.series?.find(s => s.metric_name === 'memory_utilization')
    if (!systemFrame || !memorySeries?.values?.length) return []

    const rows = new Map<number, { value: number }>()
    memorySeries.values.forEach(v => {
      rows.set(bucketMs(v.timestamp, systemFrame), { value: Math.max(0, Math.min(100, v.value || 0)) })
    })
    return fillWindow(systemFrame, rows, { value: 0 })
  }

  const getNetworkTimeseriesData = () => {
    const rxSeries = systemTimeseries?.series?.find(s => s.metric_name === 'network_rx_rate' && s.labels?.device === 'eth0')
    const txSeries = systemTimeseries?.series?.find(s => s.metric_name === 'network_tx_rate' && s.labels?.device === 'eth0')
    if (!systemFrame || (!rxSeries?.values?.length && !txSeries?.values?.length)) return []

    const rows = new Map<number, { rx?: number; tx?: number }>()
    rxSeries?.values?.forEach(v => {
      const key = bucketMs(v.timestamp, systemFrame)
      rows.set(key, { ...rows.get(key), rx: (v.value || 0) / 1024 })
    })
    txSeries?.values?.forEach(v => {
      const key = bucketMs(v.timestamp, systemFrame)
      rows.set(key, { ...rows.get(key), tx: (v.value || 0) / 1024 })
    })
    return fillWindow(systemFrame, rows, { rx: 0, tx: 0 })
  }

  const getDiskIOData = () => {
    const diskSeries = systemTimeseries?.series?.filter(s => s.metric_name === 'disk_io_rate' && s.labels?.device === 'vda')
    const readSeries = diskSeries?.find(s => s.labels?.direction === 'read')
    const writeSeries = diskSeries?.find(s => s.labels?.direction === 'write')
    if (!systemFrame || (!readSeries?.values?.length && !writeSeries?.values?.length)) return []

    const rows = new Map<number, { read?: number; write?: number }>()
    readSeries?.values?.forEach(v => {
      const key = bucketMs(v.timestamp, systemFrame)
      rows.set(key, { ...rows.get(key), read: (v.value || 0) / (1024 * 1024) })
    })
    writeSeries?.values?.forEach(v => {
      const key = bucketMs(v.timestamp, systemFrame)
      rows.set(key, { ...rows.get(key), write: (v.value || 0) / (1024 * 1024) })
    })
    return fillWindow(systemFrame, rows, { read: 0, write: 0 })
  }

  const getCpuCoreData = () => {
    if (!systemMetrics?.cpu?.by_core) return []
    return Object.entries(systemMetrics.cpu.by_core).map(([core, usage]) => ({
      name: core,
      usage: Math.max(0, Math.min(100, usage || 0))
    }))
  }

  const getMemoryBreakdownData = () => {
    if (!systemMetrics?.memory?.total_bytes) return []
    const total = systemMetrics.memory.total_bytes
    return [
      { name: 'Used', value: systemMetrics.memory.used_bytes || 0, percentage: ((systemMetrics.memory.used_bytes || 0) / total) * 100 },
      { name: 'Cached', value: systemMetrics.memory.cached_bytes || 0, percentage: ((systemMetrics.memory.cached_bytes || 0) / total) * 100 },
      { name: 'Free', value: systemMetrics.memory.free_bytes || 0, percentage: ((systemMetrics.memory.free_bytes || 0) / total) * 100 }
    ]
  }

  const getDiskUsageData = () => {
    if (!systemMetrics?.disk?.length) return []
    return systemMetrics.disk.map(disk => ({
      name: disk.device || 'Unknown',
      used: disk.utilization_percent || 0,
      free: 100 - (disk.utilization_percent || 0),
      totalGB: (disk.total_bytes || 0) / (1024 * 1024 * 1024)
    }))
  }



  const COLORS = {
    primary: '#66b6ff',
    success: '#66ff66',
    warning: '#ffcc66',
    danger: '#ff6666',
    info: '#ff66ff',
    secondary: '#88ccff'
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Host Metrics</h1>
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

      {/* Tab Content */}
      <div className={styles.metricsGrid}>
        {/* System Resources Section. The point-in-time cards sit inside the
            section, under its title, rather than floating above the page as an
            unlabeled cluster. */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>System Resources</h2>
          {systemMetrics && (
            <div className={styles.overviewCards}>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>CPU</div>
                <div className={styles.miniValue}>{(systemMetrics.cpu?.utilization_percent || 0).toFixed(1)}%</div>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>Memory</div>
                <div className={styles.miniValue}>{(systemMetrics.memory?.utilization_percent || 0).toFixed(1)}%</div>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>Disk</div>
                <div className={styles.miniValue}>
                  {systemMetrics.disk?.[0]?.utilization_percent ? systemMetrics.disk[0].utilization_percent.toFixed(1) : 0}%
                </div>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>Network</div>
                <div className={styles.miniValue}>
                  {(() => {
                    const eth0 = systemMetrics.network?.find(n => n.interface === 'eth0')
                    return eth0 ?
                      formatBytes((eth0.rx_rate_bytes_per_sec || 0) + (eth0.tx_rate_bytes_per_sec || 0)) + '/s'
                      : '0 B/s'
                  })()}
                </div>
              </div>
            </div>
          )}
          <div className={styles.sectionGrid}>
            {/* CPU Utilization */}
            <div className={styles.compactChart}>
              <h4>CPU Utilization</h4>
              {getCpuTimeseriesData().length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={getCpuTimeseriesData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="time"
                        stroke="#888"
                        fontSize={10}
                        interval="preserveStartEnd"
                        domain={['dataMin', 'dataMax']}
                        type="category"
                      />
                      <YAxis stroke="#888" fontSize={10} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(102, 182, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value) => [`${Number(value).toFixed(1)}%`, 'CPU']}
                      />
                      <Area type="monotone" dataKey="value" stroke={COLORS.primary} fill="rgba(102, 182, 255, 0.3)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>

            {/* CPU Cores */}
            <div className={styles.compactChart}>
              <h4>CPU Cores</h4>
              {getCpuCoreData().length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={getCpuCoreData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#888" fontSize={10} />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(102, 182, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Usage']}
                      />
                      <Bar dataKey="usage" fill={COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>

            {/* Memory Usage */}
            <div className={styles.compactChart}>
              <h4>Memory Usage</h4>
              {getMemoryTimeseriesData().length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={getMemoryTimeseriesData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
                      <YAxis stroke="#888" fontSize={10} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(102, 255, 102, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Memory']}
                      />
                      <Line type="monotone" dataKey="value" stroke={COLORS.success} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>

            {/* Memory Breakdown */}
            <div className={styles.compactChart}>
              <h4>Memory Breakdown</h4>
              {getMemoryBreakdownData().length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={getMemoryBreakdownData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="percentage"
                      >
                        {getMemoryBreakdownData().map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={[COLORS.danger, COLORS.warning, COLORS.success][index]} />
                        ))}
                      </Pie>
                      <Tooltip content={<MemoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>
          </div>
        </div>

        {/* Storage & I/O Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Storage & I/O</h2>
          <div className={styles.sectionGrid}>
            {/* Disk I/O */}
            <div className={styles.compactChart}>
              <h4>Disk I/O</h4>
              {getDiskIOData().length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={getDiskIOData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value} MB/s`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 204, 102, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value, name) => [`${Number(value).toFixed(2)} MB/s`, name === 'read' ? 'Read' : 'Write']}
                      />
                      <Area type="monotone" dataKey="read" stackId="1" stroke={COLORS.success} fill="rgba(102, 255, 102, 0.3)" />
                      <Area type="monotone" dataKey="write" stackId="1" stroke={COLORS.warning} fill="rgba(255, 204, 102, 0.3)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>

            {/* Disk Usage */}
            <div className={styles.compactChart}>
              <h4>Disk Usage</h4>
              {getDiskUsageData().length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={getDiskUsageData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#888" fontSize={10} />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 102, 102, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value, name) => [
                          `${Number(value).toFixed(1)}%`,
                          name === 'used' ? 'Used' : 'Free'
                        ]}
                      />
                      <Bar dataKey="used" fill={COLORS.danger} />
                      <Bar dataKey="free" fill={COLORS.success} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>

            {/* Network I/O */}
            <div className={styles.compactChart}>
              <h4>Network I/O</h4>
              {getNetworkTimeseriesData().length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={getNetworkTimeseriesData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value} KB/s`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 204, 102, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value, name) => [`${Number(value).toFixed(2)} KB/s`, name === 'rx' ? 'Received' : 'Transmitted']}
                      />
                      <Area type="monotone" dataKey="rx" stackId="1" stroke={COLORS.success} fill="rgba(102, 255, 102, 0.3)" />
                      <Area type="monotone" dataKey="tx" stackId="1" stroke={COLORS.warning} fill="rgba(255, 204, 102, 0.3)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>
          </div>
        </div>

        {/* Container Overview Cards — every container, not the first four.
            The host runs more than four, and the truncated list was in
            arbitrary Prometheus order, so the one container worth looking
            at was the one most likely to be cut. Sorted so anything
            crash-looping or churning sorts to the front. Titled, and the
            value carries its unit — a bare percentage on an unlabeled card
            doesn't say what's being measured. */}
        {containerMetrics && containerMetrics.containers.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Containers</h2>
            <div className={styles.overviewCards} data-testid="container-cards">
              {[...containerMetrics.containers].sort(byHealthThenName).map(container => (
                <div key={container.name} className={styles.miniCard}>
                  <div className={styles.miniLabel}>{containerLabel(container)}</div>
                  <div className={styles.miniValue}>
                    {container.reporting === false ? '—' : `${container.cpu_usage_percent.toFixed(1)}%`}
                    <span className={styles.miniUnit}> cpu</span>
                  </div>
                  <div className={styles.miniUnit} data-testid={`container-card-state-${containerLabel(container)}`}>
                    {container.reporting === false
                      ? 'not reporting'
                      : container.crash_looping
                        ? 'crash looping'
                        : (container.restarts_last_hour ?? 0) > 0
                          ? `${container.restarts_last_hour} restarts`
                          : `up ${formatUptime(container.uptime_seconds)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Container CPU Metrics */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Container CPU Metrics</h2>
          <div className={styles.sectionGrid}>
            {/* CPU Usage by Container */}
            <div className={styles.compactChart}>
              <h4>CPU Usage by Container</h4>
              {containerMetrics && containerMetrics.containers.length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={containerMetrics.containers.map(c => ({
                      name: containerLabel(c),
                      cpu: c.cpu_usage_percent
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#888" fontSize={10} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(102, 182, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value) => [`${Number(value).toFixed(2)}%`, 'CPU Usage']}
                      />
                      <Bar dataKey="cpu" fill={COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>

            {/* CPU Throttling by Container */}
            <div className={styles.compactChart}>
              <h4>CPU Throttling (seconds/sec)</h4>
              {containerMetrics && containerMetrics.containers.length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={containerMetrics.containers.map(c => ({
                      name: containerLabel(c),
                      throttled: c.cpu_throttled_seconds
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#888" fontSize={10} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#888" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 102, 102, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value) => [`${Number(value).toFixed(4)}s/s`, 'Throttled']}
                      />
                      <Bar dataKey="throttled" fill={COLORS.danger} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>

            {/* CPU Usage Over Time */}
            <div className={styles.compactChart}>
              <h4>CPU Usage Over Time</h4>
              {containerTimeseries?.series?.find(s => s.metric_name === 'cpu_usage') ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={(() => {
                      const cpuSeries = containerTimeseries.series.filter(s => s.metric_name === 'cpu_usage')
                      if (!containerFrame || !cpuSeries.length) return []

                      // Build default values object with all container names
                      const defaultValues: Record<string, number> = {}
                      cpuSeries.forEach(s => {
                        if (s.labels?.name) {
                          const shortName = seriesLabel(s.labels.name)
                          defaultValues[shortName] = 0
                        }
                      })

                      // Build data map with all series
                      const rows = new Map<number, Record<string, number>>()
                      cpuSeries.forEach(s => {
                        s.values?.forEach(v => {
                          const key = bucketMs(v.timestamp, containerFrame)
                          const existing = rows.get(key) || {}
                          if (s.labels?.name) {
                            const shortName = seriesLabel(s.labels.name)
                            existing[shortName] = v.value
                          }
                          rows.set(key, existing)
                        })
                      })

                      return fillWindow(containerFrame, rows, defaultValues)
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="time"
                        stroke="#888"
                        fontSize={10}
                        interval="preserveStartEnd"
                        domain={['dataMin', 'dataMax']}
                        type="category"
                      />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value}%`} />
                      <Tooltip content={<SortedTooltip />} />
                      {containerTimeseries.series.filter(s => s.metric_name === 'cpu_usage' && s.labels?.name).map((s, i) => {
                        const colors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.info, COLORS.secondary]
                        const shortName = seriesLabel(s.labels!.name)
                        return <Line key={i} type="monotone" dataKey={shortName} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>
          </div>
        </div>

        {/* Container Memory Metrics */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Container Memory Metrics</h2>
          <div className={styles.sectionGrid}>
            {/* Memory Usage by Container */}
            <div className={styles.compactChart}>
              <h4>Memory Usage by Container</h4>
              {containerMetrics && containerMetrics.containers.length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={containerMetrics.containers.map(c => ({
                      name: containerLabel(c),
                      memory: c.memory_usage_percent
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#888" fontSize={10} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(102, 255, 102, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Memory Usage']}
                      />
                      <Bar dataKey="memory" fill={COLORS.success} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>

            {/* Memory Bytes by Container */}
            <div className={styles.compactChart}>
              <h4>Memory Bytes by Container</h4>
              {containerMetrics && containerMetrics.containers.length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={containerMetrics.containers.map(c => ({
                      name: containerLabel(c),
                      used: c.memory_usage_bytes / (1024 * 1024),
                      limit: c.memory_limit_bytes / (1024 * 1024)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#888" fontSize={10} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value} MB`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value, name) => [`${Number(value).toFixed(0)} MB`, name === 'used' ? 'Used' : 'Limit']}
                      />
                      <Bar dataKey="used" fill={COLORS.danger} />
                      <Bar dataKey="limit" fill={COLORS.warning} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>

            {/* Memory Usage Over Time */}
            <div className={styles.compactChart}>
              <h4>Memory Usage Over Time (%)</h4>
              {containerTimeseries?.series?.find(s => s.metric_name === 'memory_usage_percent') ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={(() => {
                      const memSeries = containerTimeseries.series.filter(s => s.metric_name === 'memory_usage_percent')
                      if (!containerFrame || !memSeries.length) return []

                      // Build default values object with all container names
                      const defaultValues: Record<string, number> = {}
                      memSeries.forEach(s => {
                        if (s.labels?.name) {
                          const shortName = seriesLabel(s.labels.name)
                          defaultValues[shortName] = 0
                        }
                      })

                      // Build data map with all series
                      const rows = new Map<number, Record<string, number>>()
                      memSeries.forEach(s => {
                        s.values?.forEach(v => {
                          const key = bucketMs(v.timestamp, containerFrame)
                          const existing = rows.get(key) || {}
                          if (s.labels?.name) {
                            const shortName = seriesLabel(s.labels.name)
                            existing[shortName] = v.value
                          }
                          rows.set(key, existing)
                        })
                      })

                      return fillWindow(containerFrame, rows, defaultValues)
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="time"
                        stroke="#888"
                        fontSize={10}
                        interval="preserveStartEnd"
                        domain={['dataMin', 'dataMax']}
                        type="category"
                      />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value}%`} />
                      <Tooltip content={<SortedTooltip />} />
                      {containerTimeseries.series.filter(s => s.metric_name === 'memory_usage_percent' && s.labels?.name).map((s, i) => {
                        const colors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.info, COLORS.secondary]
                        const shortName = seriesLabel(s.labels!.name)
                        return <Line key={i} type="monotone" dataKey={shortName} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>
          </div>
        </div>

        {/* Container Restarts — the one thing a point-in-time check can't
            give. The cards above describe the current run, so a loop that
            started and resolved overnight leaves no trace on them; this is
            where it shows up. */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Container Restarts</h2>
          <div className={styles.sectionGrid}>
            <div className={styles.compactChart}>
              <h4>Restarts Over Time</h4>
              {containerTimeseries?.series?.some(s => s.metric_name === 'restarts') ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={(() => {
                      const restartSeries = containerTimeseries.series.filter(s => s.metric_name === 'restarts')
                      if (!containerFrame || !restartSeries.length) return []

                      const defaultValues: Record<string, number> = {}
                      restartSeries.forEach(s => {
                        if (s.labels?.name) defaultValues[seriesLabel(s.labels.name)] = 0
                      })

                      const rows = new Map<number, Record<string, number>>()
                      restartSeries.forEach(s => {
                        s.values?.forEach(v => {
                          const key = bucketMs(v.timestamp, containerFrame)
                          const existing = rows.get(key) || {}
                          if (s.labels?.name) existing[seriesLabel(s.labels.name)] = v.value
                          rows.set(key, existing)
                        })
                      })

                      return fillWindow(containerFrame, rows, defaultValues)
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="time"
                        stroke="#888"
                        fontSize={10}
                        interval="preserveStartEnd"
                        domain={['dataMin', 'dataMax']}
                        type="category"
                      />
                      {/* Restarts are counts, so half a restart is not a
                          reading the axis should offer. */}
                      <YAxis stroke="#888" fontSize={10} allowDecimals={false} />
                      {/* Not SortedTooltip: it suffixes every value with %,
                          which is right for CPU and wrong for a count. */}
                      <Tooltip />
                      {/* Restarts are counts: each bucket is a discrete sum,
                          not a continuous reading, so bars rather than an
                          interpolated line. Stacked, so the bar height is
                          total restarts in the bucket and the segments say
                          which container. */}
                      {containerTimeseries.series.filter(s => s.metric_name === 'restarts' && s.labels?.name).map((s, i) => {
                        const colors = [COLORS.danger, COLORS.warning, COLORS.primary, COLORS.info, COLORS.success, COLORS.secondary]
                        return <Bar key={i} dataKey={seriesLabel(s.labels!.name)} fill={colors[i % colors.length]} stackId="restarts" />
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={loading ? 'Loading…' : 'No restart data in this window'} />
              )}
            </div>
          </div>
        </div>

        {/* Container Network Metrics */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Container Network Metrics</h2>
          <div className={styles.sectionGrid}>
            {/* Network RX by Container */}
            <div className={styles.compactChart}>
              <h4>Network Receive (KB/s)</h4>
              {containerMetrics && containerMetrics.containers.length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={containerMetrics.containers.map(c => ({
                      name: containerLabel(c),
                      rx: c.network_rx_bytes_per_sec / 1024
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#888" fontSize={10} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value} KB/s`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(102, 255, 102, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value) => [`${Number(value).toFixed(2)} KB/s`, 'RX']}
                      />
                      <Bar dataKey="rx" fill={COLORS.success} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>

            {/* Network TX by Container */}
            <div className={styles.compactChart}>
              <h4>Network Transmit (KB/s)</h4>
              {containerMetrics && containerMetrics.containers.length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={containerMetrics.containers.map(c => ({
                      name: containerLabel(c),
                      tx: c.network_tx_bytes_per_sec / 1024
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#888" fontSize={10} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value} KB/s`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 204, 102, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value) => [`${Number(value).toFixed(2)} KB/s`, 'TX']}
                      />
                      <Bar dataKey="tx" fill={COLORS.warning} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <NoDataMessage message={emptyMessage} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MetricsDashboard
