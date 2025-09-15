import { useState, useCallback } from 'react'
import QuestGame from '../components/QuestGame'
import QuestNavigation from '../components/QuestNavigation'
import styles from './QuestPage.module.css'

interface QuestPageProps {
  score?: number
  level?: string
  gameStarted?: boolean
}

const QuestPage = () => {
  const [questData, setQuestData] = useState<QuestPageProps>({
    score: 0,
    level: 'Classic',
    gameStarted: false
  })

  const handleGameDataChange = useCallback((data: QuestPageProps) => {
    setQuestData(data)
  }, [])

  return (
    <div className={styles.questPage}>
      <QuestNavigation 
        score={questData.score || 0}
        level={questData.level || 'Classic'}
        gameStarted={questData.gameStarted || false}
      />
      <main className={styles.content}>
        <QuestGame onGameDataChange={handleGameDataChange} />
      </main>
    </div>
  )
}

export default QuestPage