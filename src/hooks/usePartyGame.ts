import { useState, useEffect, useRef, useCallback } from 'react'

interface Barge {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  angle: number
  thrust: number
  maxSpeed: number
  friction: number
}

interface Guest {
  x: number
  y: number
  offsetX: number
  offsetY: number
  bounce: number
  bounceSpeed: number
  color: string
}

interface Rescuable {
  x: number
  y: number
  wave: number
  rescued: boolean
  type: 'person' | 'wreck'
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

interface Cactus {
  x: number
  y: number
  size: number
}

interface Camera {
  x: number
  y: number
  targetX: number
  targetY: number
}

interface GameState {
  barge: Barge
  guests: Guest[]
  rescuables: Rescuable[]
  particles: Particle[]
  obstacles: Cactus[]
  funLevel: number
  score: number
  gameRunning: boolean
  gameOver: boolean
  camera: Camera
  worldWidth: number
  worldHeight: number
  lastBoostTime: number
}

export const usePartyGame = (canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
  const [gameState, setGameState] = useState<GameState>({
    barge: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      width: 80,
      height: 40,
      angle: 0,
      thrust: 0.6, // Slightly higher for mobile responsiveness
      maxSpeed: 6, // Slightly higher for mobile
      friction: 0.95
    },
    guests: [],
    rescuables: [],
    particles: [],
    obstacles: [],
    funLevel: 100,
    score: 0,
    gameRunning: false,
    gameOver: false,
    camera: {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0
    },
    worldWidth: 0,
    worldHeight: 0,
    lastBoostTime: 0
  })
  
  const keysRef = useRef<Record<string, boolean>>({})
  const animationIdRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const conversationGainNodeRef = useRef<GainNode | null>(null)
  const musicPlayingRef = useRef<boolean>(false)
  const isMobile = useRef<boolean>(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 769
  )
  const html5BackgroundAudio = useRef<HTMLAudioElement | null>(null)

  const handleMobileInput = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'boost', isPressed: boolean) => {
    // Prevent event stacking by explicitly setting the state
    switch (direction) {
      case 'up':
        keysRef.current['ArrowUp'] = isPressed
        keysRef.current['w'] = isPressed
        break
      case 'down':
        keysRef.current['ArrowDown'] = isPressed
        keysRef.current['s'] = isPressed
        break
      case 'left':
        keysRef.current['ArrowLeft'] = isPressed
        keysRef.current['a'] = isPressed
        break
      case 'right':
        keysRef.current['ArrowRight'] = isPressed
        keysRef.current['d'] = isPressed
        break
      case 'boost':
        keysRef.current[' '] = isPressed
        break
    }
  }, [])

  const encodeWAV = useCallback((buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)
    const channelData = buffer.getChannelData(0)

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

    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      view.setInt16(offset, sample * 0x7FFF, true)
      offset += 2
    }

    return arrayBuffer
  }, [])

  const createMobileBackgroundTrack = useCallback((): ArrayBuffer => {
    const sampleRate = 44100
    const duration = 32
    const samples = sampleRate * duration
    
    const tempContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const buffer = tempContext.createBuffer(1, samples, sampleRate)
    const channelData = buffer.getChannelData(0)
    
    // Jazz chord progressions (same as in original game)
    const chords = [
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [196.00, 246.94, 293.66, 349.23], // G7
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
      [110.00, 130.81, 164.81, 196.00], // Am7
    ]
    
    const melodyScale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]
    const bpm = 70
    const beatLength = 60 / bpm
    
    let currentTime = 0
    let chordIndex = 0
    
    while (currentTime < duration - 4) {
      const chord = chords[chordIndex]
      const startSample = Math.floor(currentTime * sampleRate)
      const chordDuration = beatLength * 4
      const durationSamples = Math.floor(chordDuration * sampleRate)
      
      // Add chord notes
      chord.forEach(freq => {
        for (let i = 0; i < durationSamples && startSample + i < samples; i++) {
          const time = i / sampleRate
          const envelope = Math.exp(-time * 0.5) * 0.02
          channelData[startSample + i] += Math.sin(2 * Math.PI * freq * time) * envelope
        }
      })
      
      // Add occasional melody
      if (Math.random() < 0.3) {
        const melodyFreq = melodyScale[Math.floor(Math.random() * melodyScale.length)]
        const melodyStart = startSample + Math.floor(Math.random() * durationSamples * 0.5)
        const melodyDuration = Math.floor(beatLength * sampleRate * 0.5)
        
        for (let i = 0; i < melodyDuration && melodyStart + i < samples; i++) {
          const time = i / sampleRate
          const envelope = Math.exp(-time * 2) * 0.01
          channelData[melodyStart + i] += Math.sin(2 * Math.PI * melodyFreq * time) * envelope
        }
      }
      
      currentTime += chordDuration
      chordIndex = (chordIndex + 1) % chords.length
    }
    
    return encodeWAV(buffer)
  }, [encodeWAV])

  const initMobileAudio = useCallback(() => {
    try {
      // Create audio context for mobile
      const AudioContextClass = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass()
      }

      // Create HTML5 audio for background music on mobile
      const musicBuffer = createMobileBackgroundTrack()
      const blob = new Blob([musicBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)

      html5BackgroundAudio.current = new Audio(url)
      html5BackgroundAudio.current.loop = true
      html5BackgroundAudio.current.volume = 0.1
    } catch (error) {
      console.warn('Failed to initialize mobile audio:', error)
    }
  }, [createMobileBackgroundTrack])

  const initWebAudio = useCallback(() => {
    if (audioContextRef.current) return

    try {
      const AudioContextClass = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass()

        // Resume if suspended (browser autoplay policy)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume()
        }

        // Set up gain nodes for volume control
        gainNodeRef.current = audioContextRef.current.createGain()
        gainNodeRef.current.gain.value = 0.15 // Overall volume
        gainNodeRef.current.connect(audioContextRef.current.destination)

        conversationGainNodeRef.current = audioContextRef.current.createGain()
        conversationGainNodeRef.current.gain.value = 0.05 // Conversation volume
        conversationGainNodeRef.current.connect(audioContextRef.current.destination)
      }
    } catch (error) {
      console.warn('Failed to initialize Web Audio:', error)
    }
  }, [])

  const initAudio = useCallback(() => {
    if (isMobile.current) {
      return initMobileAudio()
    } else {
      return initWebAudio()
    }
  }, [initMobileAudio, initWebAudio])

  // 8-bit style oscillator with envelope
  const play8BitNote = useCallback((frequency: number, startTime: number, duration: number, type: OscillatorType = 'square', gainTarget?: GainNode) => {
    if (!audioContextRef.current || !gainNodeRef.current) return

    const target = gainTarget || gainNodeRef.current
    const osc = audioContextRef.current.createOscillator()
    const noteGain = audioContextRef.current.createGain()

    osc.type = type
    osc.frequency.value = frequency

    // ADSR envelope for 8-bit feel
    noteGain.gain.setValueAtTime(0, startTime)
    noteGain.gain.linearRampToValueAtTime(0.3, startTime + 0.01) // Attack
    noteGain.gain.linearRampToValueAtTime(0.2, startTime + 0.05) // Decay
    noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration) // Release

    osc.connect(noteGain)
    noteGain.connect(target)

    osc.start(startTime)
    osc.stop(startTime + duration)
  }, [])

  const startMobileSoundtrack = useCallback(() => {
    if (!html5BackgroundAudio.current) return

    musicPlayingRef.current = true

    // Resume audio context if suspended (mobile requirement)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }

    const playPromise = html5BackgroundAudio.current.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Silent failure for mobile audio
        musicPlayingRef.current = false
      })
    }
  }, [])

  const startWebSoundtrack = useCallback(() => {
    if (!audioContextRef.current || musicPlayingRef.current) return

    // Resume audio context if it's suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch((error) => {
        console.warn('Failed to resume audio context:', error)
      })
    }

    musicPlayingRef.current = true

    // Jazz chord progressions (ii-V-I in C major)
    const chords = [
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [196.00, 246.94, 293.66, 349.23], // G7
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
      [110.00, 130.81, 164.81, 196.00], // Am7
    ]

    // Melody notes for jazzy licks
    const melodyScale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25] // C major scale

    const bpm = 70 // Slow, chill tempo
    const beatLength = 60 / bpm
    let currentTime = audioContextRef.current.currentTime

    // Main music loop
    const scheduleMusic = () => {
      if (!musicPlayingRef.current || !audioContextRef.current) return

      const lookahead = 0.1
      const scheduleAheadTime = 0.2

      while (currentTime < audioContextRef.current.currentTime + scheduleAheadTime) {
        // Play chord progression
        const chordIndex = Math.floor((currentTime / (beatLength * 4)) % chords.length)
        const currentChord = chords[chordIndex]

        // Strum the chord with slight delay for jazz feel
        currentChord.forEach((note, i) => {
          play8BitNote(note, currentTime + i * 0.02, beatLength * 2, 'triangle')
        })

        // Add jazzy melody on top (random walk through scale)
        if (Math.random() > 0.3) {
          const melodyNote = melodyScale[Math.floor(Math.random() * melodyScale.length)]
          play8BitNote(melodyNote * 2, currentTime + beatLength * Math.random(), beatLength * 0.3, 'square')
        }

        // Bass line (root notes)
        const bassNote = currentChord[0] / 2
        play8BitNote(bassNote, currentTime, beatLength * 2, 'sine')

        // Walking bass pattern occasionally
        if (Math.random() > 0.5) {
          play8BitNote(bassNote * 1.125, currentTime + beatLength, beatLength * 0.5, 'sine')
        }

        currentTime += beatLength * 4
      }

      setTimeout(scheduleMusic, lookahead * 1000)
    }

    // Background conversation sounds
    const scheduleConversation = () => {
      if (!musicPlayingRef.current || !audioContextRef.current || !conversationGainNodeRef.current) return

      // Create mumbling conversation sounds
      setInterval(() => {
        if (!musicPlayingRef.current || !audioContextRef.current || !conversationGainNodeRef.current) return

        // Random conversation "words" using filtered noise and tones
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (!audioContextRef.current || !conversationGainNodeRef.current) return

            const freq = 100 + Math.random() * 200 // Human voice range
            const duration = 0.1 + Math.random() * 0.2

            // Create formant-like sound
            const osc1 = audioContextRef.current.createOscillator()
            const osc2 = audioContextRef.current.createOscillator()
            const conversationGain = audioContextRef.current.createGain()

            osc1.type = 'sawtooth'
            osc1.frequency.value = freq
            osc2.type = 'sawtooth'
            osc2.frequency.value = freq * 2.1

            // Envelope for speech-like sound
            conversationGain.gain.setValueAtTime(0, audioContextRef.current.currentTime)
            conversationGain.gain.linearRampToValueAtTime(0.05, audioContextRef.current.currentTime + 0.01)
            conversationGain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration)

            // Bandpass filter for voice-like quality
            const filter = audioContextRef.current.createBiquadFilter()
            filter.type = 'bandpass'
            filter.frequency.value = freq * 3
            filter.Q.value = 5

            osc1.connect(filter)
            osc2.connect(filter)
            filter.connect(conversationGain)
            conversationGain.connect(conversationGainNodeRef.current)

            osc1.start(audioContextRef.current.currentTime)
            osc1.stop(audioContextRef.current.currentTime + duration)
            osc2.start(audioContextRef.current.currentTime)
            osc2.stop(audioContextRef.current.currentTime + duration)
          }, i * 200 + Math.random() * 500)
        }

        // Occasional laughter
        if (Math.random() > 0.9) {
          for (let j = 0; j < 5; j++) {
            setTimeout(() => {
              if (!conversationGainNodeRef.current) return
              play8BitNote(
                300 + Math.random() * 100,
                audioContextRef.current!.currentTime,
                0.05,
                'square',
                conversationGainNodeRef.current
              )
            }, j * 50)
          }
        }
      }, 3000 + Math.random() * 4000)
    }

    scheduleMusic()
    scheduleConversation()
  }, [play8BitNote])

  // Start the chill jazz loop
  const startSoundtrack = useCallback(() => {
    if (musicPlayingRef.current) return

    if (isMobile.current) {
      startMobileSoundtrack()
    } else {
      startWebSoundtrack()
    }
  }, [startMobileSoundtrack, startWebSoundtrack])

  // Stop soundtrack
  const stopSoundtrack = useCallback(() => {
    musicPlayingRef.current = false

    if (isMobile.current && html5BackgroundAudio.current) {
      html5BackgroundAudio.current.pause()
      html5BackgroundAudio.current.currentTime = 0
    }
  }, [])

  const initGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Clear all key states when initializing game
    keysRef.current = {}

    // World size adaptive to device - smaller on mobile for better performance
    const worldMultiplier = isMobile.current ? 2 : 2.5
    const worldWidth = canvas.width * worldMultiplier
    const worldHeight = canvas.height * worldMultiplier
    
    // Start in center of world
    const centerX = worldWidth / 2
    const centerY = worldHeight / 2

    const initialGuests: Guest[] = []
    for (let i = 0; i < 5; i++) {
      initialGuests.push({
        x: centerX,
        y: centerY,
        offsetX: (Math.random() - 0.5) * 30,
        offsetY: (Math.random() - 0.5) * 15,
        bounce: 0,
        bounceSpeed: Math.random() * 0.1 + 0.05,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      })
    }

    const initialRescuables: Rescuable[] = []
    // Distribute rescuables across the entire world, not just near spawn
    for (let i = 0; i < 15; i++) { // Reasonable amount for 2.5x world
      // Use better distribution to avoid clustering
      const angle = (i / 15) * Math.PI * 2
      const distance = 200 + Math.random() * (Math.min(worldWidth, worldHeight) / 2 - 200)
      initialRescuables.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        wave: 0,
        rescued: false,
        type: Math.random() > 0.7 ? 'wreck' : 'person'
      })
    }

    const initialObstacles: Cactus[] = []
    // Better obstacle distribution
    for (let i = 0; i < 25; i++) { // Reasonable amount for 2.5x world
      // Grid-based distribution with randomness
      const gridX = (i % 5) * (worldWidth / 5)
      const gridY = Math.floor(i / 5) * (worldHeight / 5)
      initialObstacles.push({
        x: gridX + Math.random() * (worldWidth / 5),
        y: gridY + Math.random() * (worldHeight / 5),
        size: Math.random() * 20 + 30
      })
    }

    setGameState(prev => ({
      ...prev,
      barge: {
        ...prev.barge,
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        angle: 0
      },
      guests: initialGuests,
      rescuables: initialRescuables,
      obstacles: initialObstacles,
      particles: [],
      funLevel: 100,
      score: 0,
      gameRunning: true,
      gameOver: false,
      camera: {
        x: centerX - canvas.width / 2,
        y: centerY - canvas.height / 2,
        targetX: centerX - canvas.width / 2,
        targetY: centerY - canvas.height / 2
      },
      worldWidth,
      worldHeight,
      lastBoostTime: 0
    }))
  }, [canvasRef])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault() // Prevent page scroll
    }
    keysRef.current[e.key] = true
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault() // Prevent page scroll
    }
    keysRef.current[e.key] = false
  }, [])

  const updateBarge = useCallback((barge: Barge, worldWidth: number, worldHeight: number): Barge => {
    let newVx = barge.vx
    let newVy = barge.vy

    if (keysRef.current['ArrowLeft'] || keysRef.current['a']) {
      newVx -= barge.thrust
    }
    if (keysRef.current['ArrowRight'] || keysRef.current['d']) {
      newVx += barge.thrust
    }
    if (keysRef.current['ArrowUp'] || keysRef.current['w']) {
      newVy -= barge.thrust
    }
    if (keysRef.current['ArrowDown'] || keysRef.current['s']) {
      newVy += barge.thrust
    }

    newVx *= barge.friction
    newVy *= barge.friction

    const speed = Math.sqrt(newVx * newVx + newVy * newVy)
    if (speed > barge.maxSpeed) {
      newVx = (newVx / speed) * barge.maxSpeed
      newVy = (newVy / speed) * barge.maxSpeed
    }

    let newX = barge.x + newVx
    let newY = barge.y + newVy

    // Constrain to world boundaries
    newX = Math.max(barge.width/2, Math.min(worldWidth - barge.width/2, newX))
    newY = Math.max(barge.height/2, Math.min(worldHeight - barge.height/2, newY))

    return {
      ...barge,
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
      angle: newVx * 0.02
    }
  }, [])

  const updateGuests = useCallback((guests: Guest[], barge: Barge): Guest[] => {
    return guests.map(guest => ({
      ...guest,
      bounce: guest.bounce + guest.bounceSpeed,
      x: barge.x + guest.offsetX,
      y: barge.y + guest.offsetY + Math.sin(guest.bounce) * 3
    }))
  }, [])

  const checkRescues = useCallback((rescuables: Rescuable[], barge: Barge): {
    rescuables: Rescuable[]
    newGuests: Guest[]
    scoreIncrease: number
    funIncrease: number
    newParticles: Particle[]
  } => {
    const newGuests: Guest[] = []
    const newParticles: Particle[] = []
    let scoreIncrease = 0
    let funIncrease = 0

    const updatedRescuables = rescuables.map(r => {
      if (r.rescued) return r

      const dx = r.x - barge.x
      const dy = r.y - barge.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 50) {
        scoreIncrease += r.type === 'wreck' ? 200 : 100
        funIncrease += 20

        const guestCount = r.type === 'wreck' ? 3 : 1
        for (let i = 0; i < guestCount; i++) {
          newGuests.push({
            x: barge.x,
            y: barge.y,
            offsetX: (Math.random() - 0.5) * 30,
            offsetY: (Math.random() - 0.5) * 15,
            bounce: 0,
            bounceSpeed: Math.random() * 0.1 + 0.05,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
          })
        }

        for (let i = 0; i < 10; i++) {
          newParticles.push({
            x: r.x,
            y: r.y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 2,
            life: 1,
            color: '#FFE66D'
          })
        }

        return { ...r, rescued: true, wave: r.wave + 0.1 }
      }

      return { ...r, wave: r.wave + 0.1 }
    })

    return {
      rescuables: updatedRescuables.filter(r => !r.rescued),
      newGuests,
      scoreIncrease,
      funIncrease,
      newParticles
    }
  }, [])

  const checkCollisions = useCallback((obstacles: Cactus[], barge: Barge): {
    funDecrease: number
    newParticles: Particle[]
    bargeKnockback: { vx: number, vy: number }
  } => {
    let funDecrease = 0
    const newParticles: Particle[] = []
    let knockbackVx = 0
    let knockbackVy = 0

    obstacles.forEach(cactus => {
      const dx = cactus.x - barge.x
      const dy = cactus.y - barge.y + cactus.size/2
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 40) {
        funDecrease += 15
        knockbackVx = barge.vx * -0.5
        knockbackVy = barge.vy * -0.5

        for (let i = 0; i < 5; i++) {
          newParticles.push({
            x: barge.x,
            y: barge.y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 2,
            life: 1,
            color: '#FF0000'
          })
        }
      }
    })

    return {
      funDecrease,
      newParticles,
      bargeKnockback: { vx: knockbackVx, vy: knockbackVy }
    }
  }, [])

  const updateParticles = useCallback((particles: Particle[]): Particle[] => {
    return particles
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.1,
        life: p.life - 0.02
      }))
      .filter(p => p.life > 0)
  }, [])

  const updateCamera = useCallback((camera: Camera, barge: Barge, canvas: HTMLCanvasElement, worldWidth: number, worldHeight: number): Camera => {
    // Faster camera on mobile for better responsiveness with touch controls
    const cameraSpeed = isMobile.current ? 0.3 : 0.2
    
    // Center camera on barge
    const targetX = barge.x - canvas.width / 2
    const targetY = barge.y - canvas.height / 2
    
    // Lerp camera position
    const newX = camera.x + (targetX - camera.x) * cameraSpeed
    const newY = camera.y + (targetY - camera.y) * cameraSpeed
    
    // Constrain camera to world boundaries
    const constrainedX = Math.max(0, Math.min(worldWidth - canvas.width, newX))
    const constrainedY = Math.max(0, Math.min(worldHeight - canvas.height, newY))
    
    return {
      x: constrainedX,
      y: constrainedY,
      targetX: targetX,
      targetY: targetY
    }
  }, [])

  const gameLoop = useCallback(function loop() {
    if (!canvasRef.current || !gameState.gameRunning) return

    const canvas = canvasRef.current

    setGameState(prev => {
      const updatedBarge = updateBarge(prev.barge, prev.worldWidth, prev.worldHeight)
      const updatedCamera = updateCamera(prev.camera, updatedBarge, canvas, prev.worldWidth, prev.worldHeight)
      const updatedGuests = updateGuests(prev.guests, updatedBarge)
      
      const rescueResult = checkRescues(prev.rescuables, updatedBarge)
      const collisionResult = checkCollisions(prev.obstacles, updatedBarge)
      
      let updatedParticles = updateParticles(prev.particles)
      updatedParticles = [...updatedParticles, ...rescueResult.newParticles, ...collisionResult.newParticles]

      // Check for boost and apply fun bonus
      let boostBonus = 0
      let boostScoreBonus = 0
      let newBoostTime = prev.lastBoostTime
      
      const now = Date.now()
      const canBoost = keysRef.current[' '] && (now - prev.lastBoostTime) > 1000
      
      if (canBoost) {
        newBoostTime = now
        boostBonus = 10
        boostScoreBonus = 10
        
        // Create more dramatic particle effect for boost
        for (let i = 0; i < 25; i++) {
          updatedParticles.push({
            x: updatedBarge.x,
            y: updatedBarge.y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 3,
            life: 1,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
          })
        }
      }

      const spawnedRescuables = rescueResult.rescuables
      if (Math.random() < 0.01 && spawnedRescuables.length < 20) { // Appropriate for 2.5x world
        // Spawn at a random location in the world, not just near player
        const spawnAngle = Math.random() * Math.PI * 2
        const spawnDistance = 100 + Math.random() * 500
        const spawnX = updatedBarge.x + Math.cos(spawnAngle) * spawnDistance
        const spawnY = updatedBarge.y + Math.sin(spawnAngle) * spawnDistance
        
        spawnedRescuables.push({
          x: Math.max(50, Math.min(prev.worldWidth - 50, spawnX)),
          y: Math.max(50, Math.min(prev.worldHeight - 50, spawnY)),
          wave: 0,
          rescued: false,
          type: Math.random() > 0.7 ? 'wreck' : 'person'
        })
      }

      const finalBarge = collisionResult.bargeKnockback.vx !== 0 ? 
        { ...updatedBarge, vx: collisionResult.bargeKnockback.vx, vy: collisionResult.bargeKnockback.vy } :
        updatedBarge

      const newFunLevel = Math.max(0, Math.min(100, prev.funLevel - 0.1 + rescueResult.funIncrease - collisionResult.funDecrease + boostBonus))
      
      if (newFunLevel <= 0) {
        stopSoundtrack()
        return {
          ...prev,
          barge: finalBarge,
          guests: [...updatedGuests, ...rescueResult.newGuests],
          rescuables: spawnedRescuables,
          particles: updatedParticles,
          funLevel: 0,
          score: prev.score + rescueResult.scoreIncrease + boostScoreBonus + prev.guests.length * 0.1,
          gameRunning: false,
          gameOver: true,
          camera: updatedCamera,
          lastBoostTime: newBoostTime
        }
      }

      return {
        ...prev,
        barge: finalBarge,
        guests: [...updatedGuests, ...rescueResult.newGuests],
        rescuables: spawnedRescuables,
        particles: updatedParticles,
        funLevel: newFunLevel,
        score: prev.score + rescueResult.scoreIncrease + (boostScoreBonus || 0) + prev.guests.length * 0.1,
        camera: updatedCamera,
        lastBoostTime: newBoostTime
      }
    })

    animationIdRef.current = requestAnimationFrame(loop)
  }, [canvasRef, gameState.gameRunning, updateBarge, updateCamera, updateGuests, checkRescues, checkCollisions, updateParticles, stopSoundtrack])

  const startGame = useCallback(() => {
    initAudio()
    initGame()
    startSoundtrack()
  }, [initAudio, initGame, startSoundtrack])

  const restartGame = useCallback(() => {
    // Clear all key states before restarting
    keysRef.current = {}
    setGameState(prev => ({ ...prev, gameOver: false }))
    startGame()
  }, [startGame])

  useEffect(() => {
    if (gameState.gameRunning) {
      animationIdRef.current = requestAnimationFrame(gameLoop)
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [gameState.gameRunning, gameLoop])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])
  
  // Separate effect for cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop music when component unmounts (navigating away)
      stopSoundtrack()
      // Clear all key states on unmount
      keysRef.current = {}
    }
  }, [stopSoundtrack])

  return {
    gameState,
    startGame,
    restartGame,
    handleMobileInput
  }
}