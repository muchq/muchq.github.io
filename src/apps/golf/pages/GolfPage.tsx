import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Navigation from '@/shared/components/Navigation'
import ConnectionStatus from '@/shared/components/nav/ConnectionStatus'
import NavStat from '@/shared/components/nav/NavStat'
import GolfGame from '../components/GolfGame'
import { parsePermalinkParams, type GolfRouteParams } from '../../../utils/golfPermalinks'
import styles from './GolfPage.module.css'

const GolfPage = () => {
  const params = useParams<GolfRouteParams>()
  const permalinkParams = parsePermalinkParams(params)

  const [gameId, setGameId] = useState<string | null>(null)
  const [, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  return (
    <div className={styles.golfPage}>
      <Navigation
        appName="Golf"
        context={
          <>
            {gameId && <NavStat label="Room" value={gameId} />}
            {playerName && <NavStat label="Player" value={playerName} />}
            <ConnectionStatus
              status={isConnected ? 'connected' : 'disconnected'}
              labels={{ connected: 'Connected', disconnected: 'Disconnected' }}
            />
          </>
        }
      />
      <main className={styles.content}>
        <GolfGame
          onGameIdChange={setGameId}
          onPlayerIdChange={setPlayerId}
          onPlayerNameChange={setPlayerName}
          onConnectionChange={setIsConnected}
          permalinkParams={permalinkParams}
        />
      </main>
    </div>
  )
}

export default GolfPage
