import type { AudioSystem as IAudioSystem } from '@/types/game'

// A one-shot from the room's sample bank: fire every N beats (with an
// optional offbeat offset), sometimes skip, and optionally start early
// so a reverse swell peaks on the downbeat.
export interface SampleHit {
  id: string
  everyBeats: number
  offsetBeats?: number
  chance: number
  gain: number
  // Seconds before the hit time to start the buffer (risers).
  leadIn?: number
}

export interface SoundSamples {
  bank: Record<string, string>
  kick?: { id: string; gain: number }
  hits: SampleHit[]
}

// What a room sounds like: the wave its notes are, how fast, which
// tune, and what a bounce is. A melody entry of 0 is a rest.
export interface SoundProfile {
  wave: OscillatorType
  tempo: number
  // Beats per melody step and per chord.
  noteBeats: number
  chordBeats: number
  // Odds a melody step sounds; 1 plays the tune as written, since a roll
  // is always below it.
  melodyChance: number
  melody: number[]
  chords: number[][]
  // A bounce: a note at `from` (plus up to `spread` at random), swept to
  // `to` over `duration` seconds when `to` is set. `gain` scales it
  // against the room's music; a high, bright tick carries much further
  // than a low one at the same amplitude, so a loud room does not
  // automatically want a loud landing. Absent is 1.
  bounce: { wave: OscillatorType; from: number; spread: number; to: number | null; duration: number; gain?: number }
  // Master multiplier; square waves carry more energy than sines.
  gain: number
  // A kick every `beats`, swept from `from` to `to` hertz as it decays:
  // what makes a floor four-on-the-floor. Absent is no drum at all.
  // Used when the sample bank has no kick loaded yet.
  pulse?: { from: number; to: number; duration: number; beats: number; gain: number }
  // A lowpass each melody note is plucked through, falling from `from`
  // to `to` hertz over `seconds`. The sweep is the sound, not the note.
  filter?: { from: number; to: number; seconds: number; q: number }
  // Optional one-shots and a sample kick layered on the procedural tune.
  samples?: SoundSamples
  // A second voice on a longer grid than the riff. One entry per
  // `noteBeats`; 0 is a rest. Absent is no lead.
  lead?: {
    wave: OscillatorType
    noteBeats: number
    melody: number[]
    // How long a sounding note hangs, in beats. Absent is noteBeats.
    sustainBeats?: number
    // Multiplier on top of the room gain. Absent is 1.
    gain?: number
  }
}

// Peaceful sine arpeggios, the sound the world always had.
export const CALM_SOUND: SoundProfile = {
  wave: 'sine',
  tempo: 60,
  noteBeats: 2,
  chordBeats: 8,
  melodyChance: 0.3,
  melody: [
    60, 64, 67, 72, // C E G C'
    67, 71, 74, 79, // G B D G'
    57, 60, 64, 69, // A C E A'
    65, 69, 72, 77, // F A C F'
  ],
  chords: [
    [60, 64, 67], // C major
    [67, 71, 74], // G major
    [57, 60, 64], // A minor
    [65, 69, 72], // F major
  ],
  bounce: { wave: 'sine', from: 200, spread: 100, to: null, duration: 0.1 },
  gain: 1,
}

// A cartridge: square waves, a leisurely hop in C major with rests on
// the off-beats, power chords under it, and a rising jump blip. Sixteen
// bars at 90 so walking the sphere does not hear the same four bars
// forever.
export const CHIPTUNE_SOUND: SoundProfile = {
  wave: 'square',
  tempo: 90,
  noteBeats: 0.5,
  chordBeats: 2,
  melodyChance: 1,
  melody: [
    // Bars 1–4: the original hop
    67, 72, 0, 74, 76, 0, 74, 72, // G C  . D E . D C
    69, 0, 72, 69, 67, 0, 64, 0, // A . C A G . E .
    65, 69, 0, 72, 74, 0, 72, 69, // F A . C D . C A
    67, 0, 71, 74, 79, 0, 76, 0, // G . B D G' . E .
    // Bars 5–8: answer — higher, more air
    76, 0, 0, 74, 72, 0, 0, 0, // E . . D C . . .
    74, 0, 76, 0, 79, 0, 76, 74, // D . E . G' . E D
    72, 0, 0, 69, 67, 0, 64, 0, // C . . A G . E .
    65, 0, 0, 67, 69, 0, 72, 0, // F . . G A . C .
    // Bars 9–12: denser return of the hop
    67, 72, 74, 76, 0, 74, 72, 0, // G C D E . D C .
    69, 72, 0, 69, 67, 64, 0, 0, // A C . A G E . .
    65, 0, 69, 72, 74, 72, 69, 0, // F . A C D C A .
    67, 71, 74, 0, 79, 76, 0, 72, // G B D . G' E . C
    // Bars 13–16: sparse wind-down
    76, 0, 0, 0, 74, 0, 0, 0, // E . . . D . . .
    72, 0, 0, 69, 0, 0, 0, 0, // C . . A . . . .
    67, 0, 0, 0, 64, 0, 0, 0, // G . . . E . . .
    65, 0, 67, 0, 72, 0, 0, 0, // F . G . C . . .
  ],
  chords: [
    // Bars 1–4 (original hop): C F G C, twice
    [48, 55], [53, 60], [55, 62], [48, 55],
    [48, 55], [53, 60], [55, 62], [48, 55],
    // Bars 5–8 (answer): C Am F G
    [48, 55], [48, 55], [45, 52], [45, 52],
    [53, 60], [53, 60], [55, 62], [55, 62],
    // Bars 9–12 (dense return): C F G Em
    [48, 55], [53, 60], [55, 62], [52, 59],
    [48, 55], [53, 60], [55, 62], [48, 55],
    // Bars 13–16 (wind-down): F G C hold
    [53, 60], [53, 60], [55, 62], [55, 62],
    [48, 55], [48, 55], [48, 55], [48, 55],
  ],
  bounce: { wave: 'square', from: 330, spread: 0, to: 990, duration: 0.12 },
  gain: 0.45,
}

const GH = '/audio/glasshouse'

// Industrial techno at 140: eight bars of sixteenths (~13.7s), a thinner
// pad, a quieter kick, and a bank of one-shots (hats, chops, riser).
export const TECHNO_SOUND: SoundProfile = {
  wave: 'sawtooth',
  tempo: 140,
  noteBeats: 0.25,
  chordBeats: 4,
  melodyChance: 1,
  // Four rhythmic figures, one to a bar, laid over a progression that
  // holds rather than seesaws: the riff moves where the harmony does,
  // and the harmony sits on A for half the phrase.
  melody: [
    // Bars 1-4, all on A: the figures are what changes, not the root.
    45, 0, 45, 0, 52, 0, 45, 48, 0, 45, 0, 52, 45, 0, 48, 0,
    45, 0, 0, 45, 52, 0, 48, 0, 45, 0, 52, 0, 45, 48, 0, 0,
    45, 45, 0, 52, 45, 0, 48, 45, 0, 52, 45, 0, 48, 0, 45, 0,
    45, 0, 0, 0, 52, 0, 0, 48, 0, 0, 45, 0, 0, 0, 48, 0,
    // Bars 5-6 lift to F, on the first two figures.
    41, 0, 41, 0, 48, 0, 41, 45, 0, 41, 0, 48, 41, 0, 45, 0,
    41, 0, 0, 41, 48, 0, 45, 0, 41, 0, 48, 0, 41, 45, 0, 0,
    // Bars 7-8 fall to G and pull back to A.
    43, 43, 0, 50, 43, 0, 47, 43, 0, 50, 43, 0, 47, 0, 43, 0,
    43, 0, 0, 0, 50, 0, 0, 47, 0, 0, 43, 0, 0, 0, 47, 0,
  ],
  // Thinner than four voices: drop the doubled root so the sub has room.
  // Eight bars, not two: A minor for four of them, which is the half of
  // the phrase that does nothing, then F and G. Two chords a bar apart
  // came round every 3.4 seconds and the ear had nowhere to go.
  chords: [
    [45, 60, 64], // A minor triad
    [45, 60, 64],
    [45, 60, 64],
    [45, 60, 64],
    [41, 57, 60], // F major triad
    [41, 57, 60],
    [43, 59, 62], // G major triad
    [43, 59, 62],
  ],
  bounce: { wave: 'triangle', from: 240, spread: 40, to: 90, duration: 0.09, gain: 0.3 },
  // Fallback only — the Joker sample takes over once the bank loads.
  pulse: { from: 190, to: 38, duration: 0.19, beats: 1, gain: 0.55 },
  filter: { from: 1600, to: 220, seconds: 0.11, q: 10 },
  gain: 0.5,
  // One slot a bar for 32 bars (~55s). A handful of notes, long sustain.
  lead: {
    wave: 'sine',
    noteBeats: 4,
    sustainBeats: 6,
    gain: 0.55,
    // Placed where the progression can carry them: the E waits for an A
    // bar and the B for a G bar, four bars later than either used to be.
    melody: [
      69, 0, 0, 0, // A, over A minor
      0, 0, 0, 0,
      0, 0, 72, 0, // C, over A minor
      0, 0, 0, 0,
      0, 0, 0, 76, // E, over A minor
      0, 0, 0, 71, // B, over G
      0, 0, 0, 0,
      69, 0, 0, 0, // A, over F
    ],
  },
  samples: {
    bank: {
      kick: `${GH}/kick.wav`,
      hat: `${GH}/hat.wav`,
      perc: `${GH}/perc.wav`,
      huh: `${GH}/huh.wav`,
      woosh: `${GH}/woosh.wav`,
      korg0: `${GH}/korg0.wav`,
      korg1: `${GH}/korg1.wav`,
      korg2: `${GH}/korg2.wav`,
      korg3: `${GH}/korg3.wav`,
      korg4: `${GH}/korg4.wav`,
      bass0: `${GH}/bass0.wav`,
      bass1: `${GH}/bass1.wav`,
      bass2: `${GH}/bass2.wav`,
      bass3: `${GH}/bass3.wav`,
      bass4: `${GH}/bass4.wav`,
    },
    kick: { id: 'kick', gain: 0.55 },
    hits: [
      { id: 'hat', everyBeats: 1, offsetBeats: 0.5, chance: 1, gain: 0.12 },
      { id: 'perc', everyBeats: 2, offsetBeats: 0.75, chance: 0.45, gain: 0.28 },
      { id: 'huh', everyBeats: 16, offsetBeats: 0, chance: 0.4, gain: 0.35 },
      { id: 'korg0', everyBeats: 8, offsetBeats: 1.5, chance: 0.5, gain: 0.2 },
      { id: 'korg2', everyBeats: 8, offsetBeats: 5.25, chance: 0.4, gain: 0.18 },
      { id: 'bass1', everyBeats: 8, offsetBeats: 3, chance: 0.35, gain: 0.22 },
      { id: 'bass3', everyBeats: 16, offsetBeats: 7.5, chance: 0.4, gain: 0.2 },
      // 3s reverse cymbal: start ~2.9s early so the peak hits the bar.
      { id: 'woosh', everyBeats: 32, offsetBeats: 0, chance: 1, gain: 0.18, leadIn: 2.9 },
    ],
  },
}

// Chords sound an octave below where a profile writes them, so a pad
// sits under its own melody without every profile spelling it. Both
// renderers owe the same offset, and a profile has to be read knowing
// it: written A2 is a sounding A1.
export const CHORD_OCTAVE = -12

const sampleCache = new Map<string, AudioBuffer>()

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// One period of a wave at phase t in [0, 1). Every wave a profile can
// ask for: one it does not know would come out a sine, and the room
// would sound wrong on the clients that render their track ahead of
// time rather than scheduling it.
export function waveSample(wave: OscillatorType, phase: number): number {
  const s = Math.sin(2 * Math.PI * phase)
  if (wave === 'square') return s >= 0 ? 1 : -1
  if (wave === 'triangle') return (2 / Math.PI) * Math.asin(s)
  if (wave === 'sawtooth') return 2 * (phase - Math.floor(phase + 0.5))
  return s
}

// What the offline track is made of, for the clients that cannot run the
// scheduler: a phone, or any window under 1024px. These are the same
// sounds the live path plays, written into a buffer instead, so a narrow
// window hears the same room as a wide one.

// The kick: a drop from a click to a thud, decaying as it falls.
export function renderPulse(
  channelData: Float32Array,
  sampleRate: number,
  startTime: number,
  pulse: NonNullable<SoundProfile['pulse']>,
  gain: number
): void {
  const startSample = Math.floor(startTime * sampleRate)
  const endSample = Math.min(startSample + Math.floor(pulse.duration * sampleRate), channelData.length)
  let phase = 0
  for (let i = Math.max(0, startSample); i < endSample; i++) {
    const progress = (i - startSample) / (pulse.duration * sampleRate)
    const frequency = pulse.from * Math.pow(pulse.to / pulse.from, progress)
    phase = (phase + frequency / sampleRate) % 1
    const envelope = Math.exp(-progress * 5)
    const sample = waveSample('sine', phase) * envelope * pulse.gain * gain * 0.12
    channelData[i] = Math.max(-1, Math.min(1, channelData[i] + sample))
  }
}

// Mix a decoded one-shot into an offline track. Same numbers the live
// BufferSource path uses, so a phone hears the same hits as a desktop.
export function renderSample(
  channelData: Float32Array,
  sampleRate: number,
  buffer: AudioBuffer,
  startTime: number,
  gain: number
): void {
  const startSample = Math.floor(startTime * sampleRate)
  if (startSample >= channelData.length) return
  const src = buffer.getChannelData(0)
  const ratio = buffer.sampleRate / sampleRate
  const frames = Math.floor(src.length / ratio)
  for (let i = 0; i < frames; i++) {
    const dest = startSample + i
    if (dest < 0) continue
    if (dest >= channelData.length) break
    const srcIndex = Math.min(src.length - 1, Math.floor(i * ratio))
    channelData[dest] = Math.max(-1, Math.min(1, channelData[dest] + src[srcIndex] * gain))
  }
}

export interface RenderedNote {
  frequency: number
  startTime: number
  duration: number
  volume: number
  wave: OscillatorType
  // The pluck: one pole of a lowpass whose corner falls over the note,
  // which is what the live path's filter node does to it.
  filter?: SoundProfile['filter']
}

// A landing, rendered ahead of time for the clients that cannot
// schedule one: the profile's bounce at the middle of its spread, swept
// if it sweeps, decaying fast. Shares its numbers with the live path on
// purpose — the two drifting apart is how a room ends up sounding like
// a different room on a phone.
export function renderBounce(
  channelData: Float32Array,
  sampleRate: number,
  bounce: SoundProfile['bounce'],
  gain: number
): void {
  const from = bounce.from + bounce.spread / 2
  let phase = 0
  for (let i = 0; i < channelData.length; i++) {
    const time = i / sampleRate
    const frequency = bounce.to === null ? from : from * Math.pow(bounce.to / from, Math.min(1, time / bounce.duration))
    phase += frequency / sampleRate
    const envelope = Math.exp(-time * BOUNCE_DECAY)
    channelData[i] = waveSample(bounce.wave, phase % 1) * envelope * 0.05 * gain * bounceGain(bounce)
  }
}

// How loud a landing is against its room; absent is unchanged.
export function bounceGain(bounce: SoundProfile['bounce']): number {
  return bounce.gain ?? 1
}

// How fast a landing dies away, per second. Both paths owe it: the
// pre-rendered one multiplies by it, and the live one ramps down to
// wherever it leaves off, so a quiet room's landing fades to silence
// rather than being cut off partway down.
export const BOUNCE_DECAY = 30

// Where a landing's envelope has fallen to by the time the note stops,
// as a share of its peak. A gain ramp cannot reach zero, so a quiet
// landing needs a quieter floor, not the same absolute one.
export function bounceRelease(peak: number, duration: number): number {
  return Math.max(peak * Math.exp(-BOUNCE_DECAY * duration), 1e-6)
}

export function renderNote(
  channelData: Float32Array,
  sampleRate: number,
  { frequency, startTime, duration, volume, wave, filter }: RenderedNote
): void {
  const startSample = Math.floor(startTime * sampleRate)
  const endSample = Math.min(startSample + Math.floor(duration * sampleRate), channelData.length)
  let pole = 0
  for (let i = Math.max(0, startSample); i < endSample; i++) {
    const noteTime = (i - startSample) / sampleRate
    const progress = noteTime / duration

    // Attack, sustain, release.
    let envelope: number
    if (progress < 0.1) {
      envelope = progress / 0.1
    } else if (progress < 0.7) {
      envelope = 1.0
    } else {
      envelope = Math.exp(-((progress - 0.7) / 0.3) * 5)
    }

    let shaped = waveSample(wave, (frequency * noteTime) % 1)
    if (filter) {
      const corner = filter.from * Math.pow(filter.to / filter.from, Math.min(1, noteTime / filter.seconds))
      const alpha = 1 - Math.exp((-2 * Math.PI * corner) / sampleRate)
      pole += alpha * (shaped - pole)
      shaped = pole * (1 + filter.q * 0.05)
    }

    // Added, not written: chords mix into what is already there.
    channelData[i] = Math.max(-1, Math.min(1, channelData[i] + shaped * envelope * volume))
  }
}

export class AudioSystem implements IAudioSystem {
  audioContext: AudioContext | null
  soundEnabled: boolean
  backgroundMusic: {
    isPlaying: boolean
    gainNode: GainNode | null
    nextNoteTime: number
    tempo: number
    noteIndex: number
    chordIndex: number
    // Absolute sixteenth (or profile step) since the tune started; the
    // lead is longer than the riff, so it cannot key off noteIndex alone.
    stepIndex: number
  }
  lastBounceTime: number
  notesPlayedCount: number
  profile: SoundProfile
  private isMobile: boolean
  private html5BackgroundAudio: HTMLAudioElement | null
  private mobileBounceAudioUrl: string | null
  private sampleBuffers: Map<string, AudioBuffer>
  private sampleLoadToken: number

  constructor(profile: SoundProfile = CALM_SOUND) {
    this.audioContext = null
    this.soundEnabled = false
    this.lastBounceTime = 0
    this.notesPlayedCount = 0
    this.profile = profile
    this.backgroundMusic = {
      isPlaying: false,
      gainNode: null,
      nextNoteTime: 0,
      tempo: profile.tempo,
      noteIndex: 0,
      chordIndex: 0,
      stepIndex: 0,
    }

    // Detect mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024
    this.html5BackgroundAudio = null
    this.mobileBounceAudioUrl = null
    this.sampleBuffers = new Map()
    this.sampleLoadToken = 0

    if (this.isMobile) {
      this.initMobileAudio()
    }
  }

  // The room's sound, from now on. A tune in progress starts the new one
  // from the top; on mobile the pre-rendered track is rebuilt.
  setProfile(profile: SoundProfile): void {
    if (profile === this.profile) return
    this.profile = profile
    this.backgroundMusic.tempo = profile.tempo
    this.backgroundMusic.noteIndex = 0
    this.backgroundMusic.chordIndex = 0
    this.backgroundMusic.stepIndex = 0
    // The step already queued belongs to the tune being left, and a slow
    // one can be seconds out. Walking into a room should not be walking
    // into silence, so the next step is due now.
    const clock = this.audioContext?.currentTime ?? 0
    this.backgroundMusic.nextNoteTime = Math.min(this.backgroundMusic.nextNoteTime, clock)
    this.retireVoices(clock)
    this.sampleBuffers.clear()
    void this.ensureSamplesLoaded()
    if (this.isMobile) {
      this.createMobileBounceSound()
      if (this.backgroundMusic.isPlaying) {
        this.stopBackgroundMusic()
        this.startBackgroundMusic()
      }
    }
  }

  // Tests (and any preloaded path) can skip fetch and drop buffers in.
  injectSampleBuffers(buffers: Record<string, AudioBuffer>): void {
    for (const [id, buffer] of Object.entries(buffers)) {
      this.sampleBuffers.set(id, buffer)
    }
  }

  private async decodeSample(context: AudioContext, url: string): Promise<AudioBuffer | undefined> {
    const cached = sampleCache.get(url)
    if (cached) return cached
    try {
      const response = await fetch(url)
      if (!response.ok) return
      const buffer = await context.decodeAudioData((await response.arrayBuffer()).slice(0))
      sampleCache.set(url, buffer)
      return buffer
    } catch {
      return
    }
  }

  private async ensureSamplesLoaded(): Promise<void> {
    const samples = this.profile.samples
    // Wait for a real context (music on / user gesture). Building one
    // here just to preload would construct AudioContext on every room
    // switch — including jsdom tests that never stub it.
    if (!samples || !this.audioContext) return
    const context = this.audioContext
    const token = ++this.sampleLoadToken
    await Promise.all(
      Object.entries(samples.bank).map(async ([id, url]) => {
        const buffer = await this.decodeSample(context, url)
        if (!buffer || token !== this.sampleLoadToken) return
        this.sampleBuffers.set(id, buffer)
      })
    )
  }

  // Sample kick when loaded; otherwise undefined so the sine pulse can fall through.
  private loadedKick(): { buffer: AudioBuffer; gain: number } | undefined {
    const kick = this.profile.samples?.kick
    if (!kick) return
    const buffer = this.sampleBuffers.get(kick.id)
    if (!buffer) return
    return { buffer, gain: kick.gain }
  }

  // How many melody steps between kicks. A sample kick is always on the beat
  // (one beat apart), matching the pulse's usual `beats: 1`.
  private stepsPerPulse(noteBeats: number): number {
    const pulseBeats = this.profile.samples?.kick ? 1 : this.profile.pulse?.beats
    return pulseBeats ? Math.max(1, Math.round(pulseBeats / noteBeats)) : 0
  }

  // Notes already scheduled go on sounding whatever the room now is: a
  // calm chord runs eight seconds, long enough to hang over the techno.
  // They are all downstream of one gain, so the room being left fades
  // out on its own node while the new one starts on a fresh one.
  private retireVoices(clock: number): void {
    const leaving = this.backgroundMusic.gainNode
    if (!this.audioContext || !leaving || !this.backgroundMusic.isPlaying) return
    const FADE = 0.08
    try {
      leaving.gain.cancelScheduledValues(clock)
      leaving.gain.setValueAtTime(leaving.gain.value, clock)
      leaving.gain.linearRampToValueAtTime(0, clock + FADE)
      window.setTimeout(() => leaving.disconnect(), Math.ceil(FADE * 1000) + 50)
    } catch {
      // A context that will not automate is one we cannot fade; the new
      // node below still takes every note from here on.
    }
    const fresh = this.audioContext.createGain()
    fresh.gain.setValueAtTime(0.1, clock)
    fresh.connect(this.audioContext.destination)
    this.backgroundMusic.gainNode = fresh
  }

  private initMobileAudio(): void {
    // Pre-generate bounce sound for mobile
    this.createMobileBounceSound()
  }

  private createMobileBounceSound(): void {
    try {
      // Create a bounce sound template
      const sampleRate = 44100
      const duration = 0.1 // 100ms
      const samples = Math.floor(sampleRate * duration)

      const tempContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const buffer = tempContext.createBuffer(1, samples, sampleRate)
      const channelData = buffer.getChannelData(0)

      renderBounce(channelData, sampleRate, this.profile.bounce, this.profile.gain)

      const wav = this.encodeWAV(buffer)
      const blob = new Blob([wav], { type: 'audio/wav' })
      this.mobileBounceAudioUrl = URL.createObjectURL(blob)

    } catch {
      // Silent failure for bounce sound creation
      this.mobileBounceAudioUrl = null
    }
  }


  private encodeWAV(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)
    const channelData = buffer.getChannelData(0)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, buffer.sampleRate, true)
    view.setUint32(28, buffer.sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)

    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      view.setInt16(offset, sample * 0x7FFF, true)
      offset += 2
    }

    return arrayBuffer
  }


  private testAudioWithSilentSound(): void {
    // Play a brief silent sound to unlock audio on iOS
    if (!this.audioContext) return

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime)

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 0.01)

    } catch {
      // Silent failure for iOS compatibility test
    }
  }


  initAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      } catch {
        return null
      }
    }
    return this.audioContext
  }


  private createSimpleNote(frequency: number, startTime: number, duration: number, volume: number = 0.03): void {
    if (!this.audioContext || !this.backgroundMusic.gainNode) {
      return
    }

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.type = this.profile.wave
      oscillator.frequency.setValueAtTime(frequency, startTime)
      volume *= this.profile.gain

      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.1, duration * 0.2))
      gainNode.gain.setValueAtTime(volume, startTime + duration * 0.7)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

      // The pluck: a lowpass shutting over the note, so a saw arrives
      // bright and leaves round. A context too old to build one still
      // plays the note, unfiltered.
      const pluck = this.profile.filter
      const filter = pluck ? this.audioContext.createBiquadFilter?.() ?? null : null
      if (pluck && filter) {
        filter.type = 'lowpass'
        filter.Q.setValueAtTime(pluck.q, startTime)
        filter.frequency.setValueAtTime(pluck.from, startTime)
        filter.frequency.exponentialRampToValueAtTime(pluck.to, startTime + pluck.seconds)
        oscillator.connect(filter)
        filter.connect(gainNode)
      } else {
        oscillator.connect(gainNode)
      }
      gainNode.connect(this.backgroundMusic.gainNode)

      oscillator.start(startTime)
      oscillator.stop(startTime + duration)

      this.notesPlayedCount++
    } catch {
      // Silent failure for note creation
    }
  }

  // The long voice: no pluck, its own wave, quieter, hangs past the bar.
  private createLeadNote(frequency: number, startTime: number, duration: number, volume: number, wave: OscillatorType): void {
    if (!this.audioContext || !this.backgroundMusic.gainNode) return
    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      oscillator.type = wave
      oscillator.frequency.setValueAtTime(frequency, startTime)
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.4, duration * 0.15))
      gainNode.gain.setValueAtTime(volume, startTime + duration * 0.7)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      oscillator.connect(gainNode)
      gainNode.connect(this.backgroundMusic.gainNode)
      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
      this.notesPlayedCount++
    } catch {
      // Silent failure for lead note
    }
  }

  private scheduleLead(stepIndex: number, startTime: number, secondsPerBeat: number, noteBeats: number): void {
    const lead = this.profile.lead
    if (!lead || lead.melody.length === 0) return
    const stepsPerLead = Math.max(1, Math.round(lead.noteBeats / noteBeats))
    if (stepIndex % stepsPerLead !== 0) return
    const leadIndex = (stepIndex / stepsPerLead) % lead.melody.length
    const midi = lead.melody[leadIndex]
    if (midi <= 0) return
    const sustainBeats = lead.sustainBeats ?? lead.noteBeats
    const volume = 0.025 * this.profile.gain * (lead.gain ?? 1)
    this.createLeadNote(midiToFreq(midi), startTime, secondsPerBeat * sustainBeats, volume, lead.wave)
  }

  // The kick: sample when the bank has one, otherwise a sine drop. Its
  // own voice, under everything, so the melody's wave and filter never
  // touch it.
  private createPulse(startTime: number): void {
    const kick = this.loadedKick()
    if (kick) {
      this.playSample(kick.buffer, startTime, kick.gain * this.profile.gain)
      return
    }
    const pulse = this.profile.pulse
    if (!pulse || !this.audioContext || !this.backgroundMusic.gainNode) return
    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(pulse.from, startTime)
      oscillator.frequency.exponentialRampToValueAtTime(pulse.to, startTime + pulse.duration)
      const volume = pulse.gain * this.profile.gain
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.005)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + pulse.duration)
      oscillator.connect(gainNode)
      gainNode.connect(this.backgroundMusic.gainNode)
      oscillator.start(startTime)
      oscillator.stop(startTime + pulse.duration)
      this.notesPlayedCount++
    } catch {
      // Silent failure for pulse creation
    }
  }

  private playSample(buffer: AudioBuffer, startTime: number, gain: number, leadIn = 0): void {
    if (!this.audioContext || !this.backgroundMusic.gainNode) return
    try {
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()
      source.buffer = buffer
      const when = Math.max(0, startTime - leadIn)
      gainNode.gain.setValueAtTime(gain, when)
      source.connect(gainNode)
      gainNode.connect(this.backgroundMusic.gainNode)
      source.start(when)
      this.notesPlayedCount++
    } catch {
      // Silent failure for sample playback
    }
  }

  // Whether this step is a hit for the given schedule, in whole steps so
  // floating point on the beat clock cannot drift a hat off the offbeat.
  private hitDue(noteIndex: number, hit: SampleHit, noteBeats: number): boolean {
    const stepsPerHit = Math.max(1, Math.round(hit.everyBeats / noteBeats))
    const offsetSteps = Math.round((hit.offsetBeats ?? 0) / noteBeats)
    if (noteIndex < offsetSteps) return false
    return (noteIndex - offsetSteps) % stepsPerHit === 0
  }

  // Shared by the live scheduler and the offline renderer so a phone
  // rolls the same hits a desktop would.
  private forEachSampleHit(
    noteIndex: number,
    noteBeats: number,
    roll: () => number,
    play: (buffer: AudioBuffer, hit: SampleHit) => void
  ): void {
    const hits = this.profile.samples?.hits
    if (!hits) return
    for (const hit of hits) {
      if (!this.hitDue(noteIndex, hit, noteBeats)) continue
      if (roll() >= hit.chance) continue
      const buffer = this.sampleBuffers.get(hit.id)
      if (!buffer) continue
      play(buffer, hit)
    }
  }

  private createSimpleChord(frequencies: number[], startTime: number, duration: number): void {
    if (!this.audioContext || !this.backgroundMusic.gainNode) {
      return
    }

    try {
      frequencies.forEach((freq) => {
        const oscillator = this.audioContext!.createOscillator()
        const gainNode = this.audioContext!.createGain()

        oscillator.type = this.profile.wave
        oscillator.frequency.setValueAtTime(freq, startTime)

        const volume = 0.02 * this.profile.gain // Quieter chords
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.2, duration * 0.2))
        gainNode.gain.setValueAtTime(volume, startTime + duration * 0.7)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

        oscillator.connect(gainNode)
        gainNode.connect(this.backgroundMusic.gainNode!)

        oscillator.start(startTime)
        oscillator.stop(startTime + duration)

        this.notesPlayedCount++
      })
    } catch {
      // Silent failure for chord creation
    }
  }

  private scheduleNextMusicNotes(): void {
    if (!this.backgroundMusic.isPlaying || !this.audioContext) return

    const currentTime = this.audioContext.currentTime
    const { melody, chords, noteBeats, chordBeats, melodyChance } = this.profile
    const secondsPerBeat = 60.0 / this.backgroundMusic.tempo
    const noteLength = secondsPerBeat * noteBeats
    const chordLength = secondsPerBeat * chordBeats
    const stepsPerChord = Math.max(1, Math.round(chordBeats / noteBeats))
    const pulseEvery = this.stepsPerPulse(noteBeats)

    // Schedule ahead by 200ms
    while (this.backgroundMusic.nextNoteTime < currentTime + 0.2) {
      const { noteIndex, nextNoteTime, stepIndex } = this.backgroundMusic

      if (pulseEvery > 0 && noteIndex % pulseEvery === 0) {
        this.createPulse(nextNoteTime)
      }

      this.forEachSampleHit(noteIndex, noteBeats, () => Math.random(), (buffer, hit) => {
        this.playSample(buffer, nextNoteTime, hit.gain * this.profile.gain, hit.leadIn ?? 0)
      })

      const melodyMidi = melody[noteIndex]
      if (melodyMidi > 0 && Math.random() < melodyChance) {
        this.createSimpleNote(midiToFreq(melodyMidi), nextNoteTime, noteLength * 1.5)
      }

      this.scheduleLead(stepIndex, nextNoteTime, secondsPerBeat, noteBeats)

      if (noteIndex % stepsPerChord === 0) {
        const chord = chords[this.backgroundMusic.chordIndex]
        const chordFreqs = chord.map(midi => midiToFreq(midi + CHORD_OCTAVE))
        this.createSimpleChord(chordFreqs, nextNoteTime, chordLength)

        this.backgroundMusic.chordIndex = (this.backgroundMusic.chordIndex + 1) % chords.length
      }

      // Advance to next note
      this.backgroundMusic.nextNoteTime += noteLength
      this.backgroundMusic.noteIndex = (noteIndex + 1) % melody.length
      this.backgroundMusic.stepIndex = stepIndex + 1
    }

    // Schedule next batch
    if (this.backgroundMusic.isPlaying) {
      setTimeout(() => this.scheduleNextMusicNotes(), 200)
    }
  }

  startBackgroundMusic(): void {
    if (this.backgroundMusic.isPlaying || !this.soundEnabled) {
      return
    }

    if (this.isMobile) {
      this.startMobileBackgroundMusic()
    } else {
      this.startWebAudioBackgroundMusic()
    }
  }

  private startWebAudioBackgroundMusic(): void {
    // Initialize audio context if needed
    const context = this.initAudioContext()
    if (!context) {
      return
    }

    void this.ensureSamplesLoaded()

    // Create master gain node for background music
    this.backgroundMusic.gainNode = context.createGain()
    this.backgroundMusic.gainNode.gain.setValueAtTime(0.1, context.currentTime) // Much quieter
    this.backgroundMusic.gainNode.connect(context.destination)

    this.backgroundMusic.isPlaying = true
    this.backgroundMusic.nextNoteTime = context.currentTime
    this.backgroundMusic.noteIndex = 0
    this.backgroundMusic.chordIndex = 0
    this.backgroundMusic.stepIndex = 0

    this.scheduleNextMusicNotes()
  }

  private startMobileBackgroundMusic(): void {

    try {
      // Create a simple looping background music track
      const musicBuffer = this.createMobileBackgroundTrack()
      const blob = new Blob([musicBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)

      this.html5BackgroundAudio = new Audio(url)
      this.html5BackgroundAudio.loop = true
      this.html5BackgroundAudio.volume = 0.03

      this.html5BackgroundAudio.addEventListener('canplaythrough', () => {
        if (this.html5BackgroundAudio) {
          const playPromise = this.html5BackgroundAudio.play()
          if (playPromise !== undefined) {
            playPromise.then(() => {
              this.backgroundMusic.isPlaying = true
            }).catch(() => {
              // Silent failure for mobile audio play
            })
          }
        }
      })

      this.html5BackgroundAudio.addEventListener('error', () => {
        // Silent failure for mobile audio error
      })

      this.html5BackgroundAudio.load()

    } catch {
      // Silent failure for mobile music creation
    }
  }

  private createMobileBackgroundTrack(): ArrayBuffer {
    // Long enough for one full 32-bar lead at 140 (~55s), plus a little.
    const sampleRate = 44100
    const duration = 64
    const samples = sampleRate * duration

    // Create a temporary audio context just for generating the audio
    const tempContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const buffer = tempContext.createBuffer(1, samples, sampleRate)
    const channelData = buffer.getChannelData(0)

    // The same profile the Web Audio version plays
    const { melody, chords, noteBeats, chordBeats, melodyChance, wave, gain, pulse, filter, lead } = this.profile
    const secondsPerBeat = 60.0 / this.profile.tempo
    const noteLength = secondsPerBeat * noteBeats
    const chordLength = secondsPerBeat * chordBeats
    const stepsPerChord = Math.max(1, Math.round(chordBeats / noteBeats))
    const pulseEvery = this.stepsPerPulse(noteBeats)
    const kick = this.loadedKick()
    const stepsPerLead = lead ? Math.max(1, Math.round(lead.noteBeats / noteBeats)) : 0

    // Pre-render the procedural music pattern
    let currentTime = 0
    let noteIndex = 0
    let chordIndex = 0
    let stepIndex = 0

    // Use a seeded random for consistent generation
    let seed = 12345 // Fixed seed for consistent audio
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    while (currentTime < duration) {
      if (pulseEvery > 0 && noteIndex % pulseEvery === 0) {
        if (kick) {
          renderSample(channelData, sampleRate, kick.buffer, currentTime, kick.gain * gain)
        } else if (pulse) {
          renderPulse(channelData, sampleRate, currentTime, pulse, gain)
        }
      }

      // Offline can start before t=0 (lead-in); renderSample skips those frames.
      this.forEachSampleHit(noteIndex, noteBeats, seededRandom, (hitBuffer, hit) => {
        renderSample(channelData, sampleRate, hitBuffer, currentTime - (hit.leadIn ?? 0), hit.gain * gain)
      })

      const melodyMidi = melody[noteIndex]
      if (melodyMidi > 0 && seededRandom() < melodyChance) {
        renderNote(channelData, sampleRate, {
          frequency: midiToFreq(melodyMidi),
          startTime: currentTime,
          duration: noteLength * 1.5,
          volume: 0.005 * gain,
          wave,
          filter,
        })
      }

      if (lead && stepsPerLead > 0 && stepIndex % stepsPerLead === 0) {
        const leadMidi = lead.melody[(stepIndex / stepsPerLead) % lead.melody.length]
        if (leadMidi > 0) {
          const sustain = secondsPerBeat * (lead.sustainBeats ?? lead.noteBeats)
          renderNote(channelData, sampleRate, {
            frequency: midiToFreq(leadMidi),
            startTime: currentTime,
            duration: sustain,
            volume: 0.025 * gain * (lead.gain ?? 1),
            wave: lead.wave,
          })
        }
      }

      if (noteIndex % stepsPerChord === 0) {
        const chord = chords[chordIndex]
        for (const midi of chord) {
          renderNote(channelData, sampleRate, {
            frequency: midiToFreq(midi + CHORD_OCTAVE),
            startTime: currentTime,
            duration: chordLength,
            volume: 0.003 * gain,
            wave,
          })
        }
        chordIndex = (chordIndex + 1) % chords.length
      }

      // Advance to next note (same logic as Web Audio)
      currentTime += noteLength
      noteIndex = (noteIndex + 1) % melody.length
      stepIndex++
    }

    // Apply fade-in and fade-out to prevent clicks at loop boundaries
    const fadeDuration = 0.1 // 100ms fade
    const fadeSamples = Math.floor(fadeDuration * sampleRate)

    // Fade in at the beginning
    for (let i = 0; i < fadeSamples && i < samples; i++) {
      const fadeGain = i / fadeSamples
      channelData[i] *= fadeGain
    }

    // Fade out at the end
    for (let i = samples - fadeSamples; i < samples; i++) {
      const fadeGain = (samples - i) / fadeSamples
      channelData[i] *= fadeGain
    }

    return this.encodeWAV(buffer)
  }


  stopBackgroundMusic(): void {
    if (!this.backgroundMusic.isPlaying) return

    this.backgroundMusic.isPlaying = false

    if (this.isMobile && this.html5BackgroundAudio) {
      // Stop HTML5 audio
      this.html5BackgroundAudio.pause()
      this.html5BackgroundAudio.currentTime = 0
      this.html5BackgroundAudio = null
    } else {
      // Clean up Web Audio gain node
      if (this.backgroundMusic.gainNode) {
        this.backgroundMusic.gainNode.disconnect()
        this.backgroundMusic.gainNode = null
      }
    }

  }

  playBoingSound(): void {
    if (!this.soundEnabled) return

    const now = performance.now()

    // Throttle bounce sounds
    if (now - this.lastBounceTime < 200) return
    this.lastBounceTime = now

    if (this.isMobile) {
      this.playMobileBoingSound()
    } else {
      this.playWebAudioBoingSound()
    }
  }

  private playWebAudioBoingSound(): void {
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    // The room's bounce: a note, swept if the profile says so
    const { bounce, gain } = this.profile
    const frequency = bounce.from + Math.random() * bounce.spread
    oscillator.frequency.setValueAtTime(frequency, now)
    if (bounce.to !== null) oscillator.frequency.exponentialRampToValueAtTime(bounce.to, now + bounce.duration)
    oscillator.type = bounce.wave

    // Quick attack, then the same decay the pre-rendered landing has.
    const peak = 0.015 * gain * bounceGain(bounce)
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(peak, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(bounceRelease(peak, bounce.duration), now + bounce.duration)

    oscillator.start(now)
    oscillator.stop(now + bounce.duration)
  }

  private playMobileBoingSound(): void {
    if (!this.mobileBounceAudioUrl) return

    try {
      const audio = new Audio(this.mobileBounceAudioUrl)
      audio.volume = 0.005

      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Silently fail - bounce sounds are not critical
        })
      }

    } catch {
      // Silently fail for bounce sounds
    }
  }

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled

    const soundToggle = document.getElementById('sound-toggle')
    if (!soundToggle) {
      return
    }

    if (this.soundEnabled) {
      soundToggle.textContent = '🔊 Sound: ON'
      soundToggle.classList.add('enabled')

      // Initialize audio context on user interaction (mobile requirement)
      const context = this.initAudioContext()
      if (context) {

        if (context.state === 'suspended') {
          context.resume().then(() => {

            // Play silent sound first for iOS compatibility
            this.testAudioWithSilentSound()

            // Start background music after a brief delay
            setTimeout(() => {
              this.startBackgroundMusic()
            }, 100)
          }).catch(() => {
            // Silent failure for context resume
          })
        } else if (context.state === 'running') {
          this.startBackgroundMusic()
        }
      }
    } else {
      soundToggle.textContent = '🔇 Sound: OFF'
      soundToggle.classList.remove('enabled')
      this.stopBackgroundMusic()
    }

  }

  cleanup(): void {
    // Clean up resources when audio system is destroyed
    this.stopBackgroundMusic()

    if (this.mobileBounceAudioUrl) {
      URL.revokeObjectURL(this.mobileBounceAudioUrl)
      this.mobileBounceAudioUrl = null
    }
  }
}
