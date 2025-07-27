import type { AudioSystem as IAudioSystem } from '@/types/game'

// Simple melody pattern - just peaceful arpeggios
const melodyPattern: number[] = [
  60, 64, 67, 72, // C E G C' (simple arpeggio)
  67, 71, 74, 79, // G B D G'
  57, 60, 64, 69, // A C E A'
  65, 69, 72, 77  // F A C F'
]

// Simple chord progression (I-V-vi-IV in C major)
const chordProgression: number[][] = [
  [60, 64, 67], // C major
  [67, 71, 74], // G major
  [57, 60, 64], // A minor
  [65, 69, 72]  // F major
]

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
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
  private isMobile: boolean
  private html5BackgroundAudio: HTMLAudioElement | null
  private mobileBounceAudioUrl: string | null

  constructor() {
    this.audioContext = null
    this.soundEnabled = false
    this.lastBounceTime = 0
    this.notesPlayedCount = 0
    this.backgroundMusic = {
      isPlaying: false,
      gainNode: null,
      nextNoteTime: 0,
      tempo: 60, // Slower, more relaxed
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
      
      // Use a fixed frequency for consistent bounce sound
      const frequency = 250 // Fixed frequency for consistency
      
      for (let i = 0; i < samples; i++) {
        const time = i / sampleRate
        const envelope = Math.exp(-time * 30) // Quick decay
        channelData[i] = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.1
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

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, startTime)

      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.1)
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

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(freq, startTime)

        const volume = 0.02 // Quieter chords
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.2)
        gainNode.gain.setValueAtTime(volume, startTime + duration - 0.5)
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
    const secondsPerBeat = 60.0 / this.backgroundMusic.tempo
    const noteLength = secondsPerBeat * 2 // Half notes
    const chordLength = secondsPerBeat * 8 // Very long chords

    // Schedule ahead by 200ms
    while (this.backgroundMusic.nextNoteTime < currentTime + 0.2) {
      // Play melody note occasionally (30% chance)
      if (Math.random() < 0.3) {
        const melodyMidi = melodyPattern[this.backgroundMusic.noteIndex]
        const melodyFreq = midiToFreq(melodyMidi)
        this.createSimpleNote(melodyFreq, this.backgroundMusic.nextNoteTime, noteLength * 1.5)
      }

      // Play chord every 8 beats
      if (this.backgroundMusic.noteIndex % 4 === 0) {
        const chord = chordProgression[this.backgroundMusic.chordIndex]
        const chordFreqs = chord.map(midi => midiToFreq(midi - 12))
        this.createSimpleChord(chordFreqs, this.backgroundMusic.nextNoteTime, chordLength)

        this.backgroundMusic.chordIndex = (this.backgroundMusic.chordIndex + 1) % chordProgression.length
      }

      // Advance to next note
      this.backgroundMusic.nextNoteTime += noteLength
      this.backgroundMusic.noteIndex = (this.backgroundMusic.noteIndex + 1) % melodyPattern.length
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
    
    // Use the same melody and chord patterns as Web Audio version
    const tempo = 60 // Same as backgroundMusic.tempo
    const secondsPerBeat = 60.0 / tempo
    const noteLength = secondsPerBeat * 2 // Half notes
    const chordLength = secondsPerBeat * 8 // Very long chords
    
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
      // Schedule melody note occasionally (30% chance, same as Web Audio)
      if (seededRandom() < 0.3) {
        const melodyMidi = melodyPattern[noteIndex]
        const melodyFreq = midiToFreq(melodyMidi)
        this.renderNoteToBuffer(channelData, sampleRate, melodyFreq, currentTime, noteLength * 1.5, 0.005)
      }
      
      // Play chord every 4 beats (same as Web Audio)
      if (noteIndex % 4 === 0) {
        const chord = chordProgression[chordIndex]
        chord.forEach(midi => {
          const chordFreq = midiToFreq(midi - 12) // Same octave offset as Web Audio
          this.renderNoteToBuffer(channelData, sampleRate, chordFreq, currentTime, chordLength, 0.003)
        })
        chordIndex = (chordIndex + 1) % chordProgression.length
      }
      
      // Advance to next note (same logic as Web Audio)
      currentTime += noteLength
      noteIndex = (noteIndex + 1) % melodyPattern.length
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
    volume: number
  ): void {
    const startSample = Math.floor(startTime * sampleRate)
    const durationSamples = Math.floor(duration * sampleRate)
    const endSample = Math.min(startSample + durationSamples, channelData.length)
    
    for (let i = startSample; i < endSample; i++) {
      const noteTime = (i - startSample) / sampleRate
      const progress = noteTime / duration
      
      // Same envelope shape as Web Audio version
      let envelope = 0
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
      
      // Generate sine wave with envelope
      const sample = Math.sin(2 * Math.PI * frequency * noteTime) * envelope * volume
      
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

    // Simple bounce sound
    const frequency = 200 + Math.random() * 100
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.type = 'sine'

    // Quick attack and decay
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.015, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    oscillator.start(now)
    oscillator.stop(now + 0.1)
  }

  private playMobileBoingSound(): void {
    if (!this.mobileBounceAudioUrl) return
    
    try {
      const audio = new Audio(this.mobileBounceAudioUrl)
      audio.volume = 0.015
      
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