import React from 'react'
import { useTopologyQuest } from '@/hooks/useTopologyQuest'
import TopologyQuestNav from '@/components/TopologyQuestNav'
import TopologyQuestModules from '@/components/TopologyQuestModules'
import styles from './LearningPage.module.css'
import '@/styles/retro-theme.css'

const LearningPage: React.FC = () => {
  const { 
    activeModule, 
    setActiveModule, 
    getModuleInfo 
  } = useTopologyQuest()
  
  const moduleInfo = getModuleInfo()

  return (
    <div className={styles.container}>
      <TopologyQuestNav 
        activeModule={activeModule} 
        onModuleChange={setActiveModule} 
      />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Let's Learn: {moduleInfo.title}</h1>
          <p className={styles.subtitle}>{moduleInfo.subtitle}</p>
        </div>

        <TopologyQuestModules activeModule={activeModule} />
      </main>
    </div>
  )
}

export default LearningPage