import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MetricsNavigation from '../components/MetricsNavigation'
import MetricsDashboard from '../components/MetricsDashboard'

const VALID_TABS = ['system', 'containers', 'portrait', 'microgpt'] as const
type Tab = typeof VALID_TABS[number]

const MetricsPage = () => {
  const { tab } = useParams<{ tab: string }>()
  const navigate = useNavigate()
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('disconnected')

  const activeTab: Tab = (VALID_TABS as readonly string[]).includes(tab ?? '')
    ? tab as Tab
    : 'system'

  useEffect(() => {
    if (!(VALID_TABS as readonly string[]).includes(tab ?? '')) {
      navigate('/metrics/system', { replace: true })
    }
  }, [tab, navigate])

  const handleConnectionStateChange = useCallback((status: 'connecting' | 'connected' | 'disconnected' | 'failed') => {
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
      <MetricsNavigation
        connectionStatus={connectionStatus}
      />
    </div>
  )
}

export default MetricsPage
