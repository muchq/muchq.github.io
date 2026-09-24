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

// A sampled bassline: one rhythm, and a note that follows the chord.
// `byRoot` maps a chord's root note to the sample that plays it, so the
// line moves with the harmony instead of being spelled out twice.
export interface SoundBass {
  noteBeats: number
  gain: number
  // 1 sounds, 0 rests, repeating every `steps.length` slots.
  steps: number[]
  byRoot: Record<number, string>
}

export interface SoundSamples {
  bank: Record<string, string>
  kick?: { id: string; gain: number }
  hits: SampleHit[]
  bass?: SoundBass
}

// What a room sounds like: the wave its notes are, how fast, which
// tune, and what a bounce is. A melody entry of 0 is a rest.
export interface SoundProfile {
  // What the command menu calls it.
  label: string
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
  // `sweep` moves the ceiling itself over `cycleBeats`, so the riff
  // brightens and dulls across the phrase instead of every note in the
  // room arriving identical to the last.
  filter?: {
    from: number
    to: number
    seconds: number
    q: number
    sweep?: { depth: number; cycleBeats: number }
  }
  // The pad's own lowpass, opening across the chord rather than shutting
  // over it: a swell under the riff, where the pluck is a stab.
  pad?: { from: number; to: number; q: number }
  // How loud the chords are voiced. 0 leaves the progression as harmony
  // the bass follows and nothing plays out loud, which is how a room
  // can be drums and bass and still know what key it is in. Absent is 1.
  padGain?: number
  // Optional one-shots and a sample kick layered on the procedural tune.
  samples?: SoundSamples
  // A looping bed that replaces the procedural scheduler when set: the
  // glasshouse's second tune is one long sample, not a pattern.
  loop?: { url: string; gain: number }
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
  label: 'Calm',
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
  label: 'Chiptune',
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

// The glasshouse, stripped back to drums and bass while the rest of the
// sounds are chosen: a kick on the beat, a hat and the bass off it. The
// progression stays even though nothing voices it — it is what tells
// the bass which of the three notes to play.
export const TECHNO_SOUND: SoundProfile = {
  label: 'Techno',
  wave: 'sawtooth',
  tempo: 140,
  noteBeats: 0.25,
  chordBeats: 4,
  melodyChance: 1,
  // Eight bars of rests: no riff for now, but the loop still spans the
  // progression, so a tune dropped in here lands where the harmony is.
  melody: new Array(128).fill(0),
  // E Phrygian: the bass samples are E, F and B flat — root, flat
  // second, flat fifth. Four bars of E, two of F, two of the tritone.
  // B flat carries no third; a bare fifth is tense enough.
  chords: [
    [40, 55, 59], // E minor
    [40, 55, 59],
    [40, 55, 59],
    [40, 55, 59],
    [41, 57, 60], // F major
    [41, 57, 60],
    [46, 58, 65], // B flat, root and fifth only
    [46, 58, 65],
  ],
  // Harmony, not a sound: see padGain.
  padGain: 0,
  bounce: { wave: 'triangle', from: 240, spread: 40, to: 90, duration: 0.09, gain: 0.3 },
  // Fallback only — the sampled kick takes over once the bank loads.
  pulse: { from: 190, to: 38, duration: 0.19, beats: 1, gain: 0.55 },
  gain: 0.5,
  samples: {
    bank: {
      kick: `${GH}/kick.wav`,
      hat: `${GH}/hat.wav`,
      bassE: `${GH}/bassE.wav`,
      bassF: `${GH}/bassF.wav`,
      bassBb: `${GH}/bassBb.wav`,
    },
    // Another 3dB down. Measured rather than guessed the second time:
    // the kick sample is hotter than the bass ones (RMS 0.36 against
    // 0.24), so at 0.39 it still sat 1.5dB *over* the bass even though
    // its gain number was lower. A gain is not a loudness.
    kick: { id: 'kick', gain: 0.276 },
    hits: [{ id: 'hat', everyBeats: 1, offsetBeats: 0.5, chance: 1, gain: 0.12 }],
    // Offbeat eighths under a four-to-the-floor kick: the roll that
    // makes it trance rather than a loop with a bass note on it. The
    // note is whichever sample belongs to the bar's chord.
    bass: {
      noteBeats: 0.5,
      gain: 0.5,
      steps: [0, 1],
      byRoot: { 40: 'bassE', 41: 'bassF', 46: 'bassBb' },
    },
  },
}

// The glasshouse's other tune: one looping break instead of the
// drum/bass bank. Bounce matches techno so landings still belong here.
export const BREAK_SOUND: SoundProfile = {
  label: 'Break',
  wave: 'sawtooth',
  tempo: 174,
  noteBeats: 0.25,
  chordBeats: 4,
  melodyChance: 0,
  melody: [0],
  chords: [[40]],
  padGain: 0,
  bounce: TECHNO_SOUND.bounce,
  gain: 0.5,
  loop: { url: `${GH}/break10.mp3`, gain: 0.45 },
}

// Chords sound an octave below where a profile writes them, so a pad
// sits under its own melody without every profile spelling it. Both
// renderers owe the same offset, and a profile has to be read knowing
// it: written A2 is a sounding A1.
export const CHORD_OCTAVE = -12

const sampleCache = new Map<string, AudioBuffer>()

// Where the pluck's ceiling sits this many beats into the tune. A fixed
// ceiling means every note is filtered identically, which is most of why
// a loop wears out; this rides it up and down over the phrase so the
// riff opens and closes without a single note changing. Never falls
// below `1 - depth` of the ceiling, and returns exactly `from` for a
// profile that asks for no sweep.
export function filterCeiling(filter: NonNullable<SoundProfile['filter']>, beats: number): number {
  const sweep = filter.sweep
  if (!sweep) return filter.from
  const phase = (((beats % sweep.cycleBeats) + sweep.cycleBeats) % sweep.cycleBeats) / sweep.cycleBeats
  // Darkest at the top of the cycle, brightest halfway through.
  const open = (1 - Math.cos(phase * 2 * Math.PI)) / 2
  return filter.from * (1 - sweep.depth + sweep.depth * open)
}

// Which chord of the progression is under a given step. Derived rather
// than counted, because the bass has to agree with the pad about what
// bar it is and a second counter would drift.
export function chordAt(profile: SoundProfile, stepIndex: number): number[] {
  const bar = Math.floor((stepIndex * profile.noteBeats) / profile.chordBeats)
  return profile.chords[((bar % profile.chords.length) + profile.chords.length) % profile.chords.length]
}

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

// How long a phone's looping bed should be, in samples. HTMLAudioElement
// wraps on the file length, so a round number of seconds that cuts mid-
// phrase makes the kick jump every loop. Land on whole phrases near
// `targetSeconds` instead.
export function mobileLoopSamples(
  profile: Pick<SoundProfile, 'tempo' | 'noteBeats' | 'melody'>,
  sampleRate: number,
  targetSeconds = 60
): number {
  const phraseBeats = profile.melody.length * profile.noteBeats
  if (!(phraseBeats > 0) || !(profile.tempo > 0) || !(sampleRate > 0)) {
    return Math.max(1, Math.round(targetSeconds * sampleRate))
  }
  const phraseSeconds = (phraseBeats * 60) / profile.tempo
  const phrases = Math.max(1, Math.round(targetSeconds / phraseSeconds))
  const samplesPerBeat = (sampleRate * 60) / profile.tempo
  return phrases * Math.round(phraseBeats * samplesPerBeat)
}

// Dest frame in the track: wrap when looping, else null if out of range.
function destIndex(index: number, length: number, loop: boolean): number | null {
  if (loop) return ((index % length) + length) % length
  if (index < 0 || index >= length) return null
  return index
}

// The kick: a drop from a click to a thud, decaying as it falls.
export function renderPulse(
  channelData: Float32Array,
  sampleRate: number,
  startTime: number,
  pulse: NonNullable<SoundProfile['pulse']>,
  gain: number,
  loop = false
): void {
  const startSample = Math.floor(startTime * sampleRate)
  const frames = Math.floor(pulse.duration * sampleRate)
  let phase = 0
  for (let f = 0; f < frames; f++) {
    const i = destIndex(startSample + f, channelData.length, loop)
    if (i === null) continue
    const progress = f / (pulse.duration * sampleRate)
    const frequency = pulse.from * Math.pow(pulse.to / pulse.from, progress)
    phase = (phase + frequency / sampleRate) % 1
    const envelope = Math.exp(-progress * 5)
    const sample = waveSample('sine', phase) * envelope * pulse.gain * gain * 0.12
    channelData[i] = Math.max(-1, Math.min(1, channelData[i] + sample))
  }
}

// Mix a decoded one-shot into an offline track. Same numbers the live
// BufferSource path uses, so a phone hears the same hits as a desktop.
// When `loop` is set, a hit that straddles the end wraps onto the start
// — otherwise a long kick truncated at the seam thins every HTML5 wrap.
export function renderSample(
  channelData: Float32Array,
  sampleRate: number,
  buffer: AudioBuffer,
  startTime: number,
  gain: number,
  loop = false
): void {
  const startSample = Math.floor(startTime * sampleRate)
  if (!loop && startSample >= channelData.length) return
  const src = buffer.getChannelData(0)
  const ratio = buffer.sampleRate / sampleRate
  const frames = Math.floor(src.length / ratio)
  for (let i = 0; i < frames; i++) {
    const dest = destIndex(startSample + i, channelData.length, loop)
    if (dest === null) continue
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
  { frequency, startTime, duration, volume, wave, filter }: RenderedNote,
  loop = false
): void {
  const startSample = Math.floor(startTime * sampleRate)
  const frames = Math.floor(duration * sampleRate)
  let pole = 0
  for (let f = 0; f < frames; f++) {
    const i = destIndex(startSample + f, channelData.length, loop)
    if (i === null) continue
    const noteTime = f / sampleRate
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
  private loopSource: AudioBufferSourceNode | null
  private loopBuffer: AudioBuffer | null
  // Pre-baked mobile bed as raw PCM. Closing the bake context does not
  // invalidate this copy; HTML5 play encodes it to a WAV on demand.
  private bakedMobilePcm: { sampleRate: number; data: Float32Array } | null
  private mobileBakeToken: number

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
    this.loopSource = null
    this.loopBuffer = null
    this.bakedMobilePcm = null
    this.mobileBakeToken = 0

    if (this.isMobile) {
      this.initMobileAudio()
    }
  }

  // Swap the active profile and rewind its counters. Does not touch
  // playback, buffers, or the loop bed — callers own those.
  private adoptProfile(profile: SoundProfile): void {
    this.profile = profile
    this.backgroundMusic.tempo = profile.tempo
    this.backgroundMusic.noteIndex = 0
    this.backgroundMusic.chordIndex = 0
    this.backgroundMusic.stepIndex = 0
  }

  // Drop decoded assets so the next load belongs to the profile just
  // adopted, not the one left behind.
  private clearSampleState(): void {
    this.loopBuffer = null
    this.bakedMobilePcm = null
    this.mobileBakeToken++
    this.sampleBuffers.clear()
  }

  // The room's sound, from now on. A tune in progress starts the new one
  // from the top; on mobile the pre-rendered track is rebuilt.
  setProfile(profile: SoundProfile): void {
    if (profile === this.profile) return
    const wasLoop = !!this.profile.loop
    this.adoptProfile(profile)
    // The step already queued belongs to the tune being left, and a slow
    // one can be seconds out. Walking into a room should not be walking
    // into silence, so the next step is due now.
    const clock = this.audioContext?.currentTime ?? 0
    this.backgroundMusic.nextNoteTime = Math.min(this.backgroundMusic.nextNoteTime, clock)
    this.retireVoices(clock)
    this.stopLoopBed()
    this.clearSampleState()
    void this.ensureSamplesLoaded()
    if (this.isMobile) {
      this.createMobileBounceSound()
      if (this.backgroundMusic.isPlaying) {
        this.stopBackgroundMusic()
        this.startBackgroundMusic()
      } else if (!profile.loop) {
        void this.prebakeMobileTrack()
      }
      return
    }
    if (!this.backgroundMusic.isPlaying) return
    // A loop bed parks the scheduler; entering or leaving one has to
    // start the right voice. Ordinary profile swaps keep the existing
    // schedule tick.
    if (profile.loop) {
      void this.ensureSamplesLoaded().then(() => {
        if (this.backgroundMusic.isPlaying && this.profile.loop) this.startLoopBed()
      })
    } else if (wasLoop) {
      this.scheduleNextMusicNotes()
    }
  }

  // Hard cut to another profile: stop whatever is sounding and start
  // the new one immediately. Used when cycling a room's music options;
  // room changes keep setProfile's soft handoff.
  cutToProfile(profile: SoundProfile): void {
    // Resume if sound is on and something was already sounding or still
    // loading — a mobile loop sets isPlaying only after play() resolves.
    const resume =
      this.soundEnabled &&
      (this.backgroundMusic.isPlaying || !!this.html5BackgroundAudio || !!this.loopSource)
    this.stopBackgroundMusic()
    if (profile !== this.profile) {
      this.adoptProfile(profile)
      this.clearSampleState()
      void this.ensureSamplesLoaded()
      if (this.isMobile) this.createMobileBounceSound()
    }
    if (resume) this.startBackgroundMusic()
  }

  // Tests (and any preloaded path) can skip fetch and drop buffers in.
  injectSampleBuffers(buffers: Record<string, AudioBuffer>): void {
    for (const [id, buffer] of Object.entries(buffers)) {
      this.sampleBuffers.set(id, buffer)
    }
  }

  private async decodeSample(context: BaseAudioContext, url: string): Promise<AudioBuffer | undefined> {
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

  // `into` lets the offline path decode against a context of its own:
  // a phone never builds a live one, so without this its bank could
  // never load and it fell back to the synthetic kick with no hats and
  // no bass — a different room from the one everyone else hears.
  private async ensureSamplesLoaded(into?: BaseAudioContext): Promise<void> {
    // Wait for a real context (music on / user gesture). Building one
    // here just to preload would construct AudioContext on every room
    // switch — including jsdom tests that never stub it.
    const context = into ?? this.audioContext
    if (!context) return
    const token = ++this.sampleLoadToken
    const samples = this.profile.samples
    if (samples) {
      await Promise.all(
        Object.entries(samples.bank).map(async ([id, url]) => {
          const buffer = await this.decodeSample(context, url)
          if (!buffer || token !== this.sampleLoadToken) return
          this.sampleBuffers.set(id, buffer)
        })
      )
    }
    const loop = this.profile.loop
    if (loop) {
      const buffer = await this.decodeSample(context, loop.url)
      if (buffer && token === this.sampleLoadToken) this.loopBuffer = buffer
    }
  }

  private stopLoopBed(): void {
    const source = this.loopSource
    if (!source) return
    this.loopSource = null
    try {
      source.stop()
    } catch {
      // Already stopped.
    }
    try {
      source.disconnect()
    } catch {
      // Already disconnected.
    }
  }

  // A looping bed for profiles that bring their own track. Gain rides
  // the room's master so mute/stop still cut it.
  private startLoopBed(): boolean {
    const { audioContext, loopBuffer } = this
    const master = this.backgroundMusic.gainNode
    const loop = this.profile.loop
    if (!audioContext || !master || !loop || !loopBuffer) return false
    this.stopLoopBed()
    try {
      const source = audioContext.createBufferSource()
      const gainNode = audioContext.createGain()
      source.buffer = loopBuffer
      source.loop = true
      gainNode.gain.setValueAtTime(loop.gain * this.profile.gain, audioContext.currentTime)
      source.connect(gainNode)
      gainNode.connect(master)
      source.start()
      this.loopSource = source
      return true
    } catch {
      return false
    }
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
    // Bake ahead so the sound tap only has to encode and play.
    if (!this.profile.loop) void this.prebakeMobileTrack()
  }

  // Decode and bake into plain PCM; the throwaway context can close after.
  private async prebakeMobileTrack(): Promise<void> {
    if (this.profile.loop) return
    const token = ++this.mobileBakeToken
    let context: AudioContext | null = null
    try {
      context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      await this.ensureSamplesLoaded(context)
      if (token !== this.mobileBakeToken) return
      const buffer = this.renderMobileTrackBuffer(context)
      if (token !== this.mobileBakeToken) return
      this.bakedMobilePcm = {
        sampleRate: buffer.sampleRate,
        data: new Float32Array(buffer.getChannelData(0)),
      }
    } catch {
      if (token === this.mobileBakeToken) this.bakedMobilePcm = null
    } finally {
      this.closeThrowawayContext(context)
    }
  }

  private closeThrowawayContext(context: AudioContext | null): void {
    try {
      void context?.close()
    } catch {
      // Throwaway context; ignore close failures.
    }
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
    return this.encodePcmWav({
      sampleRate: buffer.sampleRate,
      data: buffer.getChannelData(0),
    })
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


  private createSimpleNote(frequency: number, startTime: number, duration: number, volume: number = 0.03, ceiling?: number): void {
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
        filter.frequency.setValueAtTime(ceiling ?? pluck.from, startTime)
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

  // The offbeat bass: one rhythm, and whichever sample belongs to the
  // chord this bar. A root with no sample is silence rather than the
  // wrong note.
  // Which bass note falls on this step, if any. Both the scheduler and
  // the offline renderer ask this same question, because a bassline
  // spelled out twice is a bassline that will disagree with itself.
  private bassAt(stepIndex: number, noteBeats: number): { buffer: AudioBuffer; gain: number } | null {
    const bass = this.profile.samples?.bass
    if (!bass || bass.steps.length === 0) return null
    const stepsPerBass = Math.max(1, Math.round(bass.noteBeats / noteBeats))
    if (stepIndex % stepsPerBass !== 0) return null
    if (!bass.steps[(stepIndex / stepsPerBass) % bass.steps.length]) return null
    const id = bass.byRoot[chordAt(this.profile, stepIndex)[0]]
    const buffer = id ? this.sampleBuffers.get(id) : undefined
    if (!buffer) return null
    return { buffer, gain: bass.gain * this.profile.gain }
  }

  private scheduleBass(stepIndex: number, startTime: number, noteBeats: number): void {
    const hit = this.bassAt(stepIndex, noteBeats)
    if (hit) this.playSample(hit.buffer, startTime, hit.gain)
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
    // A progression nobody voices is still the harmony the bass reads.
    if ((this.profile.padGain ?? 1) === 0) return

    try {
      frequencies.forEach((freq) => {
        const oscillator = this.audioContext!.createOscillator()
        const gainNode = this.audioContext!.createGain()

        oscillator.type = this.profile.wave
        oscillator.frequency.setValueAtTime(freq, startTime)

        const volume = 0.02 * this.profile.gain * (this.profile.padGain ?? 1) // Quieter chords
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.2, duration * 0.2))
        gainNode.gain.setValueAtTime(volume, startTime + duration * 0.7)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

        // The pad swells rather than stabs: its lowpass opens across the
        // whole chord, so the bar arrives muffled and blooms under the
        // riff. A context too old to build one still plays the chord.
        const pad = this.profile.pad
        const filter = pad ? this.audioContext!.createBiquadFilter?.() ?? null : null
        if (pad && filter) {
          filter.type = 'lowpass'
          filter.Q.setValueAtTime(pad.q, startTime)
          filter.frequency.setValueAtTime(pad.from, startTime)
          filter.frequency.exponentialRampToValueAtTime(pad.to, startTime + duration * 0.8)
          oscillator.connect(filter)
          filter.connect(gainNode)
        } else {
          oscillator.connect(gainNode)
        }
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
    // A looping bed owns the room; the scheduler would just stack notes
    // on top of it.
    if (this.profile.loop) return

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
        const ceiling = this.profile.filter
          ? filterCeiling(this.profile.filter, stepIndex * noteBeats)
          : undefined
        this.createSimpleNote(midiToFreq(melodyMidi), nextNoteTime, noteLength * 1.5, undefined, ceiling)
      }

      this.scheduleLead(stepIndex, nextNoteTime, secondsPerBeat, noteBeats)
      this.scheduleBass(stepIndex, nextNoteTime, noteBeats)

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

    // Create master gain node for background music
    this.backgroundMusic.gainNode = context.createGain()
    this.backgroundMusic.gainNode.gain.setValueAtTime(0.1, context.currentTime) // Much quieter
    this.backgroundMusic.gainNode.connect(context.destination)

    this.backgroundMusic.isPlaying = true
    this.backgroundMusic.nextNoteTime = context.currentTime
    this.backgroundMusic.noteIndex = 0
    this.backgroundMusic.chordIndex = 0
    this.backgroundMusic.stepIndex = 0

    if (this.profile.loop) {
      void this.ensureSamplesLoaded().then(() => {
        if (!this.backgroundMusic.isPlaying || !this.profile.loop) return
        this.startLoopBed()
      })
      return
    }

    void this.ensureSamplesLoaded()
    this.scheduleNextMusicNotes()
  }

  private startMobileBackgroundMusic(): void {
    if (this.profile.loop) {
      void this.startMobileLoopBed()
      return
    }
    void this.renderMobileBackgroundMusic()
  }

  // A phone plays the looping bed as the file itself — no need to bake
  // a WAV of a track that is already a track.
  private async startMobileLoopBed(): Promise<void> {
    const loop = this.profile.loop
    if (!loop) return
    try {
      const url = loop.url
      const audio = new Audio(url)
      this.html5BackgroundAudio = audio
      audio.loop = true
      audio.volume = Math.min(1, loop.gain * this.profile.gain * 0.3)
      audio.addEventListener('canplaythrough', () => {
        // A fast cut may have replaced or cleared this element.
        if (this.html5BackgroundAudio !== audio || this.profile.loop?.url !== url) return
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.then(() => {
            if (this.html5BackgroundAudio === audio) this.backgroundMusic.isPlaying = true
          }).catch(() => {
            // Silent failure for mobile audio play
          })
        }
      })
      audio.load()
    } catch {
      // Silent failure for mobile loop
    }
  }

  // Phones play the baked bed through HTMLAudioElement.
  private async renderMobileBackgroundMusic(): Promise<void> {
    if (!this.bakedMobilePcm) await this.prebakeMobileTrack()

    // HTML5: reuse the bake when we have one; otherwise render into a
    // throwaway context just long enough to encode a WAV.
    let context: AudioContext | null = null
    if (!this.bakedMobilePcm) {
      try {
        context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        await this.ensureSamplesLoaded(context)
      } catch {
        // No context to decode with; the track still renders, procedurally.
      }
    }

    try {
      const wav = this.bakedMobilePcm
        ? this.encodePcmWav(this.bakedMobilePcm)
        : this.createMobileBackgroundTrack(context)
      const blob = new Blob([wav], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)

      this.html5BackgroundAudio = new Audio(url)
      this.html5BackgroundAudio.loop = true
      this.html5BackgroundAudio.volume = 0.03

      this.html5BackgroundAudio.addEventListener('canplaythrough', () => {
        if (!this.html5BackgroundAudio) return
        const playPromise = this.html5BackgroundAudio.play()
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.backgroundMusic.isPlaying = true
          }).catch(() => {
            // Silent failure for mobile audio play
          })
        }
      })

      this.html5BackgroundAudio.addEventListener('error', () => {
        // Silent failure for mobile audio error
      })

      this.html5BackgroundAudio.load()
    } catch {
      // Silent failure for mobile music creation
    } finally {
      this.closeThrowawayContext(context)
    }
  }

  // PCM → WAV without needing a live AudioBuffer from a closed context.
  private encodePcmWav(pcm: { sampleRate: number; data: Float32Array }): ArrayBuffer {
    const length = pcm.data.length
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i))
    }
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, pcm.sampleRate, true)
    view.setUint32(28, pcm.sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)
    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, pcm.data[i]))
      view.setInt16(offset, sample * 0x7FFF, true)
      offset += 2
    }
    return arrayBuffer
  }

  private createMobileBackgroundTrack(given?: AudioContext | null): ArrayBuffer {
    return this.encodeWAV(this.renderMobileTrackBuffer(given))
  }

  private renderMobileTrackBuffer(given?: BaseAudioContext | null): AudioBuffer {
    // Phrase-aligned so the loop wraps on a bar line.
    const sampleRate = 44100
    const samples = mobileLoopSamples(this.profile, sampleRate)
    const duration = samples / sampleRate

    // The context the bank was decoded against, so the buffers here are
    // usable; otherwise one of our own just to allocate the track.
    const tempContext = given ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
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

    // Sample-accurate steps so floor(time * rate) does not drift off the grid.
    const samplesPerStep = Math.round(noteLength * sampleRate)
    const totalSteps = Math.round(duration / noteLength)
    let seed = 12345 // Fixed seed for consistent audio
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    // Hits wrap across the seam so a long kick is not truncated every loop.
    let chordIndex = 0
    for (let step = 0; step < totalSteps; step++) {
      const currentTime = (step * samplesPerStep) / sampleRate
      const noteIndex = step % melody.length

      if (pulseEvery > 0 && noteIndex % pulseEvery === 0) {
        if (kick) {
          renderSample(channelData, sampleRate, kick.buffer, currentTime, kick.gain * gain, true)
        } else if (pulse) {
          renderPulse(channelData, sampleRate, currentTime, pulse, gain, true)
        }
      }

      this.forEachSampleHit(noteIndex, noteBeats, seededRandom, (hitBuffer, hit) => {
        renderSample(channelData, sampleRate, hitBuffer, currentTime - (hit.leadIn ?? 0), hit.gain * gain, true)
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
        }, true)
      }

      if (lead && stepsPerLead > 0 && step % stepsPerLead === 0) {
        const leadMidi = lead.melody[(step / stepsPerLead) % lead.melody.length]
        if (leadMidi > 0) {
          const sustain = secondsPerBeat * (lead.sustainBeats ?? lead.noteBeats)
          renderNote(channelData, sampleRate, {
            frequency: midiToFreq(leadMidi),
            startTime: currentTime,
            duration: sustain,
            volume: 0.025 * gain * (lead.gain ?? 1),
            wave: lead.wave,
          }, true)
        }
      }

      const bassHit = this.bassAt(step, noteBeats)
      if (bassHit) {
        renderSample(channelData, sampleRate, bassHit.buffer, currentTime, bassHit.gain, true)
      }

      if (noteIndex % stepsPerChord === 0) {
        const chord = chords[chordIndex]
        for (const midi of chord) {
          renderNote(channelData, sampleRate, {
            frequency: midiToFreq(midi + CHORD_OCTAVE),
            startTime: currentTime,
            duration: chordLength,
            volume: 0.003 * gain * (this.profile.padGain ?? 1),
            wave,
          }, true)
        }
        chordIndex = (chordIndex + 1) % chords.length
      }
    }

    return buffer
  }


  stopBackgroundMusic(): void {
    // Tear down a looping bed and any HTML5 element even if isPlaying is
    // still false (mobile sets that flag only after play() resolves).
    this.stopLoopBed()
    if (this.html5BackgroundAudio) {
      this.html5BackgroundAudio.pause()
      this.html5BackgroundAudio.currentTime = 0
      this.html5BackgroundAudio = null
    }

    if (!this.backgroundMusic.isPlaying) return
    this.backgroundMusic.isPlaying = false

    if (this.backgroundMusic.gainNode) {
      try {
        this.backgroundMusic.gainNode.disconnect()
      } catch {
        // Already disconnected.
      }
      this.backgroundMusic.gainNode = null
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
            // Silent failure for context resume — HTML5 path may still work.
            this.startBackgroundMusic()
          })
        } else if (context.state === 'running') {
          this.startBackgroundMusic()
        } else {
          this.startBackgroundMusic()
        }
      } else {
        this.startBackgroundMusic()
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
