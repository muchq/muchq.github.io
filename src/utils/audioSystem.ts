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
    
    // Initialize debug display and test button
    this.updateDebugDisplay()
    this.setupTestButton()
    
    if (this.isMobile) {
      this.initMobileAudio()
    }
  }

  private updateDebugDisplay(): void {
    // Update the debug panel with current audio status
    setTimeout(() => {
      const statusEl = document.getElementById('audio-status')
      const contextStateEl = document.getElementById('audio-context-state')
      const musicPlayingEl = document.getElementById('audio-music-playing')
      const notesCountEl = document.getElementById('audio-notes-count')
      
      if (statusEl) {
        const mode = this.isMobile ? ' (Mobile/HTML5)' : ' (Desktop/WebAudio)'
        statusEl.textContent = (this.soundEnabled ? 'Enabled' : 'Disabled') + mode
      }
      
      if (contextStateEl) {
        if (this.isMobile) {
          contextStateEl.textContent = this.html5BackgroundAudio ? 'HTML5 Ready' : 'HTML5 Not Ready'
        } else {
          contextStateEl.textContent = this.audioContext ? this.audioContext.state : 'Not Created'
        }
      }
      
      if (musicPlayingEl) {
        musicPlayingEl.textContent = this.backgroundMusic.isPlaying ? 'Yes' : 'No'
      }
      
      if (notesCountEl) {
        notesCountEl.textContent = this.notesPlayedCount.toString()
      }
    }, 10)
  }

  private initMobileAudio(): void {
    this.updateLastEvent('Initializing mobile HTML5 audio system')
    // Mobile audio will be initialized when sound is enabled
  }

  private setupTestButton(): void {
    setTimeout(() => {
      const testButton = document.getElementById('test-tone-button')
      if (testButton) {
        testButton.addEventListener('click', () => {
          this.playTestTone()
        })
      }
      
      const loudButton = document.getElementById('loud-tone-button')
      if (loudButton) {
        loudButton.addEventListener('click', () => {
          this.playLoudTone()
        })
      }
      
      // Add HTML5 Audio test button
      this.createHtml5TestButton()
    }, 100)
  }

  private createHtml5TestButton(): void {
    const debugPanel = document.getElementById('audio-debug')
    if (!debugPanel) return
    
    const html5Button = document.createElement('button')
    html5Button.textContent = '🎤 HTML5 Test'
    html5Button.className = 'test-button'
    html5Button.style.cssText = `
      margin-top: 8px;
      padding: 4px 8px;
      background: rgba(255, 182, 102, 0.2);
      border: 1px solid #ffb666;
      color: #fff;
      border-radius: 4px;
      font-family: "Lexend Deca", monospace;
      font-size: 10px;
      cursor: pointer;
      pointer-events: auto;
    `
    
    html5Button.addEventListener('click', () => {
      this.playHtml5TestSound()
    })
    
    debugPanel.appendChild(html5Button)
  }

  private playHtml5TestSound(): void {
    this.updateLastEvent('HTML5 audio test started')
    
    try {
      // Create a simple beep using data URL
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const sampleRate = audioContext.sampleRate
      const duration = 0.5 // 0.5 seconds
      const frequency = 440 // A4
      const samples = sampleRate * duration
      
      // Create audio buffer
      const buffer = audioContext.createBuffer(1, samples, sampleRate)
      const channelData = buffer.getChannelData(0)
      
      // Generate sine wave
      for (let i = 0; i < samples; i++) {
        channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5
      }
      
      // Convert to WAV and create blob URL
      const wav = this.encodeWAV(buffer)
      const blob = new Blob([wav], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      
      // Play using HTML5 Audio
      const audio = new Audio(url)
      audio.volume = 1.0
      
      audio.addEventListener('canplaythrough', () => {
        this.updateLastEvent('HTML5 audio ready, attempting play...')
        const playPromise = audio.play()
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.updateLastEvent('HTML5 audio playing successfully!')
          }).catch((error) => {
            this.updateLastEvent(`HTML5 play failed: ${error}`)
          })
        }
      })
      
      audio.addEventListener('ended', () => {
        this.updateLastEvent('HTML5 audio finished playing')
        URL.revokeObjectURL(url)
      })
      
      audio.addEventListener('error', (e) => {
        this.updateLastEvent(`HTML5 audio error: ${e}`)
        URL.revokeObjectURL(url)
      })
      
      audio.load()
      
    } catch (error) {
      this.updateLastEvent(`HTML5 test failed: ${error}`)
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

  playTestTone(): void {
    this.updateLastEvent('Test tone button clicked')
    
    if (!this.audioContext) {
      this.updateLastEvent('Creating audio context for test tone...')
      const context = this.initAudioContext()
      if (!context) {
        this.updateLastEvent('Failed to create audio context for test tone')
        return
      }
      this.updateLastEvent(`Audio context created with state: ${context.state}`)
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.updateLastEvent('Audio context is suspended, attempting resume...')
      this.audioContext.resume().then(() => {
        this.updateLastEvent(`Context resumed successfully to: ${this.audioContext?.state}`)
        // Wait a bit for mobile browsers to fully process the resume
        setTimeout(() => {
          this.updateLastEvent('Starting test tone after resume delay...')
          this.createTestTone()
        }, 50)
      }).catch((error) => {
        this.updateLastEvent(`Test tone resume failed: ${error}`)
      })
    } else if (this.audioContext && this.audioContext.state === 'running') {
      this.updateLastEvent('Context already running, creating test tone immediately')
      this.createTestTone()
    } else {
      this.updateLastEvent(`Unexpected context state: ${this.audioContext?.state || 'undefined'}`)
    }
  }

  private createTestTone(): void {
    if (!this.audioContext) {
      this.updateLastEvent('No audio context for test tone')
      return
    }

    this.updateLastEvent(`Creating test tone - context state: ${this.audioContext.state}`)

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      // Check if nodes were created successfully
      if (!oscillator || !gainNode) {
        this.updateLastEvent('Failed to create oscillator or gain node')
        return
      }

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      // More aggressive test tone for mobile
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime) // A4 note
      oscillator.type = 'sine'

      // Higher volume for mobile
      const startTime = this.audioContext.currentTime
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01) // Louder
      gainNode.gain.setValueAtTime(0.3, startTime + 0.8)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 1)

      oscillator.start(startTime)
      oscillator.stop(startTime + 1)

      this.notesPlayedCount++
      this.updateLastEvent(`Test tone scheduled - vol: 0.3, freq: 440Hz`)
      this.updateDebugDisplay()

      // Set a timeout to check if it actually played
      setTimeout(() => {
        this.updateLastEvent(`Test tone should have finished playing`)
      }, 1100)
      
    } catch (error) {
      this.updateLastEvent(`Test tone error: ${error}`)
    }
  }

  playLoudTone(): void {
    this.updateLastEvent('LOUD tone button clicked')
    
    if (!this.audioContext) {
      this.updateLastEvent('Creating audio context for LOUD tone...')
      const context = this.initAudioContext()
      if (!context) {
        this.updateLastEvent('Failed to create audio context for LOUD tone')
        return
      }
      this.updateLastEvent(`Audio context created with state: ${context.state}`)
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.updateLastEvent('Audio context is suspended, attempting resume...')
      this.audioContext.resume().then(() => {
        this.updateLastEvent(`Context resumed successfully to: ${this.audioContext?.state}`)
        setTimeout(() => {
          this.updateLastEvent('Starting LOUD tone after resume delay...')
          this.createLoudTone()
        }, 50)
      }).catch((error) => {
        this.updateLastEvent(`LOUD tone resume failed: ${error}`)
      })
    } else if (this.audioContext && this.audioContext.state === 'running') {
      this.updateLastEvent('Context already running, creating LOUD tone immediately')
      this.createLoudTone()
    } else {
      this.updateLastEvent(`Unexpected context state: ${this.audioContext?.state || 'undefined'}`)
    }
  }

  private createLoudTone(): void {
    if (!this.audioContext) {
      this.updateLastEvent('No audio context for LOUD tone')
      return
    }

    this.updateLastEvent(`Creating LOUD tone - context state: ${this.audioContext.state}`)

    try {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      if (!oscillator || !gainNode) {
        this.updateLastEvent('Failed to create oscillator or gain node for LOUD tone')
        return
      }

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      // Maximum volume LOUD tone for mobile testing
      oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime) // A5 note (higher pitch)
      oscillator.type = 'square' // More aggressive waveform

      // MAXIMUM volume
      const startTime = this.audioContext.currentTime
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(1.0, startTime + 0.01) // Maximum volume (1.0)
      gainNode.gain.setValueAtTime(1.0, startTime + 0.8)
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 1)

      oscillator.start(startTime)
      oscillator.stop(startTime + 1)

      this.notesPlayedCount++
      this.updateLastEvent(`LOUD tone scheduled - vol: 1.0, freq: 880Hz, wave: square`)
      this.updateDebugDisplay()

      setTimeout(() => {
        this.updateLastEvent(`LOUD tone should have finished playing`)
      }, 1100)
      
    } catch (error) {
      this.updateLastEvent(`LOUD tone error: ${error}`)
    }
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
    if (!this.audioContext || !this.backgroundMusic.gainNode) {
      this.updateLastEvent('createSimpleNote failed - no context or gain node')
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
      this.updateDebugDisplay()
    } catch (error) {
      this.updateLastEvent(`Note creation failed: ${error}`)
    }
  }

  private createSimpleChord(frequencies: number[], startTime: number, duration: number): void {
    if (!this.audioContext || !this.backgroundMusic.gainNode) {
      this.updateLastEvent('createSimpleChord failed - no context or gain node')
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
      this.updateDebugDisplay()
    } catch (error) {
      this.updateLastEvent(`Chord creation failed: ${error}`)
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
    this.updateLastEvent(`Starting music - enabled: ${this.soundEnabled}, playing: ${this.backgroundMusic.isPlaying}`)
    
    if (this.backgroundMusic.isPlaying || !this.soundEnabled) {
      this.updateLastEvent('Music start blocked - already playing or disabled')
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

  private startMobileBackgroundMusic(): void {
    this.updateLastEvent('Starting mobile background music...')
    
    try {
      // Create a simple looping background music track
      const musicBuffer = this.createMobileBackgroundTrack()
      const blob = new Blob([musicBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      
      this.html5BackgroundAudio = new Audio(url)
      this.html5BackgroundAudio.loop = true
      this.html5BackgroundAudio.volume = 0.3
      
      this.html5BackgroundAudio.addEventListener('canplaythrough', () => {
        this.updateLastEvent('Mobile background music ready, starting...')
        if (this.html5BackgroundAudio) {
          const playPromise = this.html5BackgroundAudio.play()
          if (playPromise !== undefined) {
            playPromise.then(() => {
              this.backgroundMusic.isPlaying = true
              this.updateLastEvent('Mobile background music playing!')
              this.updateDebugDisplay()
            }).catch((error) => {
              this.updateLastEvent(`Mobile music play failed: ${error}`)
            })
          }
        }
      })
      
      this.html5BackgroundAudio.addEventListener('error', (e) => {
        this.updateLastEvent(`Mobile music error: ${e}`)
      })
      
      this.html5BackgroundAudio.load()
      
    } catch (error) {
      this.updateLastEvent(`Mobile music creation failed: ${error}`)
    }
  }

  private createMobileBackgroundTrack(): ArrayBuffer {
    // Create a simple 4-second looping track with peaceful tones
    const sampleRate = 44100
    const duration = 4 // seconds
    const samples = sampleRate * duration
    
    // Create a temporary audio context just for generating the audio
    const tempContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const buffer = tempContext.createBuffer(1, samples, sampleRate)
    const channelData = buffer.getChannelData(0)
    
    // Generate simple background music - soft arpeggios
    const frequencies = [261.63, 329.63, 392.00, 523.25] // C, E, G, C (one octave)
    const noteDuration = sampleRate * 0.5 // 0.5 seconds per note
    
    for (let i = 0; i < samples; i++) {
      const noteIndex = Math.floor(i / noteDuration) % frequencies.length
      const frequency = frequencies[noteIndex]
      const noteTime = (i % noteDuration) / sampleRate
      
      // Soft sine wave with gentle envelope
      const envelope = Math.sin(noteTime * Math.PI) * 0.15 // Gentle attack/decay
      channelData[i] = Math.sin(2 * Math.PI * frequency * noteTime) * envelope
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
      this.updateLastEvent('Mobile background music stopped')
    } else {
      // Clean up Web Audio gain node
      if (this.backgroundMusic.gainNode) {
        this.backgroundMusic.gainNode.disconnect()
        this.backgroundMusic.gainNode = null
      }
      this.updateLastEvent('Desktop background music stopped')
    }

    this.updateDebugDisplay()
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
    try {
      // Create a quick bounce sound
      const sampleRate = 44100
      const duration = 0.1 // 100ms
      const samples = Math.floor(sampleRate * duration)
      
      const tempContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const buffer = tempContext.createBuffer(1, samples, sampleRate)
      const channelData = buffer.getChannelData(0)
      
      const frequency = 200 + Math.random() * 100
      
      for (let i = 0; i < samples; i++) {
        const time = i / sampleRate
        const envelope = Math.exp(-time * 30) // Quick decay
        channelData[i] = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.3
      }
      
      const wav = this.encodeWAV(buffer)
      const blob = new Blob([wav], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      
      const audio = new Audio(url)
      audio.volume = 0.5
      
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Silently fail - bounce sounds are not critical
        })
      }
      
      // Clean up after playing
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url)
      })
      
    } catch {
      // Silently fail for bounce sounds
    }
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