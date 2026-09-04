import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Navigation from '@/shared/components/Navigation'
import ConnectionStatus from '@/shared/components/nav/ConnectionStatus'
import NavStat from '@/shared/components/nav/NavStat'
import { isValidId } from '@/utils/golfPermalinks'
import CastleGame from '../components/CastleGame'
import styles from './CastlePage.module.css'

const CastlePage = () => {
  const { roomId } = useParams<{ roomId?: string }>()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  return (
    <div className={styles.page}>
      <Navigation
        appName="Castle"
        context={
          <>
            {playerId && <NavStat label="Player" value={playerId} />}
            <ConnectionStatus
              status={connected ? 'connected' : 'disconnected'}
              labels={{ connected: 'Connected', disconnected: 'Disconnected' }}
            />
          </>
        }
      />
      <main className={styles.content}>
        <CastleGame
          permalinkRoomId={isValidId(roomId) ? roomId : null}
          onPlayerIdChange={setPlayerId}
          onConnectionChange={setConnected}
        />
      </main>
    </div>
  )
}

export default CastlePage
