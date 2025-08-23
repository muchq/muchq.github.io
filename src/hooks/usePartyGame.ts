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
      thrust: 0.5,
      maxSpeed: 5,
      friction: 0.95
    },
    guests: [],
    rescuables: [],
    particles: [],
    obstacles: [],
    funLevel: 100,
    score: 0,
    gameRunning: false,
    gameOver: false
  })
  
  const keysRef = useRef<Record<string, boolean>>({})
  const lastBoostTimeRef = useRef<number>(0)
  const animationIdRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)

  const initAudio = useCallback(() => {
    if (audioContextRef.current) return
    
    const AudioContextClass = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass()
    }
  }, [])

  const initGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

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
    for (let i = 0; i < 3; i++) {
      initialRescuables.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        wave: 0,
        rescued: false,
        type: Math.random() > 0.7 ? 'wreck' : 'person'
      })
    }

    const initialObstacles: Cactus[] = []
    for (let i = 0; i < 5; i++) {
      initialObstacles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
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
      gameOver: false
    }))
  }, [canvasRef])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.key] = true
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.key] = false
  }, [])

  const updateBarge = useCallback((barge: Barge, canvas: HTMLCanvasElement): Barge => {
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

    newX = Math.max(barge.width/2, Math.min(canvas.width - barge.width/2, newX))
    newY = Math.max(barge.height/2, Math.min(canvas.height - barge.height/2, newY))

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

  const gameLoop = useCallback(() => {
    if (!canvasRef.current || !gameState.gameRunning) return

    const canvas = canvasRef.current

    setGameState(prev => {
      const updatedBarge = updateBarge(prev.barge, canvas)
      const updatedGuests = updateGuests(prev.guests, updatedBarge)
      
      const rescueResult = checkRescues(prev.rescuables, updatedBarge)
      const collisionResult = checkCollisions(prev.obstacles, updatedBarge)
      
      let updatedParticles = updateParticles(prev.particles)
      updatedParticles = [...updatedParticles, ...rescueResult.newParticles, ...collisionResult.newParticles]

      if (keysRef.current[' '] && Date.now() - lastBoostTimeRef.current > 1000) {
        lastBoostTimeRef.current = Date.now()
        
        for (let i = 0; i < 15; i++) {
          updatedParticles.push({
            x: updatedBarge.x,
            y: updatedBarge.y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 2,
            life: 1,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
          })
        }

        return {
          ...prev,
          barge: updatedBarge,
          guests: [...updatedGuests, ...rescueResult.newGuests],
          rescuables: rescueResult.rescuables,
          particles: updatedParticles,
          funLevel: Math.min(100, prev.funLevel + 10 + rescueResult.funIncrease - collisionResult.funDecrease),
          score: prev.score + 10 + rescueResult.scoreIncrease + prev.guests.length * 0.1
        }
      }

      const spawnedRescuables = rescueResult.rescuables
      if (Math.random() < 0.01 && spawnedRescuables.length < 5) {
        spawnedRescuables.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          wave: 0,
          rescued: false,
          type: Math.random() > 0.7 ? 'wreck' : 'person'
        })
      }

      const finalBarge = collisionResult.bargeKnockback.vx !== 0 ? 
        { ...updatedBarge, vx: collisionResult.bargeKnockback.vx, vy: collisionResult.bargeKnockback.vy } :
        updatedBarge

      const newFunLevel = Math.max(0, prev.funLevel - 0.1 + rescueResult.funIncrease - collisionResult.funDecrease)
      
      if (newFunLevel <= 0) {
        return {
          ...prev,
          barge: finalBarge,
          guests: [...updatedGuests, ...rescueResult.newGuests],
          rescuables: spawnedRescuables,
          particles: updatedParticles,
          funLevel: 0,
          score: prev.score + rescueResult.scoreIncrease + prev.guests.length * 0.1,
          gameRunning: false,
          gameOver: true
        }
      }

      return {
        ...prev,
        barge: finalBarge,
        guests: [...updatedGuests, ...rescueResult.newGuests],
        rescuables: spawnedRescuables,
        particles: updatedParticles,
        funLevel: newFunLevel,
        score: prev.score + rescueResult.scoreIncrease + prev.guests.length * 0.1
      }
    })

    animationIdRef.current = requestAnimationFrame(gameLoop)
  }, [canvasRef, gameState.gameRunning, updateBarge, updateGuests, checkRescues, checkCollisions, updateParticles])

  const startGame = useCallback(() => {
    initAudio()
    initGame()
  }, [initAudio, initGame])

  const restartGame = useCallback(() => {
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

  return {
    gameState,
    startGame,
    restartGame
  }
}