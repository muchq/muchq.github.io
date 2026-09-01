import { useCallback, useState } from 'react'
import Navigation from '@/shared/components/Navigation'
import ConnectionStatus, { ConnectionState } from '@/shared/components/nav/ConnectionStatus'
import RotatingText from '@/shared/components/nav/RotatingText'
import styles from '@/apps/metrics-systems/components/MetricsDashboard.module.css'
import StatsDashboard from '../components/StatsDashboard'

const statsFacts = [
  'Every request leaves a line in the access log.',
  'Scrapers that ignore robots.txt still send a User-Agent.',
  'A 403 is a question: does the crawler come back?',
  'The probes tell you what the internet thinks you run.',
]

// Log-derived traffic stats on their own page: the metrics dashboard
// stayed live operational series, and this is long-window aggregates
// (MoonBase#1460). Shares the dashboard chrome so the two read as kin.
const StatsPage = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected')
  const handleConnectionStateChange = useCallback((status: ConnectionState) => {
    setConnectionStatus(status)
  }, [])

  return (
    <div className={styles.dashboard}>
      <StatsDashboard onConnectionStateChange={handleConnectionStateChange} />
      <Navigation
        appName="Stats"
        context={
          <>
            <RotatingText items={statsFacts} />
            <ConnectionStatus
              status={connectionStatus}
              labels={{
                connecting: 'Loading aggregates...',
                connected: 'Aggregates loaded',
                disconnected: 'Offline',
                failed: 'Stats API unavailable',
              }}
            />
          </>
        }
      />
    </div>
  )
}

export default StatsPage
