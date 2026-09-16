import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioSystem, BOUNCE_DECAY, CALM_SOUND, CHIPTUNE_SOUND, CHORD_OCTAVE, TECHNO_SOUND, bounceRelease } from '../audioSystem'

// The world's sound is a profile the room supplies: what wave the notes
// are, how fast, which tune, and what a bounce sounds like. The grid
// keeps the sound it always had; the sphere room is a cartridge.

interface FakeGain {
  gain: {
    value: number
    setValueAtTime: ReturnType<typeof vi.fn>
    linearRampToValueAtTime: ReturnType<typeof vi.fn>
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>
    cancelScheduledValues: ReturnType<typeof vi.fn>
  }
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

interface FakeFilter {
  type: string
  Q: { setValueAtTime: ReturnType<typeof vi.fn> }
  frequency: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> }
  connect: ReturnType<typeof vi.fn>
}

interface FakeOscillator {
  type: string
  frequency: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> }
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

const fakeContext = ({ filters = true } = {}) => {
  const oscillators: FakeOscillator[] = []
  const biquads: FakeFilter[] = []
  const gains: FakeGain[] = []
  const gain = (): FakeGain => {
    const node: FakeGain = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    gains.push(node)
    return node
  }
  // The scheduler only queues 200ms ahead of the context's own clock, so
  // a clock that never moves hears one batch and no more.
  let now = 0
  const context = {
    get currentTime() {
      return now
    },
    state: 'running',
    destination: {},
    createGain: vi.fn(gain),
    createOscillator: vi.fn(() => {
      const osc: FakeOscillator = {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscillators.push(osc)
      return osc
    }),
    resume: vi.fn(() => Promise.resolve()),
    ...(filters
      ? {
          createBiquadFilter: vi.fn(() => {
            const filter: FakeFilter = {
              type: 'peaking',
              Q: { setValueAtTime: vi.fn() },
              frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
              connect: vi.fn(),
            }
            biquads.push(filter)
            return filter
          }),
        }
      : {}),
  }
  const advance = (ms: number) => {
    now += ms / 1000
    vi.advanceTimersByTime(ms)
  }
  return { context, oscillators, biquads, gains, advance }
}

describe('AudioSystem', () => {
  let oscillators: FakeOscillator[]
  let biquads: FakeFilter[]
  let gains: FakeGain[]
  let advance: (ms: number) => void
  let system: AudioSystem

  beforeEach(() => {
    vi.useFakeTimers()
    const fake = fakeContext()
    oscillators = fake.oscillators
    biquads = fake.biquads
    gains = fake.gains
    advance = fake.advance
    vi.stubGlobal('AudioContext', function FakeAudioContext() { return fake.context })
    system = new AudioSystem()
    system.soundEnabled = true
    system.initAudioContext()
    // Fake timers hold performance.now() at 0, which reads as a bounce
    // within the throttle window.
    system.lastBounceTime = -1000
  })
  afterEach(() => {
    system.cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('keeps the sound the world always had as its default', () => {
    expect(CALM_SOUND).toEqual({
      wave: 'sine',
      tempo: 60,
      noteBeats: 2,
      chordBeats: 8,
      melodyChance: 0.3,
      melody: [60, 64, 67, 72, 67, 71, 74, 79, 57, 60, 64, 69, 65, 69, 72, 77],
      chords: [[60, 64, 67], [67, 71, 74], [57, 60, 64], [65, 69, 72]],
      bounce: { wave: 'sine', from: 200, spread: 100, to: null, duration: 0.1 },
      gain: 1,
    })
    expect(system.profile).toBe(CALM_SOUND)
  })

  it('bounces on a sine blip between 200 and 300 Hz by default', () => {
    system.playBoingSound()
    expect(oscillators).toHaveLength(1)
    expect(oscillators[0].type).toBe('sine')
    const [freq] = oscillators[0].frequency.setValueAtTime.mock.calls[0]
    expect(freq).toBeGreaterThanOrEqual(200)
    expect(freq).toBeLessThan(300)
    expect(oscillators[0].frequency.exponentialRampToValueAtTime).not.toHaveBeenCalled()
  })

  it('bounces on a rising square-wave jump in the chiptune', () => {
    system.setProfile(CHIPTUNE_SOUND)
    system.playBoingSound()
    expect(oscillators).toHaveLength(1)
    expect(oscillators[0].type).toBe('square')
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(CHIPTUNE_SOUND.bounce.from, 0)
    expect(oscillators[0].frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      CHIPTUNE_SOUND.bounce.to,
      CHIPTUNE_SOUND.bounce.duration
    )
  })

  // Two clients hear a landing two different ways, and the bounce gain
  // has to reach both. It reached neither before it existed, and the
  // pre-rendered path has drifted from the live one before.
  it('scales the live landing by the room\'s bounce gain', () => {
    const before = gains.length
    system.setProfile(CHIPTUNE_SOUND)
    system.playBoingSound()
    const plain = gains[before].gain.linearRampToValueAtTime.mock.calls[0][0]
    expect(plain).toBeCloseTo(0.015 * CHIPTUNE_SOUND.gain, 6)

    const between = gains.length
    system.setProfile(TECHNO_SOUND)
    system.lastBounceTime = -Infinity
    system.playBoingSound()
    const scaled = gains[between].gain.linearRampToValueAtTime.mock.calls[0][0]
    expect(scaled).toBeCloseTo(0.015 * TECHNO_SOUND.gain * TECHNO_SOUND.bounce.gain!, 6)
    expect(scaled).toBeLessThan(plain)
  })

  // The release used to ramp to a fixed 0.001 whatever the peak was, so
  // a quiet landing stopped at nearly half its own height and got cut
  // off there. The floor follows the peak, and follows the decay the
  // pre-rendered landing already had, so the two end in the same place.
  it('fades a landing to the same share of its peak however quiet it is', () => {
    const shares: number[] = []
    for (const profile of [CHIPTUNE_SOUND, TECHNO_SOUND]) {
      const before = gains.length
      system.setProfile(profile)
      system.lastBounceTime = -Infinity
      system.playBoingSound()
      const node = gains[before].gain
      const [peak] = node.linearRampToValueAtTime.mock.calls[0]
      const [floor] = node.exponentialRampToValueAtTime.mock.calls[0]
      expect(floor).toBeGreaterThan(0) // an exponential ramp cannot reach zero
      expect(floor).toBeLessThan(peak)
      expect(floor).toBeCloseTo(bounceRelease(peak, profile.bounce.duration), 9)
      shares.push(floor / peak)
    }
    // Both land at exp(-decay * duration) of their own peak, which is
    // what the offline renderer's envelope reaches at the same moment.
    shares.forEach((share, i) => {
      const duration = [CHIPTUNE_SOUND, TECHNO_SOUND][i].bounce.duration
      expect(share).toBeCloseTo(Math.exp(-BOUNCE_DECAY * duration), 9)
    })
  })

  it('plays the chiptune on square waves, every step, at its own tempo', () => {
    system.setProfile(CHIPTUNE_SOUND)
    system.startBackgroundMusic()
    // Scheduled 200 ms ahead: at 150 bpm an eighth is 0.2 s, so the first
    // step and its chord are queued now, and the second on the next tick.
    const notes = () => oscillators.filter(o => o.start.mock.calls.length > 0)
    expect(notes().length).toBeGreaterThan(0)
    expect(notes().every(o => o.type === 'square')).toBe(true)
    const stepSeconds = (60 / CHIPTUNE_SOUND.tempo) * CHIPTUNE_SOUND.noteBeats
    expect(system.backgroundMusic.nextNoteTime).toBeCloseTo(stepSeconds)
    expect(CHIPTUNE_SOUND.melodyChance).toBe(1)
  })

  it('does not gamble on the chiptune melody: a rest is a rest and a note is a note', () => {
    system.setProfile(CHIPTUNE_SOUND)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    system.startBackgroundMusic()
    // The first step of the tune is a note, so it plays regardless of the roll.
    expect(CHIPTUNE_SOUND.melody[0]).toBeGreaterThan(0)
    expect(oscillators.some(o => o.start.mock.calls.length > 0)).toBe(true)
  })

  it('switching profiles mid-tune starts the new tune from the top', () => {
    system.startBackgroundMusic()
    system.backgroundMusic.noteIndex = 5
    system.backgroundMusic.chordIndex = 2
    system.setProfile(CHIPTUNE_SOUND)
    expect(system.profile).toBe(CHIPTUNE_SOUND)
    expect(system.backgroundMusic.noteIndex).toBe(0)
    expect(system.backgroundMusic.chordIndex).toBe(0)
    expect(system.backgroundMusic.tempo).toBe(CHIPTUNE_SOUND.tempo)
  })

  it('has an original chiptune: square, brisk, in a major key, with rests', () => {
    expect(CHIPTUNE_SOUND.wave).toBe('square')
    expect(CHIPTUNE_SOUND.tempo).toBeGreaterThanOrEqual(120)
    expect(CHIPTUNE_SOUND.melody.length).toBeGreaterThanOrEqual(16)
    expect(CHIPTUNE_SOUND.melody).toContain(0)
    for (const midi of CHIPTUNE_SOUND.melody) if (midi > 0) expect([0, 2, 4, 5, 7, 9, 11]).toContain(midi % 12)
    expect(CHIPTUNE_SOUND.gain).toBeLessThan(1)
  })
  // A floor, not a tune: a kick under every beat on its own sine, saw
  // notes plucked through a filter that shuts over each one, and two
  // chords that take their time. The rooms that had no drum keep none.
  it('puts a kick under every beat of the techno, on its own sine', () => {
    system.setProfile(TECHNO_SOUND)
    system.startBackgroundMusic()
    const beat = 60 / TECHNO_SOUND.tempo
    const kicks = () =>
      oscillators.filter(
        osc =>
          osc.type === 'sine' &&
          osc.frequency.setValueAtTime.mock.calls.some(call => call[0] === TECHNO_SOUND.pulse!.from)
      )
    // The scheduler runs 200ms ahead, so a bar takes a few ticks.
    for (let i = 0; i < 20; i++) advance(200)
    const struck = kicks()
    expect(struck.length).toBeGreaterThan(3)
    for (const kick of struck) {
      expect(kick.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        TECHNO_SOUND.pulse!.to,
        expect.any(Number)
      )
    }
    // Every kick lands ON a beat, not a sixteenth behind one: the first
    // is the tune's first step, and the rest follow a beat apart.
    const starts = struck.map(kick => kick.start.mock.calls[0][0] as number).sort((a, b) => a - b)
    const firstNote = Math.min(...oscillators.map(osc => (osc.start.mock.calls[0]?.[0] as number) ?? Infinity))
    expect(starts[0]).toBeCloseTo(firstNote, 6)
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i] - starts[i - 1]).toBeCloseTo(beat, 6)
    }
  })

  it('plucks every techno note through a falling lowpass', () => {
    system.setProfile(TECHNO_SOUND)
    system.startBackgroundMusic()
    vi.advanceTimersByTime(200)
    expect(biquads.length).toBeGreaterThan(0)
    const [pluck] = biquads
    expect(pluck.type).toBe('lowpass')
    expect(pluck.Q.setValueAtTime).toHaveBeenCalledWith(TECHNO_SOUND.filter!.q, expect.any(Number))
    expect(pluck.frequency.setValueAtTime).toHaveBeenCalledWith(TECHNO_SOUND.filter!.from, expect.any(Number))
    expect(pluck.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      TECHNO_SOUND.filter!.to,
      expect.any(Number)
    )
    // Saw notes, and never through the kick: that stays a bare sine.
    expect(oscillators.some(osc => osc.type === 'sawtooth')).toBe(true)
    // And the note actually goes through it, rather than past it.
    const saw = oscillators.find(osc => osc.type === 'sawtooth')!
    expect(saw.connect).toHaveBeenCalledWith(pluck)
    expect(pluck.connect).toHaveBeenCalled()
  })

  it('still plays where a context cannot build a filter', () => {
    system.cleanup()
    const bare = fakeContext({ filters: false })
    vi.stubGlobal('AudioContext', function FakeAudioContext() { return bare.context })
    const plain = new AudioSystem(TECHNO_SOUND)
    plain.soundEnabled = true
    plain.initAudioContext()
    plain.startBackgroundMusic()
    vi.advanceTimersByTime(200)
    expect(bare.oscillators.some(osc => osc.type === 'sawtooth')).toBe(true)
    plain.cleanup()
  })

  it('leaves the quiet rooms without a drum or a filter', () => {
    for (const quiet of [CALM_SOUND, CHIPTUNE_SOUND]) {
      expect(quiet.pulse).toBeUndefined()
      expect(quiet.filter).toBeUndefined()
    }
    // Every roll lands, so the tune is certainly playing: without the
    // control this passes on a profile that simply made no sound.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    system.setProfile(CHIPTUNE_SOUND)
    system.startBackgroundMusic()
    for (let i = 0; i < 12; i++) advance(200)
    expect(oscillators.length).toBeGreaterThan(4)
    expect(biquads).toHaveLength(0)
    expect(oscillators.every(osc => osc.type === 'square')).toBe(true)
  })

  // A room is switched into mid-tune, and the step already queued
  // belongs to the tune being left: a calm step is two seconds long, so
  // without moving the clock on you walk into the club and hear nothing.
  it('starts the new room sounding now, not when the old step was due', () => {
    system.startBackgroundMusic()
    advance(200)
    const before = oscillators.length
    system.setProfile(TECHNO_SOUND)
    advance(200)
    expect(oscillators.length).toBeGreaterThan(before)
  })

  // A kick every beat only stays on the beat if the tune's loop is a
  // whole number of beats long.
  it('loops every drummed tune in whole beats', () => {
    for (const profile of [CALM_SOUND, CHIPTUNE_SOUND, TECHNO_SOUND]) {
      if (!profile.pulse) continue
      const stepsPerPulse = Math.round(profile.pulse.beats / profile.noteBeats)
      expect(profile.melody.length % stepsPerPulse, `${profile.tempo}bpm`).toBe(0)
    }
  })

  it('keeps the techno minimal: two chords, a saw, and a hard-techno tempo', () => {
    expect(TECHNO_SOUND.wave).toBe('sawtooth')
    // Hard techno runs faster than the four-to-the-floor house band.
    expect(TECHNO_SOUND.tempo).toBeGreaterThanOrEqual(140)
    expect(TECHNO_SOUND.tempo).toBeLessThanOrEqual(155)
    // Sixteenths, and a pad that changes every other bar.
    expect(TECHNO_SOUND.noteBeats).toBe(0.25)
    expect(TECHNO_SOUND.chordBeats).toBe(4)
    expect(TECHNO_SOUND.chords).toHaveLength(2)
    // Two bars of sixteenths, a chord to a bar.
    expect(TECHNO_SOUND.melody).toHaveLength(32)
    // And every note belongs to the chord playing under it: the pad
    // changes where the melody does, which is what chordBeats decides.
    const stepsPerChord = Math.round(TECHNO_SOUND.chordBeats / TECHNO_SOUND.noteBeats)
    TECHNO_SOUND.melody.forEach((note, step) => {
      if (note === 0) return
      const under = TECHNO_SOUND.chords[Math.floor(step / stepsPerChord) % TECHNO_SOUND.chords.length]
      expect(under.map(midi => midi % 12), `step ${step}`).toContain(note % 12)
    })
    // Written rests, not rolled ones.
    expect(TECHNO_SOUND.melodyChance).toBe(1)
    expect(TECHNO_SOUND.melody.filter(note => note === 0).length).toBeGreaterThan(8)
  })

  // The riff is the room, so where it sits matters: a bright lead over
  // the top is a different genre. Everything sounding is below middle C.
  it('keeps the techno riff and its drone down low', () => {
    for (const note of TECHNO_SOUND.melody) {
      if (note === 0) continue
      expect(note, `${note}`).toBeLessThan(60)
      expect(note, `${note}`).toBeGreaterThanOrEqual(36)
    }
    // And each chord sounds a further octave under that, which is the
    // sub the kick sits on.
    for (const chord of TECHNO_SOUND.chords) {
      expect(Math.min(...chord) + CHORD_OCTAVE).toBeLessThan(36)
    }
  })

  // Chords are written an octave above what they sound. Forget that
  // while writing a low drone and the root lands under 30Hz, which most
  // speakers do not reproduce at all: the pad goes missing rather than
  // going deep. Held for every profile, since the trap is the offset.
  it('keeps every chord audible once the octave is taken off', () => {
    const hertz = (midi: number) => 440 * Math.pow(2, (midi + CHORD_OCTAVE - 69) / 12)
    for (const profile of [CALM_SOUND, CHIPTUNE_SOUND, TECHNO_SOUND]) {
      for (const chord of profile.chords) {
        expect(hertz(Math.min(...chord)), `${profile.tempo}bpm ${chord}`).toBeGreaterThan(40)
      }
    }
  })

  // A landing was a 1800Hz triangle: high enough that it cut through
  // the whole room however quiet the number said it was. Loudness is
  // not amplitude, so the fix is both — down in pitch and down in gain.
  it('lands with a thud in the techno room, not a squeak', () => {
    expect(TECHNO_SOUND.bounce.from + TECHNO_SOUND.bounce.spread).toBeLessThan(400)
    expect(TECHNO_SOUND.bounce.to!).toBeLessThan(TECHNO_SOUND.bounce.from)
    expect(TECHNO_SOUND.bounce.gain!).toBeLessThan(0.5)
  })
  // Notes already scheduled keep sounding: a calm chord runs eight
  // seconds, long enough to hang over the techno that replaced it. They
  // all hang off one gain, so the room being left fades out on its own.
  it('takes the last room with it rather than letting it ring on', () => {
    system.startBackgroundMusic()
    advance(200)
    const leaving = system.backgroundMusic.gainNode as unknown as FakeGain
    system.setProfile(TECHNO_SOUND)
    expect(leaving.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number))
    // And the new room plays through a node of its own.
    expect(system.backgroundMusic.gainNode).not.toBe(leaving)
    expect(gains.at(-1)!.connect).toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(leaving.disconnect).toHaveBeenCalled()
  })
})
