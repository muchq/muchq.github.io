import { useState, useCallback } from 'react'
import Navigation from '@/shared/components/Navigation'
import NavStat from '@/shared/components/nav/NavStat'
import QuestGame from '../components/QuestGame'
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
      <Navigation
        appName="Quest"
        context={
          questData.gameStarted && (
            <>
              <NavStat label="Level" value={questData.level || 'Classic'} />
              <NavStat label="Score" value={(questData.score || 0).toLocaleString()} />
            </>
          )
        }
      />
      <main className={styles.content}>
        <QuestGame onGameDataChange={handleGameDataChange} />
      </main>
    </div>
  )
}

export default QuestPage
