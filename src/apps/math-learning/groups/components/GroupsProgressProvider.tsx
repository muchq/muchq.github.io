import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ProgressContext, loadSolved, saveSolved } from '../progress'

const GroupsProgressProvider = ({ children }: { children: ReactNode }) => {
  const [solved, setSolvedSet] = useState(loadSolved)

  useEffect(() => saveSolved(solved), [solved])

  const setSolved = useCallback((id: string, done: boolean) => {
    setSolvedSet(prev => {
      if (prev.has(id) === done) return prev
      const next = new Set(prev)
      if (done) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const value = useMemo(() => ({ solved, setSolved }), [solved, setSolved])
  return <ProgressContext value={value}>{children}</ProgressContext>
}

export default GroupsProgressProvider
