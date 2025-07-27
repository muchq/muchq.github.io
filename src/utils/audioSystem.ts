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
  }

  initAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
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

    frequencies.forEach((freq, _index) => {
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
    if (this.backgroundMusic.isPlaying || !this.soundEnabled) return

    // Initialize audio context if needed
    const context = this.initAudioContext()
    if (!context) return

    // Create master gain node for background music
    this.backgroundMusic.gainNode = context.createGain()
    this.backgroundMusic.gainNode.gain.setValueAtTime(0.1, context.currentTime) // Much quieter
    this.backgroundMusic.gainNode.connect(context.destination)

    this.backgroundMusic.isPlaying = true
    this.backgroundMusic.nextNoteTime = context.currentTime
    this.backgroundMusic.noteIndex = 0
    this.backgroundMusic.chordIndex = 0

    this.scheduleNextMusicNotes()
    console.log('🎵 Started simple background music')
  }

  stopBackgroundMusic(): void {
    if (!this.backgroundMusic.isPlaying) return

    this.backgroundMusic.isPlaying = false

    // Clean up gain node
    if (this.backgroundMusic.gainNode) {
      this.backgroundMusic.gainNode.disconnect()
      this.backgroundMusic.gainNode = null
    }

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

    const soundToggle = document.getElementById('sound-toggle')
    if (!soundToggle) return

    if (this.soundEnabled) {
      soundToggle.textContent = '🔊 Sound: ON'
      soundToggle.classList.add('enabled')

      // Initialize and resume audio context if needed (mobile compatibility)
      const context = this.initAudioContext()
      if (context && context.state === 'suspended') {
        context.resume().then(() => {
          this.startBackgroundMusic()
        })
      } else {
        this.startBackgroundMusic()
      }
    } else {
      soundToggle.textContent = '🔇 Sound: OFF'
      soundToggle.classList.remove('enabled')
      this.stopBackgroundMusic()
    }
  }
}