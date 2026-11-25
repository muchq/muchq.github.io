import type { WordchainResult, WordchainRunner, WordchainView } from './wire'

// The race's words, said one way: a step is a word played after the
// start, the target among them. The hub's par counts a shortest ladder's
// words with both ends, so its steps are one fewer.

export const parSteps = (view: WordchainView): number | undefined => (view.par === undefined ? undefined : view.par - 1)

export const steps = (count: number): string => `${count} ${count === 1 ? 'step' : 'steps'}`

export const you = (id: string, playerId: string): string => (id === playerId ? 'you' : id)

const list = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

const runnerOf = (view: WordchainView, id: string): WordchainRunner | undefined => view.runners.find(runner => runner.playerId === id)

// "You won in 4 steps.", "alice and bob share the win in 5 steps.",
// "Time ran out: nobody finished."
export function describeResult(result: WordchainResult, view: WordchainView, playerId: string): string {
  const why = { finished: '', timeout: 'Time ran out: ', leave: 'Too few seats stayed: ' }[result.ending]
  if (result.winners.length === 0) return `${why}nobody finished.`
  const first = runnerOf(view, result.winners[0])
  const how = first === undefined ? '' : ` in ${steps(first.words)}`
  const who = list(result.winners.map(id => you(id, playerId)))
  const verb = result.winners.length > 1 ? 'share the win' : 'won'
  // Only "you" opens a sentence capitalized: a player's id is as they typed it.
  const opened = why === '' && who.startsWith('you') ? `Y${who.slice(1)}` : who
  return `${why}${opened} ${verb}${how}.`
}

// A practice race's end, naming no winner: "Finished in 3 steps (par 4).",
// or "Time ran out."
export function describePractice(view: WordchainView, playerId: string): string {
  const me = runnerOf(view, playerId)
  if (me?.finishedAtMs === undefined) return 'Time ran out.'
  const par = parSteps(view)
  return `Finished in ${steps(me.words)}${par === undefined ? '' : ` (par ${par})`}.`
}

// m:ss left on the clock, never below zero.
export function clockText(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// What a quick race's table says on this clock (MoonBase#1736): still
// looking and for how long, expired, or matched and counting down to the
// first word; nothing for a room table or a race under way.
export type QuickStatus = { kind: 'looking'; msLeft: number } | { kind: 'expired' } | { kind: 'starting'; count: number }

export function quickStatus(view: WordchainView, nowMs: number): QuickStatus | null {
  if (view.phase === 'waiting' && view.seek !== undefined) {
    if (view.seek.expired || nowMs >= view.seek.deadlineMs) return { kind: 'expired' }
    return { kind: 'looking', msLeft: view.seek.deadlineMs - nowMs }
  }
  if (view.phase === 'racing' && view.startedAtMs !== undefined && nowMs < view.startedAtMs) {
    return { kind: 'starting', count: Math.ceil((view.startedAtMs - nowMs) / 1000) }
  }
  return null
}
