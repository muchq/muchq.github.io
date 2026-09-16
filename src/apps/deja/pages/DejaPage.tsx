import { useCallback, useState } from 'react'
import Navigation from '@/shared/components/Navigation'
import ConnectionStatus, { type ConnectionState } from '@/shared/components/nav/ConnectionStatus'
import RotatingText from '@/shared/components/nav/RotatingText'
import styles from '@/apps/metrics-systems/components/MetricsDashboard.module.css'
import DejaDashboard from '../components/DejaDashboard'
import type { StreamStatus } from '../useDejaStream'

const dejaFacts = [
  'Every request is a token; the last eight are the context.',
  'Surprise is how unlikely the predictor found what actually came.',
  'An anomaly is surprise past the threshold; a novelty is a token never seen.',
  'The bigram table learns first. The net comes later.',
]

const TONE: Record<StreamStatus, ConnectionState> = {
  connecting: 'connecting',
  live: 'connected',
  polling: 'disconnected',
  offline: 'failed',
}

// The anomaly detector, live (MoonBase#1150). Shares the dashboard chrome
// with /stats and /metrics; the status in the nav is the stream's.
const DejaPage = () => {
  const [status, setStatus] = useState<StreamStatus>('connecting')
  const handleStatusChange = useCallback((next: StreamStatus) => {
    setStatus(next)
  }, [])

  return (
    <div className={styles.dashboard}>
      <DejaDashboard onStatusChange={handleStatusChange} />
      <Navigation
        appName="Deja"
        context={
          <>
            <RotatingText items={dejaFacts} />
            <ConnectionStatus
              status={TONE[status]}
              labels={{
                connecting: 'Connecting to the stream...',
                connected: 'Live',
                disconnected: 'Polling',
                failed: 'Deja unavailable',
              }}
            />
          </>
        }
      />
    </div>
  )
}

export default DejaPage
