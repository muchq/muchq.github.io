import React from 'react'
import { ModuleType } from '@/hooks/useTopologyQuest'
import SetTheoryModule from './SetTheoryModule'
import FunctionsModule from './FunctionsModule'
import InfiniteSetsModule from './InfiniteSetsModule'
import MetricSpacesModule from './MetricSpacesModule'
import TopologicalSpacesModule from './TopologicalSpacesModule'
import ContinuityModule from './ContinuityModule'
import SeparationAxiomsModule from './SeparationAxiomsModule'
import CompactnessModule from './CompactnessModule'
import ConnectednessModule from './ConnectednessModule'
import FunctionSpacesModule from './FunctionSpacesModule'
import styles from '../styles/ModuleStyles.module.css'

interface TopologyQuestModulesProps {
  activeModule: ModuleType
}

const TopologyQuestModules: React.FC<TopologyQuestModulesProps> = ({ activeModule }) => {
  const renderModule = () => {
    switch (activeModule) {
      case 'sets':
        return <SetTheoryModule />
      
      case 'functions':
        return <FunctionsModule />
      
      case 'infinite':
        return <InfiniteSetsModule />
      
      case 'metric':
        return <MetricSpacesModule />
      
      case 'topological':
        return <TopologicalSpacesModule />
      
      case 'continuity':
        return <ContinuityModule />
      
      case 'separation':
        return <SeparationAxiomsModule />
      
      case 'compactness':
        return <CompactnessModule />
      
      case 'connectedness':
        return <ConnectednessModule />
      
      case 'functionspaces':
        return <FunctionSpacesModule />
      
      default:
        return <SetTheoryModule />
    }
  }

  return (
    <div className={styles.modulesWrapper}>
      {renderModule()}
    </div>
  )
}

export default TopologyQuestModules