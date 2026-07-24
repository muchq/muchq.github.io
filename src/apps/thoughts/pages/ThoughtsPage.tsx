import { useState, useRef, useCallback } from 'react'
import Navigation from '@/shared/components/Navigation'
import ConnectionStatus, { ConnectionState } from '@/shared/components/nav/ConnectionStatus'
import NavStat from '@/shared/components/nav/NavStat'
import RotatingText from '@/shared/components/nav/RotatingText'
import ThoughtsGame from '../components/ThoughtsGame'

const thoughts = [
  "Hello.",
  "Are you a nice smelling breeze?",
  "You look great today.",
  "What is wood made of?",
  "Let's all drink more water",
  "Read any good books lately?"
]

const ThoughtsPage = () => {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected')
  const networkManagerRef = useRef<{ reconnect: () => void } | null>(null)

  const handleConnectionStateChange = useCallback((status: ConnectionState) => {
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
      <Navigation
        appName="Thoughts"
        context={
          <>
            {playerId && <NavStat label="Player" value={playerId} />}
            <RotatingText items={thoughts} />
            <ConnectionStatus
              status={connectionStatus}
              labels={{
                connecting: 'Connecting to server...',
                connected: 'Online',
                disconnected: 'Offline',
                failed: 'Offline (Single Player)',
              }}
              onReconnect={handleReconnect}
            />
          </>
        }
      />
    </div>
  )
}

export default ThoughtsPage
