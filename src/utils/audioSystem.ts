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
  // `to` over `duration` seconds when `to` is set.
  bounce: { wave: OscillatorType; from: number; spread: number; to: number | null; duration: number }
  // Master multiplier; square waves carry more energy than sines.
  gain: number
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

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// One period of a wave at phase t in [0, 1).
function waveSample(wave: OscillatorType, phase: number): number {
  const s = Math.sin(2 * Math.PI * phase)
  if (wave === 'square') return s >= 0 ? 1 : -1
  if (wave === 'triangle') return (2 / Math.PI) * Math.asin(s)
  return s
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
    if (this.isMobile) {
      this.createMobileBounceSound()
      if (this.backgroundMusic.isPlaying) {
        this.stopBackgroundMusic()
        this.startBackgroundMusic()
      }
    }
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

      // The profile's bounce, at the middle of its spread, swept if it sweeps.
      const { bounce, gain } = this.profile
      const from = bounce.from + bounce.spread / 2
      let phase = 0
      for (let i = 0; i < samples; i++) {
        const time = i / sampleRate
        const frequency = bounce.to === null ? from : from * Math.pow(bounce.to / from, Math.min(1, time / bounce.duration))
        phase += frequency / sampleRate
        const envelope = Math.exp(-time * 30) // Quick decay
        channelData[i] = waveSample(bounce.wave, phase % 1) * envelope * 0.05 * gain
      }

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

      oscillator.connect(gainNode)
      gainNode.connect(this.backgroundMusic.gainNode)

      oscillator.start(startTime)
      oscillator.stop(startTime + duration)

      this.notesPlayedCount++
    } catch {
      // Silent failure for note creation
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

    // Schedule ahead by 200ms
    while (this.backgroundMusic.nextNoteTime < currentTime + 0.2) {
      const melodyMidi = melody[this.backgroundMusic.noteIndex]
      if (melodyMidi > 0 && Math.random() < melodyChance) {
        this.createSimpleNote(midiToFreq(melodyMidi), this.backgroundMusic.nextNoteTime, noteLength * 1.5)
      }

      if (this.backgroundMusic.noteIndex % stepsPerChord === 0) {
        const chord = chords[this.backgroundMusic.chordIndex]
        const chordFreqs = chord.map(midi => midiToFreq(midi - 12))
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
    const { melody, chords, noteBeats, chordBeats, melodyChance, wave, gain } = this.profile
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

    while (currentTime < duration) {
      const melodyMidi = melody[noteIndex]
      if (melodyMidi > 0 && seededRandom() < melodyChance) {
        this.renderNoteToBuffer(channelData, sampleRate, midiToFreq(melodyMidi), currentTime, noteLength * 1.5, 0.005 * gain, wave)
      }

      if (noteIndex % stepsPerChord === 0) {
        const chord = chords[chordIndex]
        chord.forEach(midi => {
          const chordFreq = midiToFreq(midi - 12) // Same octave offset as Web Audio
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

  private renderNoteToBuffer(
    channelData: Float32Array,
    sampleRate: number,
    frequency: number,
    startTime: number,
    duration: number,
    volume: number,
    wave: OscillatorType = 'sine'
  ): void {
    const startSample = Math.floor(startTime * sampleRate)
    const durationSamples = Math.floor(duration * sampleRate)
    const endSample = Math.min(startSample + durationSamples, channelData.length)

    for (let i = startSample; i < endSample; i++) {
      const noteTime = (i - startSample) / sampleRate
      const progress = noteTime / duration

      // Same envelope shape as Web Audio version
      let envelope: number
      if (progress < 0.1) {
        // Attack phase - linear ramp up
        envelope = progress / 0.1
      } else if (progress < 0.7) {
        // Sustain phase
        envelope = 1.0
      } else {
        // Release phase - exponential decay
        const releaseProgress = (progress - 0.7) / 0.3
        envelope = Math.exp(-releaseProgress * 5) // Exponential decay
      }

      // Generate the wave with envelope
      const sample = waveSample(wave, (frequency * noteTime) % 1) * envelope * volume

      // Add to existing sample (for chord mixing)
      channelData[i] = Math.max(-1, Math.min(1, channelData[i] + sample))
    }
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
    gainNode.gain.linearRampToValueAtTime(0.015 * gain, now + 0.01)
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
