import { useState, useEffect, useMemo } from 'react'
import styles from './MetricsDashboard.module.css'
import ContainerVersion from './ContainerVersion'
import {
  METRICS_API_URL,
  byHealthThenName,
  containerLabel,
  containerState,
  fetchJson,
  formatBytes,
  formatUptime,
  hasDrifted,
  stackVersion,
  type ContainerStats,
  type ContainersResponse,
} from '../api'

interface ContainersDashboardProps {
  onConnectionStateChange: (status: 'connecting' | 'connected' | 'disconnected' | 'failed') => void
}

// The service pages only cover containers that emit app metrics. Caddy,
// prometheus, otelcol, cadvisor, postgres and forgejo emit none, so before this
// tab they appeared nowhere except as unnamed rows in the host page's CPU
// chart — the infrastructure everything else depends on was the least visible
// thing on the dashboard.
const ContainersDashboard = ({ onConnectionStateChange }: ContainersDashboardProps) => {
  const [containers, setContainers] = useState<ContainerStats[] | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    let active = true

    const fetchContainers = async () => {
      onConnectionStateChange('connecting')
      const data = await fetchJson<ContainersResponse>(`${METRICS_API_URL}/containers`)
      if (!active) return

      if (data) {
        setContainers(data.containers ?? [])
        setLastUpdate(new Date())
        onConnectionStateChange('connected')
      } else {
        onConnectionStateChange('failed')
      }
    }

    const start = setTimeout(fetchContainers, 0)
    const interval = setInterval(fetchContainers, 30000)
    return () => {
      active = false
      clearTimeout(start)
      clearInterval(interval)
    }
  }, [onConnectionStateChange])

  // Unhealthy first. The stack runs ~14 containers, so anything ordered by name
  // puts the one worth looking at halfway down a list nobody scrolls.
  const sorted = useMemo(() => [...(containers ?? [])].sort(byHealthThenName), [containers])
  const stack = useMemo(() => stackVersion(containers ?? []), [containers])

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Containers</h1>
        <div className={styles.controls}>
          {lastUpdate && <span className={styles.lastUpdate}>{lastUpdate.toLocaleTimeString()}</span>}
        </div>
      </div>

      {containers === null ? (
        <div className={styles.noData}>Loading containers…</div>
      ) : sorted.length === 0 ? (
        <div className={styles.noData}>No containers reported</div>
      ) : (
        <div className={styles.section}>
          <div className={styles.tableScroll}>
            <table className={styles.containerTable} data-testid="containers-table">
              <thead>
                <tr>
                  <th>Container</th>
                  <th>State</th>
                  <th>Uptime</th>
                  <th>Restarts</th>
                  <th>Last seen</th>
                  <th>CPU</th>
                  <th>Memory</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((container) => (
                  <ContainerRow key={container.name} container={container} stack={stack} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const ContainerRow = ({ container, stack }: { container: ContainerStats; stack: string | null }) => {
  const state = containerState(container)
  const reporting = container.reporting !== false
  const drifted = hasDrifted(container, stack)
  const oom = container.oom_events_last_hour ?? 0

  return (
    <tr data-testid={`container-row-${containerLabel(container)}`} className={state === 'up' ? '' : styles.rowUnhealthy}>
      <td>{containerLabel(container)}</td>
      <td data-testid={`container-row-state-${containerLabel(container)}`}>
        {state}
        {/* Restart churn says a container is flapping; an OOM count says
            whether memory is why. Only shown when there is one to report,
            since a cAdvisor without the counter reads as zero. */}
        {oom > 0 && <span className={styles.rowNote}> · {oom} OOM</span>}
      </td>
      <td>{reporting ? formatUptime(container.uptime_seconds) : '—'}</td>
      <td>{reporting ? (container.restarts_last_hour ?? 0) : '—'}</td>
      {/* Answers where uptime can't: uptime describes the current run, so a
          stopped container has none, while this keeps counting up until
          Prometheus retention drops the series. */}
      <td>{formatUptime(container.last_seen_ago_seconds ?? 0)}</td>
      <td>{reporting ? `${container.cpu_usage_percent.toFixed(1)}%` : '—'}</td>
      <td>{reporting ? formatBytes(container.memory_usage_bytes) : '—'}</td>
      <td>
        <ContainerVersion version={container.version} drifted={drifted} />
      </td>
    </tr>
  )
}

export default ContainersDashboard
