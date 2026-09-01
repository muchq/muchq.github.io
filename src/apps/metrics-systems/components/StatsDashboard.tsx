import { useEffect, useMemo, useState } from 'react'
import styles from './MetricsDashboard.module.css'
import { ConnectionState } from '@/shared/components/nav/ConnectionStatus'
import {
  STATS_API_URL,
  fetchJson,
  type StatsSummary,
  type TopSlugs,
} from '../api'

interface Props {
  onConnectionStateChange: (status: ConnectionState) => void
}

// Traffic stats derived from shipped Caddy access logs (MoonBase#1460):
// who is crawling (the four agent classes, AI scrapers split out), per
// vhost, plus the most-followed iili short links. Counts refresh on the
// aggregator's own cadence, so this fetches once per mount rather than
// polling.
const StatsDashboard = ({ onConnectionStateChange }: Props) => {
  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const [slugs, setSlugs] = useState<TopSlugs | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    onConnectionStateChange('connecting')
    Promise.all([
      fetchJson<StatsSummary>(`${STATS_API_URL}/summary?days=7`),
      fetchJson<TopSlugs>(`${STATS_API_URL}/iili/top?days=30&limit=20`),
    ]).then(([summaryResult, slugResult]) => {
      if (cancelled) return
      setSummary(summaryResult)
      setSlugs(slugResult)
      setLoaded(true)
      onConnectionStateChange(summaryResult ? 'connected' : 'failed')
    })
    return () => {
      cancelled = true
    }
  }, [onConnectionStateChange])

  // One row per host over the window, with the agent classes as columns —
  // "how much of my traffic is AI scrapers" should be one glance, not a
  // pivot the reader does in their head.
  const byHost = useMemo(() => {
    const hosts = new Map<
      string,
      { total: number; errors: number; classes: Record<string, number> }
    >()
    for (const row of summary?.rows ?? []) {
      const entry = hosts.get(row.host) ?? { total: 0, errors: 0, classes: {} }
      entry.total += row.requests
      entry.errors += row.errors
      entry.classes[row.agent_class] = (entry.classes[row.agent_class] ?? 0) + row.requests
      hosts.set(row.host, entry)
    }
    return [...hosts.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [summary])

  if (!loaded) {
    return <div className={styles.noData}>Loading stats…</div>
  }
  if (!summary) {
    return (
      <div className={styles.noData}>
        Stats API unavailable. The stats profile may not be deployed yet.
      </div>
    )
  }

  const agentClasses = ['browser', 'ai_scraper', 'bot', 'other']

  return (
    <div className={styles.metricsGrid}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Traffic by host — last {summary.days} days</h2>
        <div className={styles.tableScroll}>
          <table className={styles.containerTable}>
            <thead>
              <tr>
                <th>Host</th>
                <th>Requests</th>
                <th>Errors</th>
                <th>Browser</th>
                <th>AI scrapers</th>
                <th>Bots</th>
                <th>Other</th>
              </tr>
            </thead>
            <tbody>
              {byHost.map(([host, entry]) => (
                <tr key={host}>
                  <td>{host}</td>
                  <td>{entry.total.toLocaleString()}</td>
                  <td>{entry.errors.toLocaleString()}</td>
                  {agentClasses.map((agentClass) => (
                    <td key={agentClass}>{(entry.classes[agentClass] ?? 0).toLocaleString()}</td>
                  ))}
                </tr>
              ))}
              {byHost.length === 0 && (
                <tr>
                  <td colSpan={7}>No aggregated traffic yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Top short links — last {slugs?.days ?? 30} days
        </h2>
        <div className={styles.tableScroll}>
          <table className={styles.containerTable}>
            <thead>
              <tr>
                <th>Slug</th>
                <th>Follows</th>
              </tr>
            </thead>
            <tbody>
              {(slugs?.rows ?? []).map((row) => (
                <tr key={row.slug}>
                  <td>{row.slug}</td>
                  <td>{row.requests.toLocaleString()}</td>
                </tr>
              ))}
              {(slugs?.rows ?? []).length === 0 && (
                <tr>
                  <td colSpan={2}>No redirects aggregated yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default StatsDashboard
