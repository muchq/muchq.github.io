import { useState, useEffect } from 'react'
import styles from './NewGameNotification.module.css'
import PermalinkDisplay from './PermalinkDisplay'
import { generateGamePermalink } from '../../../utils/golfPermalinks'

interface NewGameNotificationProps {
  gameId: string
  roomId: string
  onJoin: (gameId: string) => void
  onDismiss: (gameId: string) => void
  timestamp: number
}

const NewGameNotification = ({ 
  gameId, 
  roomId, 
  onJoin, 
  onDismiss, 
  timestamp 
}: NewGameNotificationProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const gamePermalink = `${window.location.origin}${generateGamePermalink(roomId, gameId)}`
  
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const formatTimeAgo = (timestamp: number) => {
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) {
      return 'just now'
    } else if (minutes === 1) {
      return '1 minute ago'
    } else {
      return `${minutes} minutes ago`
    }
  }

  const handleJoin = () => {
    onJoin(gameId)
  }

  const handleDismiss = () => {
    onDismiss(gameId)
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={styles.notification}>
      <div className={styles.header}>
        <div className={styles.info}>
          <div className={styles.gameId}>🎮 New Game: {gameId}</div>
          <div className={styles.timestamp}>{formatTimeAgo(timestamp)}</div>
        </div>
        <div className={styles.actions}>
          <button 
            onClick={handleJoin}
            className={styles.joinButton}
            title="Join this game"
          >
            Join Game
          </button>
          <button 
            onClick={toggleExpanded}
            className={styles.expandButton}
            title="Show game link"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <button 
            onClick={handleDismiss}
            className={styles.dismissButton}
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className={styles.expandedContent}>
          <div className={styles.permalinkSection}>
            <PermalinkDisplay
              label="Share Game Link"
              url={gamePermalink}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default NewGameNotification