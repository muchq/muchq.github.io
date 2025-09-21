import { useState } from 'react'
import { useParams } from 'react-router-dom'
import GolfNavigation from '../components/GolfNavigation'
import GolfGame from '../components/GolfGame'
import { parsePermalinkParams, type GolfRouteParams } from '../../../utils/golfPermalinks'
import styles from './GolfPage.module.css'

const GolfPage = () => {
  const params = useParams<GolfRouteParams>()
  const permalinkParams = parsePermalinkParams(params)
  
  const [gameId, setGameId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  return (
    <div className={styles.golfPage}>
      <GolfNavigation 
        gameId={gameId}
        playerId={playerId}
        playerName={playerName}
        isConnected={isConnected}
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