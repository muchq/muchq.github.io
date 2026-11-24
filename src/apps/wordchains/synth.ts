import { rungHertz, type Cue } from './sounds'

// Each cue as a few short Web Audio tones: no files, so nothing to
// license. Browsers that lack Web Audio play nothing.

type Note = { hz: number; at: number; length: number; wave?: OscillatorType; gain?: number }

const NOTES: Record<Cue['kind'], (cue: Cue) => Note[]> = {
  rung: cue => [{ hz: rungHertz(cue.kind === 'rung' ? cue.step : 1), at: 0, length: 0.12, wave: 'triangle' }],
  takeBack: () => [{ hz: 392, at: 0, length: 0.08 }, { hz: 330, at: 0.07, length: 0.1 }],
  finish: () => [523.25, 659.25, 783.99, 1046.5].map((hz, i) => ({ hz, at: i * 0.07, length: 0.16, wave: 'triangle' as const })),
  refused: () => [{ hz: 180, at: 0, length: 0.14, wave: 'sine', gain: 0.5 }],
  other: () => [{ hz: 1318.5, at: 0, length: 0.04, wave: 'sine', gain: 0.15 }],
  win: () => [659.25, 783.99, 1046.5, 1318.5].map((hz, i) => ({ hz, at: i * 0.1, length: 0.22, wave: 'square' as const, gain: 0.25 })),
  sharedWin: () => [659.25, 783.99, 1046.5].map((hz, i) => ({ hz, at: i * 0.1, length: 0.22, wave: 'square' as const, gain: 0.25 })),
  lose: () => [{ hz: 392, at: 0, length: 0.18 }, { hz: 311.13, at: 0.16, length: 0.3 }],
  timeout: () => [{ hz: 440, at: 0, length: 0.15 }, { hz: 440, at: 0.2, length: 0.15 }, { hz: 330, at: 0.4, length: 0.3 }]
}

let context: AudioContext | null = null

export function playCue(cue: Cue): void {
  const Context = typeof window === 'undefined' ? undefined : window.AudioContext
  if (Context === undefined) return
  context ??= new Context()
  const ctx = context
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  const now = ctx.currentTime
  for (const note of NOTES[cue.kind](cue)) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = note.wave ?? 'sine'
    osc.frequency.value = note.hz
    const start = now + note.at
    const peak = 0.2 * (note.gain ?? 1)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.length)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + note.length + 0.02)
  }
}
