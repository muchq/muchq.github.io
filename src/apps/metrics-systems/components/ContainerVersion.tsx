import styles from './MetricsDashboard.module.css'
import { buildUrl, commitUrl, isCommitSha, shortVersion } from '../api'

// The running revision, linked to the code and the build that produced it
// (MoonBase#1208 §4). Deploys pin every image to a commit SHA, so the tag is
// the revision actually running rather than what the host was told to run.
//
// Upstream images (caddy:2-alpine, prom/prometheus:v2.55.0) get no links —
// there is no MoonBase commit behind them and /commit/2-alpine would 404.
export const ContainerVersion = ({ version, drifted = false }: { version?: string; drifted?: boolean }) => {
  if (!version) return <span>—</span>
  if (!isCommitSha(version)) return <span title={version}>{version}</span>

  return (
    <span>
      {/* Short SHA displayed, full SHA linked and on hover. */}
      <a href={commitUrl(version)} target="_blank" rel="noreferrer" title={version}>
        {shortVersion(version)}
      </a>
      {' · '}
      <a href={buildUrl(version)} target="_blank" rel="noreferrer">
        build
      </a>
      {/* A container running a revision the rest of the stack isn't means the
          deploy didn't recreate it — the failure that leaves one service on
          yesterday's code while every other signal looks healthy. */}
      {drifted && (
        <span
          className={styles.driftFlag}
          data-testid="version-drift"
          title="Not the revision the rest of the stack is running"
        >
          {' '}
          drift
        </span>
      )}
    </span>
  )
}

export default ContainerVersion
