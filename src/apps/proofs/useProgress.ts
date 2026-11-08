import { useCallback, useEffect, useState } from 'react'
import { problemById } from './content'
import { freshState, normalize, step, type Action, type ProblemState } from './gate'
import { loadProgress, saveProgress, STORAGE_KEY, type Progress } from './store'
import type { Problem } from './types'

export interface ProgressApi {
  progress: Progress
  stateOf: (id: string) => ProblemState
  act: (p: Problem, a: Action) => void
  /** Overwrite the given problems' states (an import). Others are kept. */
  merge: (incoming: Progress) => void
}

/** Every stored state checked against its problem's current rules. */
function normalized(progress: Progress): Progress {
  const out: Progress = {}
  for (const [id, s] of Object.entries(progress)) {
    const entry = problemById(id)
    out[id] = entry ? normalize(entry.problem, s) : s
  }
  return out
}

const load = () => normalized(loadProgress())

export function useProgress(): ProgressApi {
  const [progress, setProgress] = useState<Progress>(load)

  useEffect(() => saveProgress(progress), [progress])

  // Another tab saved: adopt its copy, so the next save here does not write
  // over its work. Every change is saved at once, so the copies agree.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setProgress(load())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const act = useCallback((p: Problem, a: Action) => {
    setProgress(prev => {
      const cur = normalize(p, prev[p.id] ?? freshState())
      const next = step(p, cur, a)
      return next === cur ? prev : { ...prev, [p.id]: next }
    })
  }, [])

  const merge = useCallback((incoming: Progress) => setProgress(prev => ({ ...prev, ...normalized(incoming) })), [])

  const stateOf = useCallback((id: string) => progress[id] ?? freshState(), [progress])

  return { progress, stateOf, act, merge }
}
