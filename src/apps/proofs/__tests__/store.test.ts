import { afterEach, describe, expect, it, vi } from 'vitest'
import { freshState, type ProblemState } from '../gate'
import { exportProgress, importProgress, loadProgress, sanitizeState, saveProgress, STORAGE_KEY } from '../store'

const graded: ProblemState = {
  ...freshState(),
  attempt: 'my proof',
  spentOn: 'my proof',
  hints: 2,
  solution: true,
  grade: 'gap',
  redoAt: 123,
  history: [{ at: 100, grade: 'gap', hints: 2, misses: 0 }],
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('progress storage', () => {
  it('round-trips through localStorage', () => {
    saveProgress({ '2.1': graded })
    expect(loadProgress()).toEqual({ '2.1': graded })
  })

  it('starts empty on missing or corrupt storage', () => {
    expect(loadProgress()).toEqual({})
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadProgress()).toEqual({})
    localStorage.setItem(STORAGE_KEY, '[1,2]')
    expect(loadProgress()).toEqual({})
  })

  it('survives storage that throws, on read and on write', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(loadProgress()).toEqual({})
    expect(() => saveProgress({ '2.1': graded })).not.toThrow()
  })
})

describe('sanitizing what comes back', () => {
  it('keeps a well-formed state exactly', () => {
    expect(sanitizeState(JSON.parse(JSON.stringify(graded)))).toEqual(graded)
  })

  it('drops non-objects', () => {
    for (const v of [null, 3, 'x', [], undefined]) expect(sanitizeState(v)).toBeNull()
  })

  it('replaces wrongly typed fields with defaults rather than passing them on', () => {
    const s = sanitizeState({
      attempt: 7,
      spentOn: {},
      hints: -2,
      verdict: 'yes',
      line: 0,
      confirmed: 'true',
      misses: 1.5,
      solution: 1,
      grade: 'complete',
      redoAt: 'soon',
      history: [{ at: 1, grade: 'nope' }, 'x', { at: 2, grade: 'wrong', hints: 1, misses: 3 }],
    })
    expect(s).toEqual({
      ...freshState(),
      history: [{ at: 2, grade: 'wrong', hints: 1, misses: 3 }],
    })
  })

  // A grade without a seen reference would let a hand-edited store mark a
  // problem solved that was never attempted.
  it('refuses a grade on a state whose reference was never revealed, and keeps it on one that was', () => {
    expect(sanitizeState({ solution: false, grade: 'complete', redoAt: 5 })?.grade).toBeNull()
    expect(sanitizeState({ solution: false, grade: 'complete', redoAt: 5 })?.redoAt).toBeNull()
    expect(sanitizeState({ solution: true, grade: 'complete', redoAt: 5 })?.grade).toBe('complete')
  })
})

describe('export and import', () => {
  it('round-trips an export', () => {
    expect(importProgress(exportProgress({ '2.1': graded }))).toEqual({ '2.1': graded })
  })

  it('rejects files that are not exports', () => {
    expect(importProgress('nope')).toBeNull()
    expect(importProgress(JSON.stringify({ '2.1': graded }))).toBeNull()
    expect(importProgress(JSON.stringify({ version: 2, progress: {} }))).toBeNull()
    expect(importProgress(JSON.stringify({ version: 1, progress: [] }))).toBeNull()
  })

  it('drops malformed entries inside a valid export', () => {
    const text = JSON.stringify({ version: 1, progress: { '2.1': graded, '2.2': 'garbage' } })
    expect(importProgress(text)).toEqual({ '2.1': graded })
  })
})
