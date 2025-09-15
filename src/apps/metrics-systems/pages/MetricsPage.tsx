import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MetricsNavigation from '../components/MetricsNavigation'
import MetricsDashboard from '../components/MetricsDashboard'

const MetricsPage = () => {
  const { tab } = useParams<{ tab: string }>()
  const navigate = useNavigate()
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('disconnected')
  const [activeTab, setActiveTab] = useState<'system' | 'portrait'>('system')

  useEffect(() => {
    if (tab === 'system' || tab === 'portrait') {
      setActiveTab(tab)
    } else {
      navigate('/metrics/system', { replace: true })
    }
  }, [tab, navigate])

  const handleConnectionStateChange = useCallback((status: 'connecting' | 'connected' | 'disconnected' | 'failed') => {
    setConnectionStatus(status)
  }, [])

  const handleTabChange = useCallback((newTab: 'system' | 'portrait') => {
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