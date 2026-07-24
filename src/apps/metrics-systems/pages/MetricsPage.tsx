import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navigation from '@/shared/components/Navigation'
import ConnectionStatus, { ConnectionState } from '@/shared/components/nav/ConnectionStatus'
import RotatingText from '@/shared/components/nav/RotatingText'
import MetricsDashboard from '../components/MetricsDashboard'
import ServiceDashboard from '../components/ServiceDashboard'
import styles from '../components/MetricsDashboard.module.css'
import { METRICS_API_URL, fetchJson, serviceDisplayName, type ServiceCatalog } from '../api'

const metricsFacts = [
  "Metrics reveal system health patterns.",
  "Real-time data drives better decisions.",
  "Performance monitoring prevents issues.",
  "Observability is the key to reliability.",
  "Data tells the story of your system.",
  "Metrics are the heartbeat of software."
]

// Pre-overhaul deep links keep working.
const LEGACY_TABS: Record<string, string> = {
  system: 'host',
  containers: 'host',
  microgpt: 'microgpt-serve',
}

const MetricsPage = () => {
  const { tab } = useParams<{ tab: string }>()
  const navigate = useNavigate()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected')
  const [catalog, setCatalog] = useState<ServiceCatalog | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchJson<ServiceCatalog>(`${METRICS_API_URL}/services`).then((result) => {
      if (!cancelled && result) setCatalog(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const activeTab = LEGACY_TABS[tab ?? ''] ?? tab ?? 'host'

  useEffect(() => {
    if (LEGACY_TABS[tab ?? ''] || !tab) {
      navigate(`/metrics/${LEGACY_TABS[tab ?? ''] ?? 'host'}`, { replace: true })
      return
    }
    // Only bounce unknown names once the catalog can actually judge them.
    if (catalog && tab !== 'host' && !catalog.services.some((s) => s.name === tab)) {
      navigate('/metrics/host', { replace: true })
    }
  }, [tab, catalog, navigate])

  const handleConnectionStateChange = useCallback((status: ConnectionState) => {
    setConnectionStatus(status)
  }, [])

  const tabs = [
    { id: 'host', label: 'Host' },
    ...(catalog?.services ?? []).map((service) => ({
      id: service.name,
      label: serviceDisplayName(service.name),
    })),
  ]

  return (
    <div className={styles.dashboard}>
      <div className={styles.tabNavigation}>
        {tabs.map((entry) => (
          <button
            key={entry.id}
            className={`${styles.tab} ${activeTab === entry.id ? styles.activeTab : ''}`}
            onClick={() => navigate(`/metrics/${entry.id}`)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {activeTab === 'host' ? (
        <MetricsDashboard onConnectionStateChange={handleConnectionStateChange} />
      ) : (
        <ServiceDashboard service={activeTab} onConnectionStateChange={handleConnectionStateChange} />
      )}
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
