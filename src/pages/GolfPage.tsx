import { useState } from 'react'
import GolfNavigation from '@/components/GolfNavigation'
import GolfGame from '@/components/GolfGame'
import styles from './GolfPage.module.css'

const GolfPage = () => {
  const [roomId, setRoomId] = useState<string | null>(null)
  const [gameId, setGameId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  return (
    <div className={styles.golfPage}>
      <GolfNavigation 
        roomId={roomId}
        gameId={gameId}
        playerId={playerId}
        playerName={playerName}
        isConnected={isConnected}
      />
      <main className={styles.content}>
        <GolfGame 
          onRoomIdChange={setRoomId}
          onGameIdChange={setGameId}
          onPlayerIdChange={setPlayerId}
          onPlayerNameChange={setPlayerName}
          onConnectionChange={setIsConnected}
        />
      </main>
    </div>
  )
}

export default GolfPage