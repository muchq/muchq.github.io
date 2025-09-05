import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import styles from './MetricsDashboard.module.css'

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

interface TimeSeries {
  metric_name: string
  labels?: Record<string, string>
  values: Array<{
    timestamp: string
    value: number
  }>
}

interface TimeSeriesResponse {
  time_range: string
  start_time: string
  end_time: string
  step: string
  series: TimeSeries[]
}

interface MetricsDashboardProps {
  onConnectionStateChange: (status: 'connecting' | 'connected' | 'disconnected' | 'failed') => void
}

const MetricsDashboard = ({ onConnectionStateChange }: MetricsDashboardProps) => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [systemTimeseries, setSystemTimeseries] = useState<TimeSeriesResponse | null>(null)
  const [portraitTimeseries, setPortraitTimeseries] = useState<TimeSeriesResponse | null>(null)
  const [timeRange, setTimeRange] = useState<'30m' | '1d' | '7d'>('1d')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'system' | 'portrait'>('system')

  const fetchMetrics = useCallback(async () => {
    try {
      onConnectionStateChange('connecting')
      
      // Use environment variable for API URL, defaulting to production URL
      const apiUrl = import.meta.env.VITE_METRICS_API_URL || 'https://api.muchq.com'
      
      // Fetch current system metrics
      try {
        const systemResponse = await fetch(`${apiUrl}/v1/metrics/system`)
        if (systemResponse.ok) {
          const text = await systemResponse.text()
          if (text.trim()) {
            const systemData = JSON.parse(text)
            setSystemMetrics(systemData)
          }
        }
      } catch {
        // Silently handle error - UI will show "no data" state
      }

      // Fetch system timeseries
      try {
        const systemTimeseriesResponse = await fetch(`${apiUrl}/v1/timeseries/system/${timeRange}`)
        if (systemTimeseriesResponse.ok) {
          const text = await systemTimeseriesResponse.text()
          if (text.trim()) {
            const systemTimeseriesData = JSON.parse(text)
            setSystemTimeseries(systemTimeseriesData)
          }
        }
      } catch {
        // Silently handle error - UI will show "no data" state
      }

      // Fetch portrait timeseries
      try {
        const portraitTimeseriesResponse = await fetch(`${apiUrl}/v1/timeseries/portrait/${timeRange}`)
        if (portraitTimeseriesResponse.ok) {
          const text = await portraitTimeseriesResponse.text()
          if (text.trim()) {
            const portraitTimeseriesData = JSON.parse(text)
            setPortraitTimeseries(portraitTimeseriesData)
          }
        }
      } catch {
        // Silently handle error - UI will show "no data" state
      }

      setLastUpdate(new Date())
      onConnectionStateChange('connected')
    } catch {
      onConnectionStateChange('failed')
    }
  }, [timeRange, onConnectionStateChange])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [fetchMetrics])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getCpuTimeseriesData = () => {
    if (!systemTimeseries?.series) return []
    const cpuSeries = systemTimeseries.series.find(s => s.metric_name === 'cpu_utilization')
    if (!cpuSeries?.values?.length) return []
    
    return cpuSeries.values.map(v => ({
      time: formatTimestamp(v.timestamp),
      value: Math.max(0, Math.min(100, v.value || 0))
    }))
  }

  const getMemoryTimeseriesData = () => {
    if (!systemTimeseries?.series) return []
    const memorySeries = systemTimeseries.series.find(s => s.metric_name === 'memory_utilization')
    if (!memorySeries?.values?.length) return []
    
    return memorySeries.values.map(v => ({
      time: formatTimestamp(v.timestamp),
      value: Math.max(0, Math.min(100, v.value || 0))
    }))
  }

  const getNetworkTimeseriesData = () => {
    if (!systemTimeseries?.series) return []
    const rxSeries = systemTimeseries.series.find(s => s.metric_name === 'network_rx_rate' && s.labels?.device === 'eth0')
    const txSeries = systemTimeseries.series.find(s => s.metric_name === 'network_tx_rate' && s.labels?.device === 'eth0')
    
    if (!rxSeries?.values?.length || !txSeries?.values?.length) return []
    
    const data: Array<{time: string, rx: number, tx: number}> = []
    const minLength = Math.min(rxSeries.values.length, txSeries.values.length)
    
    for (let i = 0; i < minLength; i++) {
      data.push({
        time: formatTimestamp(rxSeries.values[i].timestamp),
        rx: (rxSeries.values[i].value || 0) / 1024, // Convert to KB/s
        tx: (txSeries.values[i].value || 0) / 1024
      })
    }
    
    return data
  }

  const getRequestRateData = () => {
    if (!portraitTimeseries?.series) return []
    const requestSeries = portraitTimeseries.series.find(s => s.metric_name === 'request_rate')
    if (!requestSeries?.values?.length) return []
    
    return requestSeries.values.map(v => ({
      time: formatTimestamp(v.timestamp),
      rate: Math.max(0, v.value || 0)
    }))
  }

  const getDiskIOData = () => {
    if (!systemTimeseries?.series) return []
    const diskSeries = systemTimeseries.series.filter(s => s.metric_name === 'disk_io_rate' && s.labels?.device === 'vda')
    if (diskSeries.length < 2) return []
    
    const readSeries = diskSeries.find(s => s.labels?.direction === 'read')
    const writeSeries = diskSeries.find(s => s.labels?.direction === 'write')
    
    if (!readSeries?.values?.length || !writeSeries?.values?.length) return []
    
    const data: Array<{time: string, read: number, write: number}> = []
    const minLength = Math.min(readSeries.values.length, writeSeries.values.length)
    
    for (let i = 0; i < minLength; i++) {
      data.push({
        time: formatTimestamp(readSeries.values[i].timestamp),
        read: (readSeries.values[i].value || 0) / (1024 * 1024), // Convert to MB/s
        write: (writeSeries.values[i].value || 0) / (1024 * 1024)
      })
    }
    
    return data
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

  const getPortraitMetricsData = () => {
    if (!portraitTimeseries?.series) return []
    
    // Get success rate data
    const successSeries = portraitTimeseries.series.find(s => s.metric_name === 'request_success_rate')
    const cacheSeries = portraitTimeseries.series.find(s => s.metric_name === 'cache_hit_rate')
    const durationSeries = portraitTimeseries.series.find(s => s.metric_name === 'request_duration_avg')
    
    if (!successSeries?.values?.length) return []
    
    return successSeries.values.map((v, i) => ({
      time: formatTimestamp(v.timestamp),
      successRate: Math.max(0, Math.min(100, v.value || 0)),
      cacheHitRate: cacheSeries && i < cacheSeries.values.length ? Math.max(0, Math.min(100, cacheSeries.values[i].value || 0)) : 0,
      avgDuration: durationSeries && i < durationSeries.values.length ? (durationSeries.values[i].value || 0) / 1000 : 0 // Convert to ms
    }))
  }


  const getCacheOperationsData = () => {
    if (!portraitTimeseries?.series) return []
    
    const cacheOpsSeries = portraitTimeseries.series.find(s => s.metric_name === 'cache_operations_rate')
    if (!cacheOpsSeries?.values?.length) return []
    
    return cacheOpsSeries.values.map(v => ({
      time: formatTimestamp(v.timestamp),
      operations: v.value || 0
    }))
  }

  const getSceneComplexityData = () => {
    if (!portraitTimeseries?.series) return []
    
    const sphereSeries = portraitTimeseries.series.find(s => s.metric_name === 'scene_sphere_count')
    const lightSeries = portraitTimeseries.series.find(s => s.metric_name === 'scene_light_count')
    
    if (!sphereSeries?.values?.length) return []
    
    return sphereSeries.values.map((v, i) => ({
      time: formatTimestamp(v.timestamp),
      spheres: v.value || 0,
      lights: lightSeries && i < lightSeries.values.length ? (lightSeries.values[i].value || 0) : 0
    }))
  }

  const getRequestSuccessRateData = () => {
    if (!portraitTimeseries?.series) return []
    
    const successSeries = portraitTimeseries.series.find(s => s.metric_name === 'request_success_rate')
    if (!successSeries?.values?.length) return []
    
    return successSeries.values.map(v => ({
      time: formatTimestamp(v.timestamp),
      successRate: Math.max(0, Math.min(100, v.value || 0))
    }))
  }

  const getCacheHitRateData = () => {
    if (!portraitTimeseries?.series) return []
    
    const cacheSeries = portraitTimeseries.series.find(s => s.metric_name === 'cache_hit_rate')
    if (!cacheSeries?.values?.length) return []
    
    return cacheSeries.values.map(v => ({
      time: formatTimestamp(v.timestamp),
      hitRate: Math.max(0, Math.min(100, v.value || 0))
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

  // Helper component for no data state
  const NoDataMessage = ({ message = "No data available" }: { message?: string }) => (
    <div className={styles.noData}>
      {message}
    </div>
  )

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Metrics Dashboard</h1>
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

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${activeTab === 'system' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('system')}
        >
          System Metrics
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'portrait' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('portrait')}
        >
          Portrait Metrics
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.metricsGrid}>
        {activeTab === 'system' && (
          <>
            {/* System Overview Cards */}
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
        {/* System Resources Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>System Resources</h2>
          <div className={styles.sectionGrid}>
            {/* CPU Utilization */}
            <div className={styles.compactChart}>
              <h4>CPU Utilization</h4>
              {getCpuTimeseriesData().length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={getCpuTimeseriesData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
                    <YAxis stroke="#888" fontSize={10} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(102, 182, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'CPU']}
                    />
                    <Area type="monotone" dataKey="value" stroke={COLORS.primary} fill="rgba(102, 182, 255, 0.3)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage />
              )}
            </div>

            {/* CPU Cores */}
            <div className={styles.compactChart}>
              <h4>CPU Cores</h4>
              {getCpuCoreData().length > 0 ? (
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
              ) : (
                <NoDataMessage />
              )}
            </div>

            {/* Memory Usage */}
            <div className={styles.compactChart}>
              <h4>Memory Usage</h4>
              {getMemoryTimeseriesData().length > 0 ? (
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
              ) : (
                <NoDataMessage />
              )}
            </div>

            {/* Memory Breakdown */}
            <div className={styles.compactChart}>
              <h4>Memory Breakdown</h4>
              {getMemoryBreakdownData().length > 0 ? (
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
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Memory']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage />
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
              ) : (
                <NoDataMessage />
              )}
            </div>

            {/* Disk Usage */}
            <div className={styles.compactChart}>
              <h4>Disk Usage</h4>
              {getDiskUsageData().length > 0 ? (
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
              ) : (
                <NoDataMessage />
              )}
            </div>

            {/* Network I/O */}
            <div className={styles.compactChart}>
              <h4>Network I/O</h4>
              {getNetworkTimeseriesData().length > 0 ? (
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
              ) : (
                <NoDataMessage />
              )}
            </div>
          </div>
        </div>
          </>
        )}

        {activeTab === 'portrait' && (
          <>
        {/* Request Performance Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Request Performance</h2>
          <div className={styles.sectionGrid}>
            {/* Request Rate */}
            <div className={styles.compactChart}>
              <h4>Request Rate</h4>
              {getRequestRateData().length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={getRequestRateData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
                    <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value}/s`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 102, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => [`${Number(value).toFixed(2)}/s`, 'Requests']}
                    />
                    <Bar dataKey="rate" fill={COLORS.info} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage />
              )}
            </div>

            {/* Request Success Rate */}
            <div className={styles.compactChart}>
              <h4>Request Success Rate</h4>
              {getRequestSuccessRateData().length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={getRequestSuccessRateData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
                    <YAxis stroke="#888" fontSize={10} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(102, 255, 102, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Success Rate']}
                    />
                    <Area type="monotone" dataKey="successRate" stroke={COLORS.success} fill="rgba(102, 255, 102, 0.3)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage />
              )}
            </div>

            {/* Combined Portrait Metrics */}
            <div className={styles.compactChart}>
              <h4>Combined Portrait Metrics</h4>
              {getPortraitMetricsData().length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={getPortraitMetricsData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
                    <YAxis stroke="#888" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value, name) => [
                        name === 'avgDuration' ? `${Number(value).toFixed(2)}ms` : `${Number(value).toFixed(1)}%`,
                        name === 'successRate' ? 'Success Rate' : name === 'cacheHitRate' ? 'Cache Hit Rate' : 'Avg Duration'
                      ]}
                    />
                    <Line type="monotone" dataKey="successRate" stroke={COLORS.success} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cacheHitRate" stroke={COLORS.primary} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="avgDuration" stroke={COLORS.warning} strokeWidth={2} dot={false} yAxisId="right" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage />
              )}
            </div>
          </div>
        </div>

        {/* Cache Performance Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Cache Performance</h2>
          <div className={styles.sectionGrid}>
            {/* Cache Hit Rate */}
            <div className={styles.compactChart}>
              <h4>Cache Hit Rate</h4>
              {getCacheHitRateData().length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={getCacheHitRateData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
                    <YAxis stroke="#888" fontSize={10} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(102, 182, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Hit Rate']}
                    />
                    <Area type="monotone" dataKey="hitRate" stroke={COLORS.primary} fill="rgba(102, 182, 255, 0.3)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage />
              )}
            </div>

            {/* Cache Operations Rate */}
            <div className={styles.compactChart}>
              <h4>Cache Operations Rate</h4>
              {getCacheOperationsData().length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={getCacheOperationsData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
                    <YAxis stroke="#888" fontSize={10} tickFormatter={(value) => `${value}/s`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 102, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => [`${Number(value).toFixed(2)}/s`, 'Operations']}
                    />
                    <Bar dataKey="operations" fill={COLORS.info} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage />
              )}
            </div>
          </div>
        </div>

        {/* Scene Complexity Section */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Scene Complexity</h2>
          <div className={styles.sectionGrid}>
            {/* Scene Elements */}
            <div className={styles.compactChart}>
              <h4>Scene Elements</h4>
              {getSceneComplexityData().length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={getSceneComplexityData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#888" fontSize={10} interval="preserveStartEnd" />
                    <YAxis stroke="#888" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 32, 0.9)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value, name) => [
                        `${Number(value).toFixed(0)}`,
                        name === 'spheres' ? 'Spheres' : 'Lights'
                      ]}
                    />
                    <Line type="monotone" dataKey="spheres" stroke={COLORS.danger} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="lights" stroke={COLORS.warning} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage />
              )}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MetricsDashboard