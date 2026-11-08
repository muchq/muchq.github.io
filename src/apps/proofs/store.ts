// Progress lives only in this browser, one localStorage key per problem, so a
// tab writes only the problems it changed and two tabs working on different
// problems cannot overwrite each other. localStorage can be missing or throw
// (private windows, blocked storage); every touch is wrapped and the page
// works without it. Anything read back — from storage or an imported file —
// is rebuilt field by field, so a hand-edited blob cannot put a wrong type in
// front of the gate.
import { freshState, type Grade, type PastAttempt, type ProblemState } from './gate'

export type Progress = Record<string, ProblemState>

const PREFIX = 'proofs.v1.'
export const storageKey = (id: string) => PREFIX + id
/** The problem id a storage key belongs to, or null if it is not one of ours. */
export const idOfKey = (key: string) => (key.startsWith(PREFIX) ? key.slice(PREFIX.length) : null)
const EXPORT_VERSION = 1

const GRADES: readonly Grade[] = ['complete', 'gap', 'wrong']

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0)
const time = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const grade = (v: unknown): Grade | null => (GRADES.includes(v as Grade) ? (v as Grade) : null)

function pastAttempt(v: unknown): PastAttempt | null {
  if (!isObj(v)) return null
  const g = grade(v.grade)
  const at = time(v.at)
  return g === null || at === null ? null : { at, grade: g, hints: count(v.hints), misses: count(v.misses) }
}

export function sanitizeState(v: unknown): ProblemState | null {
  if (!isObj(v)) return null
  const history = Array.isArray(v.history)
    ? v.history.map(pastAttempt).filter((h): h is PastAttempt => h !== null)
    : []
  const s = freshState(history)
  s.attempt = typeof v.attempt === 'string' ? v.attempt : ''
  s.spentOn = typeof v.spentOn === 'string' ? v.spentOn : null
  s.hints = count(v.hints)
  s.verdict = typeof v.verdict === 'boolean' ? v.verdict : null
  s.line = typeof v.line === 'number' && Number.isInteger(v.line) && v.line >= 1 ? v.line : null
  s.confirmed = v.confirmed === true
  s.misses = count(v.misses)
  s.solution = v.solution === true
  // A grade only means something once the reference was seen; a redo date
  // only once something was graded (it outlives a restart).
  s.grade = s.solution ? grade(v.grade) : null
  s.redoAt = s.grade !== null || history.length > 0 ? time(v.redoAt) : null
  return s
}

export function sanitizeProgress(v: unknown): Progress {
  const out: Progress = {}
  if (!isObj(v)) return out
  for (const [id, raw] of Object.entries(v)) {
    const s = sanitizeState(raw)
    if (s) out[id] = s
  }
  return out
}

export function loadState(id: string): ProblemState | null {
  try {
    const raw = localStorage.getItem(storageKey(id))
    return raw ? sanitizeState(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function loadProgress(): Progress {
  const out: Progress = {}
  try {
    const ids: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const id = idOfKey(localStorage.key(i) ?? '')
      if (id !== null) ids.push(id)
    }
    for (const id of ids) {
      const s = loadState(id)
      if (s) out[id] = s
    }
  } catch {
    // storage unavailable
  }
  return out
}

export function saveState(id: string, s: ProblemState): void {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(s))
  } catch {
    // storage unavailable; the session keeps working in memory
  }
}

export function saveProgress(progress: Progress): void {
  for (const [id, s] of Object.entries(progress)) saveState(id, s)
}

export function exportProgress(progress: Progress): string {
  return JSON.stringify({ version: EXPORT_VERSION, progress }, null, 2)
}

/** The progress in an exported file, or null if the text is not one. */
export function importProgress(text: string): Progress | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!isObj(parsed) || parsed.version !== EXPORT_VERSION || !isObj(parsed.progress)) return null
    return sanitizeProgress(parsed.progress)
  } catch {
    return null
  }
}
