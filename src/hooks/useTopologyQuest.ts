import { useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export type ModuleType = 
  | 'sets' 
  | 'functions' 
  | 'infinite' 
  | 'metric' 
  | 'topological' 
  | 'continuity' 
  | 'separation' 
  | 'compactness' 
  | 'connectedness' 
  | 'functionspaces'

interface ModuleInfo {
  title: string
  subtitle: string
  moduleNumber: number
}

const moduleData: Record<ModuleType, ModuleInfo> = {
  sets: {
    title: 'Set Theory',
    subtitle: 'Module 1: Introduction to Sets',
    moduleNumber: 1
  },
  functions: {
    title: 'Functions and Relations',
    subtitle: 'Module 2: Functions and Relations',
    moduleNumber: 2
  },
  infinite: {
    title: 'Infinite Sets and Cardinality',
    subtitle: 'Module 3: Infinite Sets and Cardinality',
    moduleNumber: 3
  },
  metric: {
    title: 'Metric Spaces',
    subtitle: 'Module 4: Metric Spaces',
    moduleNumber: 4
  },
  topological: {
    title: 'Topological Spaces',
    subtitle: 'Module 5: Topological Spaces',
    moduleNumber: 5
  },
  continuity: {
    title: 'Continuity & Homeomorphism',
    subtitle: 'Module 6: Continuity and Homeomorphism',
    moduleNumber: 6
  },
  separation: {
    title: 'Separation Axioms',
    subtitle: 'Module 7: Separation Axioms',
    moduleNumber: 7
  },
  compactness: {
    title: 'Compactness',
    subtitle: 'Module 8: Compactness',
    moduleNumber: 8
  },
  connectedness: {
    title: 'Connectedness',
    subtitle: 'Module 9: Connectedness',
    moduleNumber: 9
  },
  functionspaces: {
    title: 'Function Spaces',
    subtitle: 'Module 10: Function Spaces',
    moduleNumber: 10
  }
}

const isValidModule = (module: string): module is ModuleType => {
  return module in moduleData
}

export const useTopologyQuest = () => {
  const params = useParams<{ module: string }>()
  const navigate = useNavigate()
  
  const activeModule: ModuleType = (params.module && isValidModule(params.module))
    ? params.module
    : 'sets'

  // Redirect if invalid module
  useEffect(() => {
    if (params.module && !isValidModule(params.module)) {
      // Invalid module, redirect to sets
      navigate('/top/sets', { replace: true })
    }
  }, [params.module, navigate])
  
  const getModuleInfo = useCallback((): ModuleInfo => {
    return moduleData[activeModule]
  }, [activeModule])
  
  const navigateToModule = useCallback((module: ModuleType) => {
    navigate(`/top/${module}`)
  }, [navigate])
  
  const navigateToNextModule = useCallback(() => {
    const modules = Object.keys(moduleData) as ModuleType[]
    const currentIndex = modules.indexOf(activeModule)
    if (currentIndex < modules.length - 1) {
      const nextModule = modules[currentIndex + 1]
      navigate(`/top/${nextModule}`)
    }
  }, [activeModule, navigate])
  
  const navigateToPreviousModule = useCallback(() => {
    const modules = Object.keys(moduleData) as ModuleType[]
    const currentIndex = modules.indexOf(activeModule)
    if (currentIndex > 0) {
      const prevModule = modules[currentIndex - 1]
      navigate(`/top/${prevModule}`)
    }
  }, [activeModule, navigate])
  
  const getProgressPercentage = useCallback((): number => {
    const modules = Object.keys(moduleData) as ModuleType[]
    const currentIndex = modules.indexOf(activeModule)
    return ((currentIndex + 1) / modules.length) * 100
  }, [activeModule])
  
  const isFirstModule = useCallback((): boolean => {
    return activeModule === 'sets'
  }, [activeModule])
  
  const isLastModule = useCallback((): boolean => {
    return activeModule === 'functionspaces'
  }, [activeModule])
  
  return {
    activeModule,
    setActiveModule: navigateToModule,
    getModuleInfo,
    navigateToNextModule,
    navigateToPreviousModule,
    getProgressPercentage,
    isFirstModule,
    isLastModule,
    moduleData
  }
}