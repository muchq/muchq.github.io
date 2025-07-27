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

  constructor() {
    this.audioContext = null
    this.soundEnabled = false
    this.lastBounceTime = 0
    this.backgroundMusic = {
      isPlaying: false,
      gainNode: null,
      nextNoteTime: 0,
      tempo: 60, // Slower, more relaxed
      noteIndex: 0,
      chordIndex: 0
    }
    
    // Initialize debug display
    this.updateDebugDisplay()
  }

  private updateDebugDisplay(): void {
    // Update the debug panel with current audio status
    setTimeout(() => {
      const statusEl = document.getElementById('audio-status')
      const contextStateEl = document.getElementById('audio-context-state')
      const musicPlayingEl = document.getElementById('audio-music-playing')
      
      if (statusEl) {
        statusEl.textContent = this.soundEnabled ? 'Enabled' : 'Disabled'
      }
      
      if (contextStateEl) {
        contextStateEl.textContent = this.audioContext ? this.audioContext.state : 'Not Created'
      }
      
      if (musicPlayingEl) {
        musicPlayingEl.textContent = this.backgroundMusic.isPlaying ? 'Yes' : 'No'
      }
    }, 10)
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
      
      this.updateLastEvent('Silent test sound played')
    } catch (error) {
      this.updateLastEvent(`Test sound failed: ${error}`)
    }
  }

  private updateLastEvent(message: string): void {
    const lastEventEl = document.getElementById('audio-last-event')
    if (lastEventEl) {
      lastEventEl.textContent = message
    }
  }

  initAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return this.audioContext
  }


  private createSimpleNote(frequency: number, startTime: number, duration: number, volume: number = 0.03): void {
    if (!this.audioContext || !this.backgroundMusic.gainNode) return

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
  }

  private createSimpleChord(frequencies: number[], startTime: number, duration: number): void {
    if (!this.audioContext || !this.backgroundMusic.gainNode) return

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
    })
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
    this.updateLastEvent(`Starting music - enabled: ${this.soundEnabled}, playing: ${this.backgroundMusic.isPlaying}`)
    
    if (this.backgroundMusic.isPlaying || !this.soundEnabled) {
      this.updateLastEvent('Music start blocked - already playing or disabled')
      return
    }

    // Initialize audio context if needed
    const context = this.initAudioContext()
    if (!context) {
      this.updateLastEvent('Failed to get audio context')
      return
    }

    this.updateLastEvent(`Starting music with context state: ${context.state}`)

    // Create master gain node for background music
    this.backgroundMusic.gainNode = context.createGain()
    this.backgroundMusic.gainNode.gain.setValueAtTime(0.1, context.currentTime) // Much quieter
    this.backgroundMusic.gainNode.connect(context.destination)

    this.backgroundMusic.isPlaying = true
    this.backgroundMusic.nextNoteTime = context.currentTime
    this.backgroundMusic.noteIndex = 0
    this.backgroundMusic.chordIndex = 0

    this.scheduleNextMusicNotes()
    this.updateLastEvent('Background music started successfully')
    this.updateDebugDisplay()
  }

  stopBackgroundMusic(): void {
    if (!this.backgroundMusic.isPlaying) return

    this.backgroundMusic.isPlaying = false

    // Clean up gain node
    if (this.backgroundMusic.gainNode) {
      this.backgroundMusic.gainNode.disconnect()
      this.backgroundMusic.gainNode = null
    }

    // eslint-disable-next-line no-console
    console.log('🎵 Stopped background music')
  }

  playBoingSound(): void {
    if (!this.soundEnabled || !this.audioContext) return

    const now = this.audioContext.currentTime
    
    // Throttle bounce sounds
    if (now - this.lastBounceTime < 0.2) return
    this.lastBounceTime = now

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

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled
    this.updateLastEvent('Sound toggle clicked')

    const soundToggle = document.getElementById('sound-toggle')
    if (!soundToggle) {
      this.updateLastEvent('Sound button not found!')
      return
    }

    if (this.soundEnabled) {
      soundToggle.textContent = '🔊 Sound: ON'
      soundToggle.classList.add('enabled')
      this.updateLastEvent('Enabling sound...')

      // Initialize audio context on user interaction (mobile requirement)
      const context = this.initAudioContext()
      if (context) {
        this.updateLastEvent(`Context created, state: ${context.state}`)
        
        if (context.state === 'suspended') {
          this.updateLastEvent('Resuming suspended context...')
          context.resume().then(() => {
            this.updateLastEvent('Context resumed successfully')
            
            // Play silent sound first for iOS compatibility
            this.testAudioWithSilentSound()
            
            // Start background music after a brief delay
            setTimeout(() => {
              this.startBackgroundMusic()
              this.updateDebugDisplay()
            }, 100)
          }).catch((error) => {
            this.updateLastEvent(`Resume failed: ${error}`)
          })
        } else if (context.state === 'running') {
          this.updateLastEvent('Context already running')
          this.startBackgroundMusic()
        } else {
          this.updateLastEvent(`Unexpected state: ${context.state}`)
        }
      } else {
        this.updateLastEvent('Failed to create audio context')
      }
    } else {
      soundToggle.textContent = '🔇 Sound: OFF'
      soundToggle.classList.remove('enabled')
      this.updateLastEvent('Sound disabled')
      this.stopBackgroundMusic()
    }
    
    this.updateDebugDisplay()
  }
}