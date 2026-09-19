import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SoundProfile } from '../audioSystem'
import { AudioSystem, BOUNCE_DECAY, BREAK_SOUND, CALM_SOUND, CHIPTUNE_SOUND, CHORD_OCTAVE, TECHNO_SOUND, bounceRelease, chordAt, filterCeiling, mobileLoopSamples } from '../audioSystem'

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

interface FakeBufferSource {
  buffer: AudioBuffer | null
  loop: boolean
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

const fakeContext = ({ filters = true } = {}) => {
  const oscillators: FakeOscillator[] = []
  const bufferSources: FakeBufferSource[] = []
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
    createBufferSource: vi.fn(() => {
      const source: FakeBufferSource = {
        buffer: null,
        loop: false,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      bufferSources.push(source)
      return source
    }),
    decodeAudioData: vi.fn(() =>
      Promise.resolve({
        duration: 1,
        numberOfChannels: 2,
        length: 44100,
        sampleRate: 44100,
        getChannelData: () => new Float32Array(44100),
      } as unknown as AudioBuffer)
    ),
    createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => {
      const data = new Float32Array(length)
      return {
        length,
        sampleRate,
        numberOfChannels: 1,
        duration: length / sampleRate,
        getChannelData: () => data,
      }
    }),
    close: vi.fn(() => Promise.resolve()),
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
  return { context, oscillators, bufferSources, biquads, gains, advance }
}

// The glasshouse is drums and bass for now, but the riff, pad and lead
// machinery is still here waiting for its sounds. Exercised against a
// profile of its own so it cannot rot in the meantime — and so the
// tests say plainly which behaviour belongs to the room and which
// belongs to the engine.
const VOICED: SoundProfile = {
  ...TECHNO_SOUND,
  melody: [45, 0, 52, 0, 48, 0, 45, 0, 45, 0, 52, 0, 48, 0, 45, 0],
  chords: [[45, 60, 64], [43, 59, 62]],
  padGain: 1,
  filter: { from: 1600, to: 220, seconds: 0.11, q: 10, sweep: { depth: 0.65, cycleBeats: 32 } },
  pad: { from: 300, to: 1800, q: 4 },
  lead: { wave: 'sine', noteBeats: 1, sustainBeats: 1.5, gain: 0.55, melody: [69, 0, 72, 0] },
  samples: undefined,
}

describe('AudioSystem', () => {
  let oscillators: FakeOscillator[]
  let bufferSources: FakeBufferSource[]
  let biquads: FakeFilter[]
  let gains: FakeGain[]
  let advance: (ms: number) => void
  let system: AudioSystem

  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
    const fake = fakeContext()
    oscillators = fake.oscillators
    bufferSources = fake.bufferSources
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

  it('has an original chiptune: square, leisurely, in a major key, with rests', () => {
    expect(CHIPTUNE_SOUND.wave).toBe('square')
    expect(CHIPTUNE_SOUND.tempo).toBe(90)
    // Sixteen bars of eighths — long enough to wander the sphere in.
    expect(CHIPTUNE_SOUND.melody).toHaveLength(128)
    const loopSeconds =
      (CHIPTUNE_SOUND.melody.length * CHIPTUNE_SOUND.noteBeats * 60) / CHIPTUNE_SOUND.tempo
    expect(loopSeconds).toBeGreaterThanOrEqual(40)
    expect(CHIPTUNE_SOUND.melody).toContain(0)
    expect(CHIPTUNE_SOUND.melody.filter(n => n === 0).length).toBeGreaterThan(24)
    for (const midi of CHIPTUNE_SOUND.melody) if (midi > 0) expect([0, 2, 4, 5, 7, 9, 11]).toContain(midi % 12)
    expect(CHIPTUNE_SOUND.gain).toBeLessThan(1)
    expect(CHIPTUNE_SOUND.chords.length).toBe(32)
  })
  // A floor, not a tune: a kick under every beat (sample when the bank
  // is loaded, sine pulse as fallback), saw notes plucked through a
  // filter that shuts over each one, and chords that take their time.
  it('puts a kick under every beat of the techno, on its own sine when samples are not loaded', () => {
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

  it('fires the sample kick every beat once the bank is loaded', () => {
    const kickBuf = { duration: 0.2, numberOfChannels: 1, length: 8820, sampleRate: 44100, getChannelData: () => new Float32Array(8820) }
    system.setProfile(TECHNO_SOUND)
    system.injectSampleBuffers({ kick: kickBuf as unknown as AudioBuffer })
    system.startBackgroundMusic()
    const beat = 60 / TECHNO_SOUND.tempo
    for (let i = 0; i < 20; i++) advance(200)
    expect(bufferSources.length).toBeGreaterThan(3)
    const starts = bufferSources.map(s => s.start.mock.calls[0][0] as number).sort((a, b) => a - b)
    for (let i = 1; i < Math.min(starts.length, 5); i++) {
      expect(starts[i] - starts[i - 1]).toBeCloseTo(beat, 6)
    }
    // No synthetic sine kick while the sample is available.
    const sineKicks = oscillators.filter(
      osc =>
        osc.type === 'sine' &&
        osc.frequency.setValueAtTime.mock.calls.some(call => call[0] === TECHNO_SOUND.pulse!.from)
    )
    expect(sineKicks).toHaveLength(0)
  })

  it('plucks a riff note through a falling lowpass', () => {
    system.setProfile(VOICED)
    system.startBackgroundMusic()
    advance(200)
    const pluck = biquads.find(b => b.Q.setValueAtTime.mock.calls[0]?.[0] === VOICED.filter!.q)!
    expect(pluck).toBeTruthy()
    expect(pluck.type).toBe('lowpass')
    // Opened to wherever the sweep has the ceiling on the first beat,
    // which is not the profile's `from` — that is the top of the ride.
    expect(pluck.frequency.setValueAtTime).toHaveBeenCalledWith(
      filterCeiling(VOICED.filter!, 0),
      expect.any(Number)
    )
    expect(pluck.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      VOICED.filter!.to,
      expect.any(Number)
    )
    // And the note goes through it rather than past it.
    const saw = oscillators.find(osc => osc.type === 'sawtooth')!
    expect(saw.connect).toHaveBeenCalledWith(pluck)
  })

  it('still plays where a context cannot build a filter', () => {
    system.cleanup()
    const bare = fakeContext({ filters: false })
    vi.stubGlobal('AudioContext', function FakeAudioContext() { return bare.context })
    const plain = new AudioSystem(VOICED)
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

  it('keeps the techno minimal: a saw at 140, and a loop long enough to live in', () => {
    expect(TECHNO_SOUND.wave).toBe('sawtooth')
    expect(TECHNO_SOUND.tempo).toBe(140)
    // Sixteenths, and a pad that changes every bar.
    expect(TECHNO_SOUND.noteBeats).toBe(0.25)
    expect(TECHNO_SOUND.chordBeats).toBe(4)
    // Eight bars of sixteenths (≥8s at 140), alternating A minor / G.
    expect(TECHNO_SOUND.melody).toHaveLength(128)
    const loopSeconds =
      (TECHNO_SOUND.melody.length * TECHNO_SOUND.noteBeats * 60) / TECHNO_SOUND.tempo
    expect(loopSeconds).toBeGreaterThanOrEqual(8)
    expect(TECHNO_SOUND.chords.length).toBeGreaterThanOrEqual(2)
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
    expect(TECHNO_SOUND.melody.filter(note => note === 0).length).toBeGreaterThan(32)
  })

  // A ceiling that never moves is most of why a loop wears out: every
  // note is filtered exactly like the last however long you stand there.
  // A ceiling that never moves is most of why a loop wears out: every
  // note is filtered exactly like the last however long you stand there.
  it('rides the pluck ceiling up and down across the phrase', () => {
    const filter = VOICED.filter!
    const sweep = filter.sweep!
    const darkest = filterCeiling(filter, 0)
    const brightest = filterCeiling(filter, sweep.cycleBeats / 2)
    expect(darkest).toBeCloseTo(filter.from * (1 - sweep.depth), 6)
    expect(brightest).toBeCloseTo(filter.from, 6)
    // Worth having: the two ends are audibly different, and the ceiling
    // never drops under where the pluck is heading anyway.
    expect(brightest / darkest).toBeGreaterThan(2)
    expect(darkest).toBeGreaterThan(filter.to)
    // It comes back round, and it never leaves the band.
    expect(filterCeiling(filter, sweep.cycleBeats)).toBeCloseTo(darkest, 6)
    for (let beat = 0; beat < sweep.cycleBeats; beat += 0.25) {
      const at = filterCeiling(filter, beat)
      expect(at).toBeGreaterThanOrEqual(darkest - 1e-6)
      expect(at).toBeLessThanOrEqual(brightest + 1e-6)
    }
    // A profile that asks for no ride is left exactly where it was.
    expect(filterCeiling({ ...filter, sweep: undefined }, 13)).toBe(filter.from)
  })

  // The pad was a bare saw triad: same attack, same timbre, every bar.
  it('swells a voiced pad open rather than leaving it bare', () => {
    const pad = VOICED.pad!
    expect(pad.from).toBeLessThan(pad.to)
    system.setProfile(VOICED)
    system.startBackgroundMusic()
    advance(200)
    const swell = biquads.find(b => b.Q.setValueAtTime.mock.calls[0]?.[0] === pad.q)
    expect(swell, 'the pad went through no filter').toBeTruthy()
    expect(swell!.type).toBe('lowpass')
    expect(swell!.frequency.setValueAtTime).toHaveBeenCalledWith(pad.from, expect.any(Number))
    expect(swell!.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(pad.to, expect.any(Number))
  })

  // A progression nobody voices is still the harmony the bass reads, so
  // silencing the pad must not cost the room its key.
  it('voices no pad at all when the room asks for none', () => {
    expect(TECHNO_SOUND.padGain).toBe(0)
    system.setProfile(TECHNO_SOUND)
    system.startBackgroundMusic()
    advance(600)
    // Nothing is built for a chord that will not sound.
    expect(biquads).toHaveLength(0)
    expect(oscillators.every(o => o.type !== 'sawtooth')).toBe(true)
    // But the progression is still there for the bass to follow.
    expect(TECHNO_SOUND.chords.length).toBeGreaterThan(1)
  })

  // The offline track is what a phone hears, and it had drifted into
  // being a different room: it voiced the pad the live path silences,
  // and it played no bass at all. Rendered here rather than described,
  // because this path only ever goes wrong by being written twice.
  describe('the track a narrow window hears', () => {
    const RATE = 44100
    // A one-shot with something in it, so a hit shows up as energy.
    const oneShot = (seconds: number) => {
      const data = new Float32Array(Math.floor(RATE * seconds))
      for (let i = 0; i < data.length; i++) data[i] = Math.sin((i / RATE) * 2 * Math.PI * 200) * 0.8
      return { duration: seconds, numberOfChannels: 1, length: data.length, sampleRate: RATE, getChannelData: () => data } as unknown as AudioBuffer
    }
    const render = (profile: SoundProfile, buffers: Record<string, AudioBuffer> = {}) => {
      let rendered = new Float32Array(0)
      vi.stubGlobal('AudioContext', function FakeAudioContext() {
        return {
          createBuffer: (_channels: number, length: number, sampleRate: number) => {
            rendered = new Float32Array(length)
            return { getChannelData: () => rendered, length, sampleRate }
          },
        }
      })
      const phone = new AudioSystem(profile)
      phone.injectSampleBuffers(buffers)
      ;(phone as unknown as { createMobileBackgroundTrack: (c?: unknown) => void }).createMobileBackgroundTrack(null)
      phone.cleanup()
      if (rendered.length === 0) throw new Error('createMobileBackgroundTrack never allocated a buffer')
      return rendered
    }
    // Between one kick and the next. The synthetic kick is 0.19s and the
    // beat is 0.43s, so this window is silence unless something else is
    // playing — which makes it a sharper question than total loudness,
    // where a low saw can phase-cancel the kick and read as quieter.
    const betweenKicks = (data: Float32Array) => {
      let sum = 0
      for (let i = Math.floor(0.25 * RATE); i < Math.floor(0.4 * RATE); i++) sum += Math.abs(data[i])
      return sum
    }

    it('voices no pad offline when the room voices none live', () => {
      // Nothing but the kick, which is over before the window opens.
      expect(betweenKicks(render(TECHNO_SOUND))).toBeCloseTo(0, 6)
      // The same room with its pad turned up fills that window.
      expect(betweenKicks(render({ ...TECHNO_SOUND, padGain: 1 }))).toBeGreaterThan(1)
    })

    it('lays the bass down offline, like the scheduler does', () => {
      const withBass = render(TECHNO_SOUND, {
        bassE: oneShot(0.16),
        bassF: oneShot(0.16),
        bassBb: oneShot(0.16),
      })
      // The bass falls on the off-beat, halfway between kicks.
      expect(betweenKicks(withBass)).toBeGreaterThan(1)
    })

    it('plays the sampled kick offline rather than falling back to a sine', () => {
      // A long kick sample runs past where the synthetic one has ended.
      expect(betweenKicks(render(TECHNO_SOUND, { kick: oneShot(0.45) }))).toBeGreaterThan(1)
    })

    it('bakes a track that lands on a whole phrase, not a round number of seconds', () => {
      const phraseBeats = TECHNO_SOUND.melody.length * TECHNO_SOUND.noteBeats
      const samplesPerBeat = (RATE * 60) / TECHNO_SOUND.tempo
      const length = mobileLoopSamples(TECHNO_SOUND, RATE)
      expect(length % Math.round(phraseBeats * samplesPerBeat)).toBe(0)
      // Long enough to live in, short enough to keep the WAV modest.
      expect(length / RATE).toBeGreaterThanOrEqual(40)
      expect(length / RATE).toBeLessThanOrEqual(90)
      const baked = render(TECHNO_SOUND)
      expect(baked.length).toBe(length)
    })

    it('does not fade the first kick out of the loop', () => {
      const data = render(TECHNO_SOUND)
      const peak = (from: number, to: number) => {
        let max = 0
        for (let i = Math.floor(from * RATE); i < Math.floor(to * RATE); i++) {
          max = Math.max(max, Math.abs(data[i]))
        }
        return max
      }
      // First 20ms of the opening kick vs the same window on the next beat.
      const open = peak(0, 0.02)
      const next = peak(60 / TECHNO_SOUND.tempo, 60 / TECHNO_SOUND.tempo + 0.02)
      expect(open).toBeGreaterThan(0)
      expect(open / next).toBeGreaterThan(0.9)
    })
  })

  // A phone never builds a live context, so the bank was decoded against
  // nothing and never loaded: no kick sample, no hats, no bass, and a
  // synthetic room in their place.
  //
  // Narrow window + stubbed AudioContext so the phone path runs in jsdom.
  const withPhone = async (
    run: (phone: AudioSystem, made: ReturnType<typeof fakeContext>) => Promise<void>,
    opts: { suspended?: boolean } = {}
  ) => {
    const wide = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true })
    try {
      const made = fakeContext()
      if (opts.suspended) made.context.state = 'suspended'
      vi.stubGlobal('AudioContext', function FakeAudioContext() { return made.context })
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })))
      const phone = new AudioSystem(TECHNO_SOUND)
      phone.soundEnabled = true
      await run(phone, made)
      phone.cleanup()
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: wide, configurable: true })
    }
  }

  it('loads the sample bank on a narrow window, which has no live context', async () => {
    await withPhone(async (phone, made) => {
      phone.startBackgroundMusic()
      await vi.waitFor(() => expect(made.context.decodeAudioData).toHaveBeenCalled())
      // Every sample the room plays, not just the first.
      expect(made.context.decodeAudioData.mock.calls.length).toBeGreaterThanOrEqual(
        Object.keys(TECHNO_SOUND.samples!.bank).length
      )
    })
  })

  it('plays the baked techno through an HTML5 element, not a BufferSource', async () => {
    await withPhone(async (phone, made) => {
      const players: {
        play: ReturnType<typeof vi.fn>
        load: ReturnType<typeof vi.fn>
        pause: ReturnType<typeof vi.fn>
        addEventListener: ReturnType<typeof vi.fn>
        currentTime: number
        loop: boolean
        volume: number
      }[] = []
      vi.stubGlobal('Audio', vi.fn(function Audio(this: (typeof players)[number]) {
        this.play = vi.fn(() => Promise.resolve())
        this.load = vi.fn()
        this.pause = vi.fn()
        this.currentTime = 0
        this.loop = false
        this.volume = 0
        this.addEventListener = vi.fn((event: string, fn: () => void) => {
          if (event === 'canplaythrough') fn()
        })
        players.push(this)
      }))
      phone.initAudioContext()
      await vi.waitFor(() =>
        expect((phone as unknown as { bakedMobilePcm: unknown }).bakedMobilePcm).toBeTruthy()
      )
      phone.startBackgroundMusic()
      await vi.waitFor(() => expect(players.length).toBeGreaterThan(0))
      expect(players[0].loop).toBe(true)
      expect(made.bufferSources.some(s => s.loop)).toBe(false)
    })
  })

  it('ships a glasshouse bank of a kick, a hat and three bass notes', () => {
    const samples = TECHNO_SOUND.samples!
    expect(samples.kick?.id).toBe('kick')
    expect(samples.bank.kick).toMatch(/\/audio\/glasshouse\/kick\.wav$/)
    // Drums and bass only while the rest of the sounds are chosen: a
    // bank entry that nothing plays is a download for nothing.
    const played = new Set([
      samples.kick!.id,
      ...samples.hits.map(h => h.id),
      ...Object.values(samples.bass!.byRoot),
    ])
    expect(new Set(Object.keys(samples.bank))).toEqual(played)
    expect(samples.hits.map(h => h.id)).toEqual(['hat'])
    // The kick is turned well down. Comparing it to the bass gain says
    // nothing — the kick sample is half again as hot, so it was louder
    // than the bass at a lower number — and a test cannot hear the
    // files, so this pins the decision rather than deriving it.
    expect(samples.kick!.gain).toBeLessThanOrEqual(0.28)
    expect(samples.kick!.gain).toBeGreaterThan(0.1)
    // Quieter synthetic fallback so a missing bank does not swamp the room.
    expect(TECHNO_SOUND.pulse!.gain).toBeLessThanOrEqual(0.6)
    expect(TECHNO_SOUND.chords.every(c => c.length <= 3)).toBe(true)
  })

  // A second glasshouse tune: one looping bed instead of the drum/bass
  // bank. Bounce stays so landings still belong to the room.
  it('ships a looping break as the glasshouse\'s other music', () => {
    expect(BREAK_SOUND.loop?.url).toMatch(/\/audio\/glasshouse\/break10\.mp3$/)
    expect(BREAK_SOUND.loop!.gain).toBeGreaterThan(0)
    expect(BREAK_SOUND.loop!.gain).toBeLessThanOrEqual(1)
    expect(BREAK_SOUND.bounce).toEqual(TECHNO_SOUND.bounce)
    expect(BREAK_SOUND.samples).toBeUndefined()
  })

  it('plays a looping bed for a loop profile and schedules no notes', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })))
    system.setProfile(BREAK_SOUND)
    system.startBackgroundMusic()
    await vi.waitFor(() => expect(bufferSources.length).toBeGreaterThan(0))
    const bed = bufferSources[0]
    expect(bed.loop).toBe(true)
    expect(bed.start).toHaveBeenCalled()
    expect(oscillators).toHaveLength(0)
  })

  // y switches tunes in-place: stop the old one immediately and start
  // the new, no fade. Room changes still use setProfile's soft handoff.
  it('cuts hard to another profile when asked', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })))
    system.setProfile(TECHNO_SOUND)
    system.startBackgroundMusic()
    const master = system.backgroundMusic.gainNode
    expect(system.backgroundMusic.isPlaying).toBe(true)
    system.cutToProfile(BREAK_SOUND)
    expect(system.profile).toBe(BREAK_SOUND)
    expect(system.backgroundMusic.isPlaying).toBe(true)
    // Hard cut: the old master is gone, not faded out.
    expect(master?.disconnect).toHaveBeenCalled()
    expect(master?.gain.linearRampToValueAtTime).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(bufferSources.some(s => s.loop)).toBe(true))
  })

  // The roll that makes it trance rather than a loop with a bass note
  // on it: eighths on the off-beat, under a kick on the beat. The note
  // follows the harmony, so the line and the pad cannot disagree about
  // what bar it is.
  it('rolls a sampled bass off the beat, on the chord of the bar', () => {
    const bass = TECHNO_SOUND.samples!.bass!
    // Off-beat eighths: the second half of each beat, never the first.
    expect(bass.noteBeats).toBe(0.5)
    expect(bass.steps).toEqual([0, 1])
    // Every chord the progression uses has a sample to play it with,
    // and every sample named is in the bank.
    for (const chord of TECHNO_SOUND.chords) {
      const id = bass.byRoot[chord[0]]
      expect(id, `root ${chord[0]}`).toBeTruthy()
      expect(TECHNO_SOUND.samples!.bank[id], id).toBeTruthy()
    }
    // Three notes, one per chord of the progression.
    expect(new Set(TECHNO_SOUND.chords.map(c => bass.byRoot[c[0]])).size).toBe(3)
  })

  // The bar the bass thinks it is has to be the bar the pad is playing.
  it('reads the same bar as the pad, however far into the tune', () => {
    const stepsPerBar = TECHNO_SOUND.chordBeats / TECHNO_SOUND.noteBeats
    expect(chordAt(TECHNO_SOUND, 0)).toBe(TECHNO_SOUND.chords[0])
    expect(chordAt(TECHNO_SOUND, stepsPerBar)).toBe(TECHNO_SOUND.chords[1])
    expect(chordAt(TECHNO_SOUND, stepsPerBar * 6)).toBe(TECHNO_SOUND.chords[6])
    // And it comes round rather than running off the end.
    expect(chordAt(TECHNO_SOUND, stepsPerBar * 8)).toBe(TECHNO_SOUND.chords[0])
    expect(chordAt(TECHNO_SOUND, stepsPerBar * 8 + stepsPerBar - 1)).toBe(TECHNO_SOUND.chords[0])
    expect(chordAt(TECHNO_SOUND, stepsPerBar * 101)).toBe(TECHNO_SOUND.chords[101 % 8])
  })

  // A second voice over the looping riff: a beat a slot for 32 bars, so
  // it can phrase rather than hang one note a bar.

  // The lead hangs for six beats over whatever the pad is doing, so a
  // note landing off the chord sits there souring the bar. Its slots
  // are one to a bar, and the progression is eight bars, so which chord
  // a lead note meets is pure arithmetic — and easy to get wrong by
  // moving either one.

  // The complaint this answers: two chords a bar apart came round every
  // 3.4 seconds, so the room seesawed A, G, A, G for as long as you
  // stood in it. A phrase needs somewhere to go and somewhere to rest.
  it('gives the techno a progression rather than a seesaw', () => {
    const cycleSeconds =
      (TECHNO_SOUND.chords.length * TECHNO_SOUND.chordBeats * 60) / TECHNO_SOUND.tempo
    expect(cycleSeconds).toBeGreaterThanOrEqual(10)
    // And it holds still somewhere, rather than changing every bar.
    const runs = TECHNO_SOUND.chords.reduce<number[]>((acc, chord, i) => {
      const previous = TECHNO_SOUND.chords[i - 1]
      if (previous && chord.every((n, j) => n === previous[j])) acc[acc.length - 1] += 1
      else acc.push(1)
      return acc
    }, [])
    expect(Math.max(...runs)).toBeGreaterThanOrEqual(3)
    // The riff comes round with the harmony, not four times inside it.
    const melodyBars = (TECHNO_SOUND.melody.length * TECHNO_SOUND.noteBeats) / TECHNO_SOUND.chordBeats
    expect(melodyBars).toBe(TECHNO_SOUND.chords.length)
  })

  it('sounds a lead on its own wave, not the saw riff', () => {
    system.setProfile(VOICED)
    system.startBackgroundMusic()
    advance(200)
    expect(oscillators.some(o => o.type === VOICED.lead!.wave)).toBe(true)
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
