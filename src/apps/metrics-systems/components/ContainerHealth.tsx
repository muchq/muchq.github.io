import styles from './MetricsDashboard.module.css'
import ContainerVersion from './ContainerVersion'
import { containerLabel, containerState, formatUptime, type ContainerStats, type ContainerState } from '../api'

// Three states a service page can't distinguish on its own. Every panel below
// this strip is built from http_server_* series, and a container that dies
// before it binds a port emits none of them — which looks exactly like an idle
// but healthy service: flat lines, no errors, no gap.
//
//   null            the endpoint 404'd or the fetch failed. These are not the
//                   same thing, and fetchJson can't tell them apart, so this
//                   renders "unknown" rather than claiming the container is gone
//   reporting=false cAdvisor knows the container but returned no samples
//   otherwise       real numbers, so up/restarting/crash-looping is decidable
//
// The middle case has to stay distinct from a healthy zero: a failed query
// leaves 0 restarts and 0 uptime, which would otherwise render as "up".
//
// Rendered as a single status line rather than a row of stat cards: this is
// context for the charts below, not the page's content, so it must not be the
// biggest thing on screen — while staying loud (red badge) in the one case
// that matters, a container that is down while every chart looks idle-healthy.
const STATE_STYLES: Record<ContainerState, string> = {
  up: 'stateUp',
  restarting: 'stateWarn',
  'crash looping': 'stateDown',
  'not reporting': 'stateUnknown',
}

export function ContainerHealthStrip({
  container,
  loading = false,
}: {
  container: ContainerStats | null
  loading?: boolean
}) {
  if (!container) {
    // "loading" before the first fetch settles, "unknown" after: the first is
    // a promise of an answer, the second is the answer. Flashing "unknown" at
    // someone during the fetch claims a gap that doesn't exist.
    return (
      <div className={styles.statusStrip} data-testid="container-health">
        <span className={styles.statusLabel}>Container</span>
        <span className={`${styles.statusState} ${styles.stateUnknown}`} data-testid="container-state">
          {loading ? 'loading' : 'unknown'}
        </span>
        {!loading && <span className={styles.statusItem}>no data from the metrics API</span>}
      </div>
    )
  }

  // Optional so a payload from a prom_proxy older than MoonBase#1218 (which has
  // no `reporting` field) reads as reporting rather than silently degraded.
  const reporting = container.reporting !== false
  const restarts = container.restarts_last_hour ?? 0
  // Shared with the Containers tab so the two surfaces can't disagree about
  // what "up" means for the same container.
  const state = containerState(container)

  return (
    <div className={styles.statusStrip} data-testid="container-health">
      <span className={styles.statusLabel}>Container</span>
      <span className={`${styles.statusState} ${styles[STATE_STYLES[state]]}`} data-testid="container-state">
        {state}
      </span>
      <span className={styles.statusItem}>{containerLabel(container)}</span>
      <span className={styles.statusItem}>
        uptime <span data-testid="container-uptime">{reporting ? formatUptime(container.uptime_seconds) : '—'}</span>
      </span>
      <span className={styles.statusItem}>
        <span data-testid="container-restarts">{reporting ? restarts : '—'}</span> restarts last hour
      </span>
      <span className={styles.statusItem}>
        {/* Drift isn't flagged here: it's a claim about the whole stack, and
            this page only ever fetches its own container. The Containers tab
            has the full list and is where that comparison belongs. */}
        running{' '}
        <span data-testid="container-version">
          <ContainerVersion version={container.version} />
        </span>
      </span>
    </div>
  )
}

export default ContainerHealthStrip
