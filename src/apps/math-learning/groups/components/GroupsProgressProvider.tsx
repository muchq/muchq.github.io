import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { PROGRESS_KEY, ProgressContext, loadSolved, saveSolved } from '../progress'

const GroupsProgressProvider = ({ children }: { children: ReactNode }) => {
  const [solved, setSolvedSet] = useState(loadSolved)

  useEffect(() => saveSolved(solved), [solved])

  // Another tab saved: adopt its set, so our next save doesn't erase its work.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROGRESS_KEY) setSolvedSet(loadSolved())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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
