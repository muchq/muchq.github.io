import { useState, useRef, useCallback } from 'react'
import ThoughtsNavigation from '@/components/ThoughtsNavigation'
import ThoughtsGame from '@/components/ThoughtsGame'

const ThoughtsPage = () => {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('disconnected')
  const networkManagerRef = useRef<{ reconnect: () => void } | null>(null)

  const handleConnectionStateChange = useCallback((status: 'connecting' | 'connected' | 'disconnected' | 'failed') => {
    setConnectionStatus(status)
  }, [])

  const handleReconnect = useCallback(() => {
    if (networkManagerRef.current?.reconnect) {
      networkManagerRef.current.reconnect()
    }
  }, [])

  return (
    <div>
      <ThoughtsGame 
        onPlayerIdReceived={setPlayerId} 
        onConnectionStateChange={handleConnectionStateChange}
        networkManagerRef={networkManagerRef}
      />
      <ThoughtsNavigation 
        playerId={playerId} 
        connectionStatus={connectionStatus}
        onReconnect={handleReconnect}
      />
    </div>
  )
}

export default ThoughtsPage