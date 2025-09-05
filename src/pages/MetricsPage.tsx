import { useState, useCallback } from 'react'
import MetricsNavigation from '@/components/MetricsNavigation'
import MetricsDashboard from '@/components/MetricsDashboard'

const MetricsPage = () => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('disconnected')

  const handleConnectionStateChange = useCallback((status: 'connecting' | 'connected' | 'disconnected' | 'failed') => {
    setConnectionStatus(status)
  }, [])

  return (
    <div>
      <MetricsDashboard 
        onConnectionStateChange={handleConnectionStateChange}
      />
      <MetricsNavigation 
        connectionStatus={connectionStatus}
      />
    </div>
  )
}

export default MetricsPage