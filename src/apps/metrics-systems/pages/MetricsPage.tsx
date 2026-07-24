import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navigation from '@/shared/components/Navigation'
import ConnectionStatus, { ConnectionState } from '@/shared/components/nav/ConnectionStatus'
import RotatingText from '@/shared/components/nav/RotatingText'
import MetricsDashboard from '../components/MetricsDashboard'

const metricsFacts = [
  "Metrics reveal system health patterns.",
  "Real-time data drives better decisions.",
  "Performance monitoring prevents issues.",
  "Observability is the key to reliability.",
  "Data tells the story of your system.",
  "Metrics are the heartbeat of software."
]

const VALID_TABS = ['system', 'containers', 'portrait', 'microgpt'] as const
type Tab = typeof VALID_TABS[number]

const MetricsPage = () => {
  const { tab } = useParams<{ tab: string }>()
  const navigate = useNavigate()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected')

  const activeTab: Tab = (VALID_TABS as readonly string[]).includes(tab ?? '')
    ? tab as Tab
    : 'system'

  useEffect(() => {
    if (!(VALID_TABS as readonly string[]).includes(tab ?? '')) {
      navigate('/metrics/system', { replace: true })
    }
  }, [tab, navigate])

  const handleConnectionStateChange = useCallback((status: ConnectionState) => {
    setConnectionStatus(status)
  }, [])

  const handleTabChange = useCallback((newTab: Tab) => {
    navigate(`/metrics/${newTab}`)
  }, [navigate])

  return (
    <div>
      <MetricsDashboard
        onConnectionStateChange={handleConnectionStateChange}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <Navigation
        appName="Metrics"
        context={
          <>
            <RotatingText items={metricsFacts} />
            <ConnectionStatus
              status={connectionStatus}
              labels={{
                connecting: 'Connecting to metrics API...',
                connected: 'Live Data',
                disconnected: 'Offline',
                failed: 'API Unavailable',
              }}
            />
          </>
        }
      />
    </div>
  )
}

export default MetricsPage
