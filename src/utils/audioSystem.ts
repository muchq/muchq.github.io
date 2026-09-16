import type { AudioSystem as IAudioSystem } from '@/types/game'

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
  pulse?: { from: number; to: number; duration: number; beats: number; gain: number }
  // A lowpass each melody note is plucked through, falling from `from`
  // to `to` hertz over `seconds`. The sweep is the sound, not the note.
  filter?: { from: number; to: number; seconds: number; q: number }
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

// A cartridge: square waves, a brisk original hop in C major with rests
// on the off-beats, power chords under it, and a rising jump blip.
export const CHIPTUNE_SOUND: SoundProfile = {
  wave: 'square',
  tempo: 150,
  noteBeats: 0.5,
  chordBeats: 2,
  melodyChance: 1,
  melody: [
    67, 72, 0, 74, 76, 0, 74, 72, // G C  . D E . D C
    69, 0, 72, 69, 67, 0, 64, 0, // A . C A G . E .
    65, 69, 0, 72, 74, 0, 72, 69, // F A . C D . C A
    67, 0, 71, 74, 79, 0, 76, 0, // G . B D G' . E .
  ],
  chords: [
    [48, 55], // C
    [53, 60], // F
    [55, 62], // G
    [48, 55], // C
  ],
  bounce: { wave: 'square', from: 330, spread: 0, to: 990, duration: 0.12 },
  gain: 0.45,
}

// Industrial hard techno, in the Ueberrest vein: fast, dark, and built
// out of repetition rather than melody. The riff sits two octaves below
// where a lead would, hammering a handful of notes through a filter
// that slams shut on each one; the pad is a sub-heavy power drone; the
// kick is the loudest thing in the room. Minimal on purpose — it
// repeats for as long as you stay.
export const TECHNO_SOUND: SoundProfile = {
  wave: 'sawtooth',
  tempo: 146,
  noteBeats: 0.25,
  // A bar each, so the drone changes where the riff does.
  chordBeats: 4,
  melodyChance: 1,
  melody: [
    45, 0, 45, 0, 52, 0, 45, 48, // A  . A  . E . A  C
    0, 45, 0, 52, 45, 0, 48, 0, //  . A  . E  A . C  .
    43, 0, 43, 0, 50, 0, 43, 47, // G  . G  . D . G  B
    0, 43, 0, 50, 43, 0, 47, 0, //  . G  . D  G . B  .
  ],
  // Written an octave above what they sound, like every profile's.
  chords: [
    [45, 57, 60, 64], // A minor, sounding A1 A2 C3 E3
    [43, 55, 59, 62], // G major, sounding G1 G2 B2 D3
  ],
  // A landing is a dull thud down where the kick lives, not a chirp
  // over the top of it. It was 1800Hz, which read as a squeak and cut
  // through everything else in the room.
  bounce: { wave: 'triangle', from: 240, spread: 40, to: 90, duration: 0.09, gain: 0.3 },
  pulse: { from: 190, to: 38, duration: 0.19, beats: 1, gain: 0.85 },
  filter: { from: 1700, to: 190, seconds: 0.11, q: 14 },
  gain: 0.5,
}

// Chords sound an octave below where a profile writes them, so a pad
// sits under its own melody without every profile spelling it. Both
// renderers owe the same offset, and a profile has to be read knowing
// it: written A2 is a sounding A1.
export const CHORD_OCTAVE = -12

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
    const envelope = Math.exp(-time * 30)
    channelData[i] = waveSample(bounce.wave, phase % 1) * envelope * 0.05 * gain * bounceGain(bounce)
  }
}

// How loud a landing is against its room; absent is unchanged.
export function bounceGain(bounce: SoundProfile['bounce']): number {
  return bounce.gain ?? 1
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
  }
  lastBounceTime: number
  notesPlayedCount: number
  profile: SoundProfile
  private isMobile: boolean
  private html5BackgroundAudio: HTMLAudioElement | null
  private mobileBounceAudioUrl: string | null

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
      chordIndex: 0
    }

    // Detect mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024
    this.html5BackgroundAudio = null
    this.mobileBounceAudioUrl = null

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
    // The step already queued belongs to the tune being left, and a slow
    // one can be seconds out. Walking into a room should not be walking
    // into silence, so the next step is due now.
    const clock = this.audioContext?.currentTime ?? 0
    this.backgroundMusic.nextNoteTime = Math.min(this.backgroundMusic.nextNoteTime, clock)
    this.retireVoices(clock)
    if (this.isMobile) {
      this.createMobileBounceSound()
      if (this.backgroundMusic.isPlaying) {
        this.stopBackgroundMusic()
        this.startBackgroundMusic()
      }
    }
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
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
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

  // The kick: a short drop from a click to a thud. Its own sine, under
  // everything, so the melody's wave and filter never touch it.
  private createPulse(startTime: number): void {
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
    const { melody, chords, noteBeats, chordBeats, melodyChance, pulse } = this.profile
    const secondsPerBeat = 60.0 / this.backgroundMusic.tempo
    const noteLength = secondsPerBeat * noteBeats
    const chordLength = secondsPerBeat * chordBeats
    const stepsPerChord = Math.max(1, Math.round(chordBeats / noteBeats))
    const stepsPerPulse = pulse ? Math.max(1, Math.round(pulse.beats / noteBeats)) : 0

    // Schedule ahead by 200ms
    while (this.backgroundMusic.nextNoteTime < currentTime + 0.2) {
      if (stepsPerPulse > 0 && this.backgroundMusic.noteIndex % stepsPerPulse === 0) {
        this.createPulse(this.backgroundMusic.nextNoteTime)
      }

      const melodyMidi = melody[this.backgroundMusic.noteIndex]
      if (melodyMidi > 0 && Math.random() < melodyChance) {
        this.createSimpleNote(midiToFreq(melodyMidi), this.backgroundMusic.nextNoteTime, noteLength * 1.5)
      }

      if (this.backgroundMusic.noteIndex % stepsPerChord === 0) {
        const chord = chords[this.backgroundMusic.chordIndex]
        const chordFreqs = chord.map(midi => midiToFreq(midi + CHORD_OCTAVE))
        this.createSimpleChord(chordFreqs, this.backgroundMusic.nextNoteTime, chordLength)

        this.backgroundMusic.chordIndex = (this.backgroundMusic.chordIndex + 1) % chords.length
      }

      // Advance to next note
      this.backgroundMusic.nextNoteTime += noteLength
      this.backgroundMusic.noteIndex = (this.backgroundMusic.noteIndex + 1) % melody.length
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
    // Create a longer track that matches the Web Audio procedural generation
    const sampleRate = 44100
    const duration = 32 // 32 seconds - enough for full chord progression cycle
    const samples = sampleRate * duration

    // Create a temporary audio context just for generating the audio
    const tempContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const buffer = tempContext.createBuffer(1, samples, sampleRate)
    const channelData = buffer.getChannelData(0)

    // The same profile the Web Audio version plays
    const { melody, chords, noteBeats, chordBeats, melodyChance, wave, gain, pulse, filter } = this.profile
    const secondsPerBeat = 60.0 / this.profile.tempo
    const noteLength = secondsPerBeat * noteBeats
    const chordLength = secondsPerBeat * chordBeats
    const stepsPerChord = Math.max(1, Math.round(chordBeats / noteBeats))

    // Pre-render the procedural music pattern
    let currentTime = 0
    let noteIndex = 0
    let chordIndex = 0

    // Use a seeded random for consistent generation
    let seed = 12345 // Fixed seed for consistent audio
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    const stepsPerPulse = pulse ? Math.max(1, Math.round(pulse.beats / noteBeats)) : 0

    while (currentTime < duration) {
      if (stepsPerPulse > 0 && noteIndex % stepsPerPulse === 0 && pulse) {
        this.renderPulseToBuffer(channelData, sampleRate, currentTime, pulse, gain)
      }

      const melodyMidi = melody[noteIndex]
      if (melodyMidi > 0 && seededRandom() < melodyChance) {
        this.renderNoteToBuffer(channelData, sampleRate, midiToFreq(melodyMidi), currentTime, noteLength * 1.5, 0.005 * gain, wave, filter)
      }

      if (noteIndex % stepsPerChord === 0) {
        const chord = chords[chordIndex]
        chord.forEach(midi => {
          const chordFreq = midiToFreq(midi + CHORD_OCTAVE)
          this.renderNoteToBuffer(channelData, sampleRate, chordFreq, currentTime, chordLength, 0.003 * gain, wave)
        })
        chordIndex = (chordIndex + 1) % chords.length
      }

      // Advance to next note (same logic as Web Audio)
      currentTime += noteLength
      noteIndex = (noteIndex + 1) % melody.length
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

  private renderPulseToBuffer(
    channelData: Float32Array,
    sampleRate: number,
    startTime: number,
    pulse: NonNullable<SoundProfile['pulse']>,
    gain: number
  ): void {
    renderPulse(channelData, sampleRate, startTime, pulse, gain)
  }

  private renderNoteToBuffer(
    channelData: Float32Array,
    sampleRate: number,
    frequency: number,
    startTime: number,
    duration: number,
    volume: number,
    wave: OscillatorType = 'sine',
    filter?: SoundProfile['filter']
  ): void {
    renderNote(channelData, sampleRate, { frequency, startTime, duration, volume, wave, filter })
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

    // Quick attack and decay
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.015 * gain * bounceGain(bounce), now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + bounce.duration)

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
