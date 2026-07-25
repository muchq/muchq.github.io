import styles from './MetricsDashboard.module.css'
import { containerLabel, formatUptime, type ContainerStats } from '../api'

// Three states a service page can't distinguish on its own. Every panel above
// this strip is built from http_server_* series, and a container that dies
// before it binds a port emits none of them — which looks exactly like an idle
// but healthy service: flat lines, no errors, no gap.
//
//   null            the endpoint 404'd or the fetch failed — no container
//   reporting=false cAdvisor knows the container but returned no samples
//   otherwise       real numbers, so up/restarting/crash-looping is decidable
//
// The middle case has to stay distinct from a healthy zero: a failed query
// leaves 0 restarts and 0 uptime, which would otherwise render as "up".
export function ContainerHealthStrip({ container }: { container: ContainerStats | null }) {
  if (!container) {
    return (
      <div className={styles.overviewCards} data-testid="container-health">
        <div className={styles.miniCard}>
          <div className={styles.miniLabel}>Container</div>
          <div className={styles.miniValue} data-testid="container-state">
            unknown
          </div>
          <div className={styles.miniUnit}>no container found</div>
        </div>
      </div>
    )
  }

  // Optional so a payload from a prom_proxy older than MoonBase#1218 (which has
  // no `reporting` field) reads as reporting rather than silently degraded.
  const reporting = container.reporting !== false
  const restarts = container.restarts_last_hour ?? 0
  const state = !reporting
    ? 'not reporting'
    : container.crash_looping
      ? 'crash looping'
      : restarts > 0
        ? 'restarting'
        : 'up'

  return (
    <div className={styles.overviewCards} data-testid="container-health">
      <div className={styles.miniCard}>
        <div className={styles.miniLabel}>Container</div>
        <div className={styles.miniValue} data-testid="container-state">
          {state}
        </div>
        <div className={styles.miniUnit}>{containerLabel(container)}</div>
      </div>
      <div className={styles.miniCard}>
        <div className={styles.miniLabel}>Uptime</div>
        <div className={styles.miniValue} data-testid="container-uptime">
          {reporting ? formatUptime(container.uptime_seconds) : '—'}
        </div>
      </div>
      <div className={styles.miniCard}>
        <div className={styles.miniLabel}>Restarts</div>
        <div className={styles.miniValue} data-testid="container-restarts">
          {reporting ? restarts : '—'}
        </div>
        <div className={styles.miniUnit}>last hour</div>
      </div>
      <div className={styles.miniCard}>
        <div className={styles.miniLabel}>Version</div>
        <div className={styles.miniValue} data-testid="container-version">
          {container.version || '—'}
        </div>
        <div className={styles.miniUnit}>running</div>
      </div>
    </div>
  )
}

export default ContainerHealthStrip
