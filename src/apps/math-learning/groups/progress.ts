import { createContext, useContext } from 'react'
import { safeLocalStorage } from '@/utils/safeLocalStorage'

// Which problems the reader has solved (or, for proofs, marked done),
// by problem id. Version 1 stored chapter names under 'groupsProgress';
// those chapters no longer exist, so it is left alone, not migrated.
export const PROGRESS_KEY = 'groupsProgress.v2'

export interface GroupsProgress {
  readonly solved: ReadonlySet<string>
  readonly setSolved: (id: string, solved: boolean) => void
}

export const loadSolved = (): Set<string> => {
  try {
    const parsed: unknown = JSON.parse(safeLocalStorage.get(PROGRESS_KEY) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export const saveSolved = (solved: ReadonlySet<string>): void =>
  safeLocalStorage.set(PROGRESS_KEY, JSON.stringify([...solved].sort()))

export const ProgressContext = createContext<GroupsProgress | null>(null)

export const useGroupsProgress = (): GroupsProgress => {
  const progress = useContext(ProgressContext)
  if (progress === null) throw new Error('useGroupsProgress needs a GroupsProgressProvider')
  return progress
}
