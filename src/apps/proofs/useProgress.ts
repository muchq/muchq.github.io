import { useCallback, useEffect, useState } from 'react'
import { freshState, step, type Action, type ProblemState } from './gate'
import { loadProgress, saveProgress, type Progress } from './store'
import type { Problem } from './types'

export interface ProgressApi {
  progress: Progress
  stateOf: (id: string) => ProblemState
  act: (p: Problem, a: Action) => void
  /** Overwrite the given problems' states (an import). Others are kept. */
  merge: (incoming: Progress) => void
}

export function useProgress(): ProgressApi {
  const [progress, setProgress] = useState<Progress>(loadProgress)

  useEffect(() => saveProgress(progress), [progress])

  const act = useCallback((p: Problem, a: Action) => {
    setProgress(prev => {
      const cur = prev[p.id] ?? freshState()
      const next = step(p, cur, a)
      return next === cur ? prev : { ...prev, [p.id]: next }
    })
  }, [])

  const merge = useCallback((incoming: Progress) => setProgress(prev => ({ ...prev, ...incoming })), [])

  const stateOf = useCallback((id: string) => progress[id] ?? freshState(), [progress])

  return { progress, stateOf, act, merge }
}
