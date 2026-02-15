import { useState, useEffect, useCallback } from 'react'

interface UseGroupsLearningReturn {
  activeTab: string
  setActiveTab: (tab: string) => void
  completedSections: Set<string>
  progress: number
  markComplete: (section: string) => void
  isCompleted: (section: string) => boolean
}

export const useGroupsLearning = (): UseGroupsLearningReturn => {
  const [activeTab, setActiveTab] = useState('overview')
  const [completedSections, setCompletedSections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('groupsProgress')
    if (saved) {
      try {
        const sections = JSON.parse(saved)
        return new Set(sections)
      } catch (error) {
        console.error('Failed to load progress:', error)
      }
    }
    return new Set()
  })

  // Calculate progress percentage (5 chapters total)
  const totalChapters = 5
  const completedCount = Array.from(completedSections).filter(section =>
    section.startsWith('chapter')
  ).length
  const progress = (completedCount / totalChapters) * 100

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('groupsProgress', JSON.stringify(Array.from(completedSections)))
  }, [completedSections])

  const markComplete = useCallback((section: string) => {
    setCompletedSections(prev => new Set([...prev, section]))
  }, [])

  const isCompleted = useCallback((section: string) => {
    return completedSections.has(section)
  }, [completedSections])

  return {
    activeTab,
    setActiveTab,
    completedSections,
    progress,
    markComplete,
    isCompleted
  }
}