import { useCallback, useEffect, useRef, useState } from 'react'
import { problemById } from './content'
import { freshState, normalize, step, type Action, type ProblemState } from './gate'
import { idOfKey, loadProgress, loadState, saveState, type Progress } from './store'
import type { Problem } from './types'

export interface ProgressApi {
  progress: Progress
  stateOf: (id: string) => ProblemState
  act: (p: Problem, a: Action) => void
  /** Overwrite the given problems' states (an import). Others are kept. */
  merge: (incoming: Progress) => void
}

/** A stored state checked against its problem's current rules. */
const checked = (id: string, s: ProblemState) => {
  const entry = problemById(id)
  return entry ? normalize(entry.problem, s) : s
}

function normalized(progress: Progress): Progress {
  const out: Progress = {}
  for (const [id, s] of Object.entries(progress)) out[id] = checked(id, s)
  return out
}

const load = () => normalized(loadProgress())

export function useProgress(): ProgressApi {
  const [progress, setProgress] = useState<Progress>(load)

  // Save only the problems whose state changed since the last save.
  const saved = useRef(progress)
  useEffect(() => {
    for (const [id, s] of Object.entries(progress)) if (saved.current[id] !== s) saveState(id, s)
    saved.current = progress
  }, [progress])

  // Another tab saved a problem: adopt it. A null key means storage was cleared.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null) return setProgress(load())
      const id = idOfKey(e.key)
      if (id === null) return
      const s = loadState(id)
      setProgress(prev => {
        const next = { ...prev }
        if (s) next[id] = checked(id, s)
        else delete next[id]
        return next
      })
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
