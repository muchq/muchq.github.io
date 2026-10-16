import type { GoView } from './wire'

// The table's sounds, read off the views rather than the viewer's own
// clicks, so an opponent's move sounds the same as yours. A first view
// (arriving, watching mid-game) or another game's says nothing.

export type GoSoundEvent = { kind: 'place' } | { kind: 'pass' } | { kind: 'capture'; stones: number }

export function goSoundEvents(prev: GoView | undefined, next: GoView): GoSoundEvent[] {
  if (prev === undefined || prev.gameId !== next.gameId || next.moveCount <= prev.moveCount) return []
  const events: GoSoundEvent[] = [{ kind: next.lastMove?.pass === true ? 'pass' : 'place' }]
  const taken = (view: GoView) => (view.captures?.black ?? 0) + (view.captures?.white ?? 0)
  const stones = taken(next) - taken(prev)
  if (stones > 0) events.push({ kind: 'capture', stones })
  return events
}

let context: AudioContext | null = null
const audio = (): AudioContext | null => {
  if (typeof AudioContext === 'undefined') return null
  context ??= new AudioContext()
  if (context.state === 'suspended') context.resume().catch(() => {})
  return context
}

// One short decaying tone `at` seconds from now.
const tone = (ctx: AudioContext, at: number, hz: number, seconds: number, gain: number) => {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  const start = ctx.currentTime + at
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(hz, start)
  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + seconds)
  osc.connect(amp).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + seconds)
}

// Synthesized, so there are no files to fetch. A capture rattles once
// per stone taken, up to five.
export function playGoSounds(events: GoSoundEvent[]): void {
  const ctx = audio()
  if (ctx === null) return
  for (const event of events) {
    if (event.kind === 'place') tone(ctx, 0, 900, 0.06, 0.3)
    else if (event.kind === 'pass') tone(ctx, 0, 220, 0.25, 0.15)
    else for (let i = 0; i < Math.min(event.stones, 5); i++) tone(ctx, 0.08 + i * 0.05, 1400, 0.04, 0.15)
  }
}

// iOS starts audio only inside a gesture; any touch at the table will do.
export const unlockGoSounds = (): void => {
  audio()
}
