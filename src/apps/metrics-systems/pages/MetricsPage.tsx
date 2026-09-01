import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navigation from '@/shared/components/Navigation'
import ConnectionStatus, { ConnectionState } from '@/shared/components/nav/ConnectionStatus'
import RotatingText from '@/shared/components/nav/RotatingText'
import MetricsDashboard from '../components/MetricsDashboard'
import ContainersDashboard from '../components/ContainersDashboard'
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
//
// `containers` used to redirect here to `host`, because the overhaul folded the
// old container view into the host page and the route had nowhere else to go.
// It now resolves to the real Containers tab — the old link pointed at a
// container view, and there is one again, so this is the redirect retiring
// rather than a link breaking.
const LEGACY_TABS: Record<string, string> = {
  system: 'host',
  microgpt: 'microgpt-serve',
}

// Tabs that aren't services, so the catalog can't vouch for them and the
// unknown-tab redirect must not bounce them.
const BUILT_IN_TABS = ['host', 'containers']

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
    // Only bounce unknown names once the catalog can actually judge them;
    // if the catalog never loads, unknown names stay in place (an empty
    // service page) rather than guessing at a redirect.
    if (catalog && !BUILT_IN_TABS.includes(tab) && !catalog.services.some((s) => s.name === tab)) {
      navigate('/metrics/host', { replace: true })
    }
  }, [tab, catalog, navigate])

  const handleConnectionStateChange = useCallback((status: ConnectionState) => {
    setConnectionStatus(status)
  }, [])

  const tabs = [
    { id: 'host', label: 'Host' },
    { id: 'containers', label: 'Containers' },
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
      ) : activeTab === 'containers' ? (
        <ContainersDashboard onConnectionStateChange={handleConnectionStateChange} />
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
