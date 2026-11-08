// Progress lives only in this browser. localStorage can be missing or throw
// (private windows, blocked storage); every touch is wrapped and the page
// works without it. Anything read back — from storage or an imported file —
// is rebuilt field by field, so a hand-edited blob cannot put a wrong type in
// front of the gate.
import { freshState, type Grade, type PastAttempt, type ProblemState } from './gate'

export type Progress = Record<string, ProblemState>

export const STORAGE_KEY = 'proofs.progress.v1'
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

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? sanitizeProgress(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // storage unavailable; the session keeps working in memory
  }
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
