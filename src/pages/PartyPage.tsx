import { useState } from 'react'
import PartyNavigation from '@/components/PartyNavigation'
import PartyGame from '@/components/PartyGame'
import styles from './PartyPage.module.css'

const PartyPage = () => {
  const [gameId, setGameId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  return (
    <div className={styles.partyPage}>
      <PartyNavigation 
        gameId={gameId}
        playerId={playerId}
        playerName={playerName}
        isConnected={isConnected}
      />
      <main className={styles.content}>
        <PartyGame 
          onGameIdChange={setGameId}
          onPlayerIdChange={setPlayerId}
          onPlayerNameChange={setPlayerName}
          onConnectionChange={setIsConnected}
        />
      </main>
    </div>
  )
}

export default PartyPage