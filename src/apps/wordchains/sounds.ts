import type { WordchainView } from './wire'

// What a change in the viewer's race sounds like (MoonBase#1725). The
// view is the whole truth, so a cue is read off two views in a row, never
// off a move sent: a word the hub refused never reaches a view.

export type Cue =
  | { kind: 'rung'; step: number }
  | { kind: 'takeBack' }
  | { kind: 'finish' }
  | { kind: 'refused' }
  | { kind: 'other' }
  | { kind: 'win' }
  | { kind: 'sharedWin' }
  | { kind: 'lose' }
  | { kind: 'timeout' }

const raceOf = (view: WordchainView) => `${view.start}|${view.target}|${view.startedAtMs}`

const othersClimbed = (view: WordchainView, playerId: string) =>
  view.runners.filter(runner => runner.playerId !== playerId).reduce((sum, runner) => sum + runner.words, 0)

export function cuesFor(prev: WordchainView | undefined, next: WordchainView, playerId: string): Cue[] {
  if (prev === undefined || raceOf(prev) !== raceOf(next)) return []
  const cues: Cue[] = []
  const was = prev.runners.find(runner => runner.playerId === playerId)
  const now = next.runners.find(runner => runner.playerId === playerId)
  const before = was?.ladder?.length ?? 0
  const after = now?.ladder?.length ?? 0
  if (after > before) {
    cues.push(now?.finishedAtMs !== undefined ? { kind: 'finish' } : { kind: 'rung', step: after })
  } else if (after < before) {
    cues.push({ kind: 'takeBack' })
  }
  if (othersClimbed(next, playerId) > othersClimbed(prev, playerId)) cues.push({ kind: 'other' })
  const result = next.result
  if (result !== undefined && prev.result === undefined) {
    if (next.practice) {
      if (now?.finishedAtMs === undefined) cues.push({ kind: 'timeout' })
    } else if (result.winners.includes(playerId)) {
      cues.push({ kind: result.winners.length > 1 ? 'sharedWin' : 'win' })
    } else {
      cues.push({ kind: result.ending === 'timeout' && result.winners.length === 0 ? 'timeout' : 'lose' })
    }
  }
  return cues
}

// C major pentatonic from C5, one note per step: a ladder climbs.
const PENTATONIC = [0, 2, 4, 7, 9]
export function rungHertz(step: number): number {
  const index = Math.max(0, step - 1)
  const semitones = 12 * Math.floor(index / PENTATONIC.length) + PENTATONIC[index % PENTATONIC.length]
  return 523.25 * 2 ** (semitones / 12)
}
