import { describe, it, expect } from 'vitest'
import {
  renderBounce,
  renderNote,
  renderPulse,
  renderSample,
  waveSample,
  TECHNO_SOUND,
  CALM_SOUND,
  CHIPTUNE_SOUND,
} from '../audioSystem'

// A phone, and any window under 1024px, hears a track rendered ahead of
// time rather than the scheduler. It has to be the same room: the kick
// and the pluck are what the techno is, and a client without them is
// listening to something else.

const RATE = 44100
const buffer = (seconds: number) => new Float32Array(Math.floor(RATE * seconds))
const energy = (data: Float32Array, from: number, to: number) => {
  let sum = 0
  for (let i = Math.floor(from * RATE); i < Math.floor(to * RATE); i++) sum += Math.abs(data[i])
  return sum
}
// How much of a signal is high: the size of its sample-to-sample step
// against its own size. A sine sits near 2*sin(pi*f/rate); a saw, whose
// harmonics run up to Nyquist, sits far above that, and a lowpass
// closing over it brings it back down.
const rms = (values: number[]) => Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / Math.max(values.length, 1))
const highness = (data: Float32Array, from: number, to: number) => {
  const window = Array.from(data.slice(Math.floor(from * RATE), Math.floor(to * RATE)))
  const steps = window.slice(1).map((v, i) => v - window[i])
  return rms(steps) / Math.max(rms(window), 1e-12)
}
const crossings = (data: Float32Array, from: number, to: number) => {
  let count = 0
  for (let i = Math.floor(from * RATE) + 1; i < Math.floor(to * RATE); i++) {
    if (data[i - 1] < 0 !== data[i] < 0) count++
  }
  return count
}

describe('renderPulse', () => {
  const pulse = TECHNO_SOUND.pulse!

  it('drops in pitch and decays, and is silent outside its own window', () => {
    const data = buffer(1)
    renderPulse(data, RATE, 0.25, pulse, 1)
    expect(energy(data, 0, 0.24)).toBe(0)
    expect(energy(data, 0.25 + pulse.duration + 0.01, 1)).toBe(0)
    const early = crossings(data, 0.25, 0.25 + pulse.duration / 4)
    const late = crossings(data, 0.25 + (pulse.duration * 3) / 4, 0.25 + pulse.duration)
    expect(early).toBeGreaterThan(late)
    expect(energy(data, 0.25, 0.3)).toBeGreaterThan(energy(data, 0.3, 0.35))
  })

  it('mixes into what is already there rather than wiping it', () => {
    const data = buffer(0.5)
    data.fill(0.2)
    renderPulse(data, RATE, 0, pulse, 1)
    expect(data[10]).not.toBeCloseTo(0.2, 6)
    expect(data[data.length - 1]).toBeCloseTo(0.2, 6)
  })
})

describe('renderSample', () => {
  it('mixes a mono buffer into the track at the given gain and time', () => {
    const samples = new Float32Array([0.5, -0.5, 0.25, -0.25])
    const fakeBuffer = {
      numberOfChannels: 1,
      length: samples.length,
      sampleRate: RATE,
      duration: samples.length / RATE,
      getChannelData: () => samples,
    } as unknown as AudioBuffer
    const data = buffer(0.01)
    data.fill(0.1)
    renderSample(data, RATE, fakeBuffer, 0.001, 0.5)
    const start = Math.floor(0.001 * RATE)
    expect(data[start]).toBeCloseTo(0.1 + 0.5 * 0.5, 5)
    expect(data[start + 1]).toBeCloseTo(0.1 + -0.5 * 0.5, 5)
    expect(data[0]).toBeCloseTo(0.1, 5)
  })
})

// The pluck the engine can render, kept here rather than read off a
// room: the glasshouse is drums and bass for now and names no filter,
// but renderNote still has to shut one over a note when asked.
const PLUCK = { from: 1600, to: 220, seconds: 0.11, q: 10 }

describe('renderNote', () => {
  // Low enough that a saw's harmonics sit well above the corner the
  // filter sweeps down to, which is the whole point of the pluck.
  const note = { frequency: 220, startTime: 0.1, duration: 0.3, volume: 0.5, wave: 'sawtooth' as const }

  it('plucks the note, taking the edge off a saw as the filter shuts', () => {
    const plain = buffer(0.6)
    const plucked = buffer(0.6)
    renderNote(plain, RATE, note)
    renderNote(plucked, RATE, { ...note, filter: PLUCK })
    // Same note, rounder: a lowpass closing over it moves less sample to
    // sample, and moves less still by the end than at the start.
    expect(highness(plucked, 0.14, 0.38)).toBeLessThan(highness(plain, 0.14, 0.38))
    expect(energy(plucked, 0.1, 0.4)).toBeGreaterThan(0)
    // Both windows sit in the note's sustain, one before the sweep has
    // run and one after, so the envelope is not what is being measured.
    // Taken from the filter's own length rather than pinned to a clock:
    // a room that sweeps faster still has to sweep.
    const sustain = note.startTime + note.duration * 0.1 + 0.002
    const opening = highness(plucked, sustain, sustain + 0.02)
    const settled = note.startTime + PLUCK.seconds + 0.05
    const closing = highness(plucked, settled, note.startTime + note.duration * 0.7)
    expect(closing).toBeLessThan(opening * 0.75)
    // And by the end it is near enough a sine at the note's own pitch.
    expect(closing).toBeLessThan(4 * 2 * Math.sin((Math.PI * note.frequency) / RATE))
  })

  it('leaves a room with no filter exactly as it was', () => {
    const before = buffer(0.5)
    const after = buffer(0.5)
    renderNote(before, RATE, { ...note, wave: CALM_SOUND.wave, filter: undefined })
    renderNote(after, RATE, { ...note, wave: CALM_SOUND.wave, filter: CALM_SOUND.filter })
    expect(Array.from(after)).toEqual(Array.from(before))
  })

  it('stays inside the note it was asked for', () => {
    const data = buffer(0.6)
    renderNote(data, RATE, note)
    expect(energy(data, 0, 0.09)).toBe(0)
    expect(energy(data, 0.41, 0.6)).toBe(0)
  })
})

// Every wave a room can ask for, since one the renderer does not know
// comes out a sine and the room sounds like a different room.
describe('waveSample', () => {
  it('knows every wave the rooms play', () => {
    for (const wave of [CALM_SOUND.wave, CHIPTUNE_SOUND.wave, TECHNO_SOUND.wave]) {
      const period = Array.from({ length: 64 }, (_, i) => waveSample(wave, i / 64))
      const sine = Array.from({ length: 64 }, (_, i) => Math.sin((2 * Math.PI * i) / 64))
      const apart = period.reduce((sum, v, i) => sum + Math.abs(v - sine[i]), 0)
      if (wave !== 'sine') expect(apart, wave).toBeGreaterThan(1)
      for (const v of period) {
        expect(v).toBeGreaterThanOrEqual(-1)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('ramps a sawtooth and snaps back, rather than rounding like a sine', () => {
    expect(waveSample('sawtooth', 0)).toBeCloseTo(0, 9)
    expect(waveSample('sawtooth', 0.25)).toBeCloseTo(0.5, 9)
    expect(waveSample('sawtooth', 0.49)).toBeCloseTo(0.98, 9)
    expect(waveSample('sawtooth', 0.51)).toBeCloseTo(-0.98, 9)
  })
})

describe('renderBounce', () => {
  it('scales a landing by the profile gain and the bounce gain together', () => {
    const quiet = buffer(0.1)
    renderBounce(quiet, RATE, TECHNO_SOUND.bounce, TECHNO_SOUND.gain)
    const loud = buffer(0.1)
    renderBounce(loud, RATE, { ...TECHNO_SOUND.bounce, gain: undefined }, TECHNO_SOUND.gain)
    expect(energy(quiet, 0, 0.1)).toBeGreaterThan(0)
    expect(energy(quiet, 0, 0.1) / energy(loud, 0, 0.1)).toBeCloseTo(TECHNO_SOUND.bounce.gain!, 5)
  })

  it('falls in pitch across the techno landing, and stays low throughout', () => {
    const data = buffer(0.09)
    renderBounce(data, RATE, TECHNO_SOUND.bounce, TECHNO_SOUND.gain)
    // A swept tone crosses zero less often as it falls.
    expect(crossings(data, 0, 0.02)).toBeGreaterThan(crossings(data, 0.06, 0.08))
    // And never gets near where it used to sit. Two crossings a cycle,
    // so 400Hz over 20ms is 16; the old 1800Hz chirp was 72.
    expect(crossings(data, 0, 0.02)).toBeLessThan(20)
  })

  it('leaves a profile that names no bounce gain exactly as it was', () => {
    for (const profile of [CALM_SOUND, CHIPTUNE_SOUND]) {
      expect(profile.bounce.gain).toBeUndefined()
      const withDefault = buffer(0.1)
      renderBounce(withDefault, RATE, profile.bounce, profile.gain)
      const spelled = buffer(0.1)
      renderBounce(spelled, RATE, { ...profile.bounce, gain: 1 }, profile.gain)
      expect(Array.from(withDefault)).toEqual(Array.from(spelled))
    }
  })
})
