import { useState, useCallback, useRef, useEffect } from 'react'

export interface Challenge {
  id: number
  title: string
  description: string
  hint: string
  tests: Array<{ input: unknown, expected: unknown }>
  points: number
  functionName: string
  starter: string
}

export interface Terminal {
  x: number
  y: number
  size: number
  challenge: Challenge
  completed: boolean
  glowPhase: number
}

export interface Player {
  x: number
  y: number
  size: number
  speed: number
  color: string
  facing: 'up' | 'down' | 'left' | 'right'
  bouncePhase: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export interface GameFeatures {
  particles: boolean
  grid: boolean
  glow: boolean
  miniGames: boolean
  backgroundTheme: 'classic' | 'matrix' | 'stars' | 'circuit'
  enabledMiniGames: string[]
}

export interface GameState {
  player: Player
  terminals: Terminal[]
  particles: Particle[]
  keys: Record<string, boolean>
  gameStarted: boolean
  features: GameFeatures
  currentLevel: { name: string; terminalCount: number } | null
  score: number
  terminalsCompleted: number
}

const defaultChallenges: Challenge[] = [
  {
    id: 1,
    title: "Array Sum",
    description: "Write a function called 'sum' that takes an array of numbers and returns their sum.",
    hint: "Use a loop or the reduce method to add all numbers together.",
    tests: [
      { input: [1, 2, 3], expected: 6 },
      { input: [10, 20, 30], expected: 60 },
      { input: [-5, 5], expected: 0 },
      { input: [42], expected: 42 }
    ],
    points: 100,
    functionName: "sum",
    starter: "function sum(arr) {\n  // Your code here\n  \n}"
  },
  {
    id: 2,
    title: "String Reversal",
    description: "Create a function called 'reverseString' that reverses a string.",
    hint: "You can split the string into an array, reverse it, and join it back.",
    tests: [
      { input: "hello", expected: "olleh" },
      { input: "world", expected: "dlrow" },
      { input: "12345", expected: "54321" },
      { input: "a", expected: "a" }
    ],
    points: 100,
    functionName: "reverseString",
    starter: "function reverseString(str) {\n  // Your code here\n  \n}"
  },
  {
    id: 3,
    title: "Even Filter",
    description: "Write a function called 'getEvens' that returns only even numbers from an array.",
    hint: "Use the filter method or a loop with the modulo operator (%).",
    tests: [
      { input: [1, 2, 3, 4, 5], expected: [2, 4] },
      { input: [10, 15, 20], expected: [10, 20] },
      { input: [1, 3, 5], expected: [] },
      { input: [0, 2, 4], expected: [0, 2, 4] }
    ],
    points: 150,
    functionName: "getEvens",
    starter: "function getEvens(arr) {\n  // Your code here\n  \n}"
  },
  {
    id: 4,
    title: "Palindrome Check",
    description: "Create a function called 'isPalindrome' that checks if a string is a palindrome.",
    hint: "Compare the string with its reverse. Remember to handle case sensitivity.",
    tests: [
      { input: "racecar", expected: true },
      { input: "hello", expected: false },
      { input: "A man a plan a canal Panama", expected: true },
      { input: "noon", expected: true }
    ],
    points: 200,
    functionName: "isPalindrome",
    starter: "function isPalindrome(str) {\n  // Remove spaces and convert to lowercase\n  // Your code here\n  \n}"
  },
  {
    id: 5,
    title: "Fibonacci",
    description: "Write a function called 'fibonacci' that returns the nth Fibonacci number.",
    hint: "Each number is the sum of the two preceding ones. Use iteration or recursion.",
    tests: [
      { input: 0, expected: 0 },
      { input: 1, expected: 1 },
      { input: 6, expected: 8 },
      { input: 10, expected: 55 }
    ],
    points: 250,
    functionName: "fibonacci",
    starter: "function fibonacci(n) {\n  // Your code here\n  \n}"
  }
]

interface UseQuestGameProps {
  onGameDataChange?: (data: {
    score: number
    level: string
    gameStarted: boolean
  }) => void
}

export const useQuestGame = (props?: UseQuestGameProps) => {
  const { onGameDataChange } = props || {}
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number | undefined>(undefined)
  
  const [gameState, setGameState] = useState<GameState>({
    player: {
      x: 500,
      y: 400,
      size: 20,
      speed: 3,
      color: '#ffd700',
      facing: 'down',
      bouncePhase: 0
    },
    terminals: [],
    particles: [],
    keys: {},
    gameStarted: false,
    features: {
      particles: true,
      grid: true,
      glow: true,
      miniGames: false,
      backgroundTheme: 'classic',
      enabledMiniGames: []
    },
    currentLevel: null,
    score: 0,
    terminalsCompleted: 0
  })

  const [currentChallenge, setCurrentChallenge] = useState<Terminal | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [testResults, setTestResults] = useState<Array<{ passed: boolean; message: string }>>([])
  const [userCode, setUserCode] = useState('')

  const initTerminals = useCallback(() => {
    const positions = [
      { x: 150, y: 120 },
      { x: 850, y: 180 },
      { x: 200, y: 600 },
      { x: 750, y: 520 },
      { x: 500, y: 350 }
    ]

    const terminalCount = gameState.currentLevel ? gameState.currentLevel.terminalCount : 5
    const newTerminals: Terminal[] = []

    for (let i = 0; i < Math.min(terminalCount, 10); i++) {
      const pos = positions[i] || {
        x: 200 + (i % 5) * 150,
        y: 200 + Math.floor(i / 5) * 200
      }

      newTerminals.push({
        x: pos.x,
        y: pos.y,
        size: 30,
        challenge: defaultChallenges[i % defaultChallenges.length],
        completed: false,
        glowPhase: Math.random() * Math.PI * 2
      })
    }

    setGameState(prev => ({ ...prev, terminals: newTerminals }))
  }, [gameState.currentLevel])

  const checkTerminalInteraction = useCallback(() => {
    const terminal = gameState.terminals.find(t => {
      if (!t.completed) {
        const dist = Math.hypot(t.x - gameState.player.x, t.y - gameState.player.y)
        return dist < 40
      }
      return false
    })

    if (terminal) {
      setCurrentChallenge(terminal)
      setUserCode(terminal.challenge.starter)
      setShowModal(true)
      setTestResults([])
    }
  }, [gameState.terminals, gameState.player])

  const updatePlayer = useCallback(() => {
    if (!gameState.gameStarted || showModal) return

    setGameState(prev => {
      const newState = { ...prev }
      const oldX = newState.player.x
      const oldY = newState.player.y

      // Update player position based on keys
      if (newState.keys['w'] || newState.keys['arrowup']) {
        newState.player.y -= newState.player.speed
        newState.player.facing = 'up'
      }
      if (newState.keys['s'] || newState.keys['arrowdown']) {
        newState.player.y += newState.player.speed
        newState.player.facing = 'down'
      }
      if (newState.keys['a'] || newState.keys['arrowleft']) {
        newState.player.x -= newState.player.speed
        newState.player.facing = 'left'
      }
      if (newState.keys['d'] || newState.keys['arrowright']) {
        newState.player.x += newState.player.speed
        newState.player.facing = 'right'
      }

      // Keep player in bounds
      const canvas = canvasRef.current
      if (canvas) {
        newState.player.x = Math.max(10, Math.min(canvas.width - 10, newState.player.x))
        newState.player.y = Math.max(10, Math.min(canvas.height - 10, newState.player.y))
      }

      // Create trail particles when moving
      if (newState.features.particles && (oldX !== newState.player.x || oldY !== newState.player.y)) {
        if (Math.random() > 0.7) {
          newState.particles.push({
            x: oldX,
            y: oldY,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life: 1,
            color: newState.player.color
          })
        }
      }

      return newState
    })
  }, [gameState.gameStarted, showModal])

  const updateParticles = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      particles: prev.particles
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02
        }))
        .filter(p => p.life > 0)
    }))
  }, [])

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.fillStyle = '#0f0f23'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (gameState.features.grid) {
      ctx.strokeStyle = 'rgba(74, 74, 104, 0.2)'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
    }
  }, [gameState.features.grid])

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save()
    ctx.translate(gameState.player.x, gameState.player.y)

    // Update bounce animation
    const bounceOffset = Math.abs(Math.sin(gameState.player.bouncePhase)) * 2
    ctx.translate(0, -bounceOffset)

    // Draw pixelated person
    const pixelSize = 4
    ctx.fillStyle = gameState.player.color

    // Head
    ctx.fillRect(-3 * pixelSize, -6 * pixelSize, 6 * pixelSize, 3 * pixelSize)
    // Body
    ctx.fillRect(-2 * pixelSize, -3 * pixelSize, 4 * pixelSize, 4 * pixelSize)
    // Arms
    ctx.fillRect(-3 * pixelSize, -3 * pixelSize, 1 * pixelSize, 3 * pixelSize)
    ctx.fillRect(2 * pixelSize, -3 * pixelSize, 1 * pixelSize, 3 * pixelSize)
    // Legs
    ctx.fillRect(-2 * pixelSize, 1 * pixelSize, 1 * pixelSize, 3 * pixelSize)
    ctx.fillRect(1 * pixelSize, 1 * pixelSize, 1 * pixelSize, 3 * pixelSize)

    // Eyes
    ctx.fillStyle = '#000'
    switch(gameState.player.facing) {
      case 'down':
        ctx.fillRect(-2 * pixelSize, -5 * pixelSize, pixelSize, pixelSize)
        ctx.fillRect(pixelSize, -5 * pixelSize, pixelSize, pixelSize)
        break
      case 'up':
        ctx.fillRect(-2 * pixelSize, -6 * pixelSize, pixelSize, pixelSize)
        ctx.fillRect(pixelSize, -6 * pixelSize, pixelSize, pixelSize)
        break
      case 'left':
        ctx.fillRect(-2 * pixelSize, -5 * pixelSize, pixelSize, pixelSize)
        break
      case 'right':
        ctx.fillRect(pixelSize, -5 * pixelSize, pixelSize, pixelSize)
        break
    }

    ctx.restore()
  }, [gameState.player])

  const drawTerminals = useCallback((ctx: CanvasRenderingContext2D) => {
    gameState.terminals.forEach(terminal => {
      if (gameState.features.glow && !terminal.completed) {
        terminal.glowPhase += 0.05
        const glowSize = Math.sin(terminal.glowPhase) * 5 + 25
        
        const gradient = ctx.createRadialGradient(terminal.x, terminal.y, 0, terminal.x, terminal.y, glowSize)
        gradient.addColorStop(0, 'rgba(135, 206, 235, 0.5)')
        gradient.addColorStop(1, 'rgba(135, 206, 235, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(terminal.x - glowSize, terminal.y - glowSize, glowSize * 2, glowSize * 2)
      }

      // Draw terminal
      ctx.fillStyle = terminal.completed ? '#4a4a68' : '#87ceeb'
      ctx.fillRect(terminal.x - 15, terminal.y - 15, 30, 30)

      // Draw terminal screen
      ctx.fillStyle = terminal.completed ? '#1a1a2e' : '#001122'
      ctx.fillRect(terminal.x - 10, terminal.y - 10, 20, 20)

      // Draw status indicator
      ctx.fillStyle = terminal.completed ? '#90ee90' : '#ffd700'
      ctx.fillRect(terminal.x - 3, terminal.y - 3, 6, 6)

      // Draw interaction hint
      if (!terminal.completed) {
        const dist = Math.hypot(terminal.x - gameState.player.x, terminal.y - gameState.player.y)
        if (dist < 40) {
          ctx.fillStyle = '#ffd700'
          ctx.font = '12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('PRESS SPACE', terminal.x, terminal.y - 25)
        }
      }
    })
  }, [gameState.terminals, gameState.player, gameState.features.glow])

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!gameState.features.particles) return

    gameState.particles.forEach(p => {
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
    })
    ctx.globalAlpha = 1
  }, [gameState.particles, gameState.features.particles])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawBackground(ctx, canvas)
    drawTerminals(ctx)
    drawParticles(ctx)
    drawPlayer(ctx)
  }, [drawBackground, drawTerminals, drawParticles, drawPlayer])

  const gameLoop = useCallback(() => {
    if (gameState.gameStarted) {
      updatePlayer()
      updateParticles()
      
      // Update bounce phase
      setGameState(prev => ({
        ...prev,
        player: {
          ...prev.player,
          bouncePhase: prev.player.bouncePhase + 0.1
        }
      }))
      
      draw()
    }
    animationIdRef.current = requestAnimationFrame(gameLoop)
  }, [gameState.gameStarted, updatePlayer, updateParticles, draw])

  const startGame = useCallback(() => {
    setGameState(prev => ({ ...prev, gameStarted: true }))
    initTerminals()
  }, [initTerminals])

  const runTests = useCallback(() => {
    if (!currentChallenge) return

    const challenge = currentChallenge.challenge
    const results: Array<{ passed: boolean; message: string }> = []

    try {
      const func = new Function('return ' + userCode)() as (...args: unknown[]) => unknown

      challenge.tests.forEach((test, i) => {
        try {
          let result: unknown
          if (challenge.functionName === 'isPalindrome') {
            result = func(test.input)
          } else if (Array.isArray(test.input)) {
            result = func(...test.input)
          } else {
            result = func(test.input)
          }

          if (JSON.stringify(result) === JSON.stringify(test.expected)) {
            results.push({ passed: true, message: `✓ Test ${i + 1}: PASSED` })
          } else {
            results.push({ passed: false, message: `✗ Test ${i + 1}: FAILED - Got ${JSON.stringify(result)}` })
          }
        } catch (e) {
          results.push({ passed: false, message: `✗ Test ${i + 1}: ERROR - ${(e as Error).message}` })
        }
      })

      const allPassed = results.every(r => r.passed)
      if (allPassed) {
        setGameState(prev => {
          const newTerminals = prev.terminals.map(t => 
            t === currentChallenge ? { ...t, completed: true } : t
          )
          return {
            ...prev,
            terminals: newTerminals,
            score: prev.score + challenge.points,
            terminalsCompleted: prev.terminalsCompleted + 1
          }
        })

        // Create celebration particles
        if (gameState.features.particles) {
          const newParticles: Particle[] = []
          for (let i = 0; i < 20; i++) {
            newParticles.push({
              x: currentChallenge.x,
              y: currentChallenge.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              life: 1,
              color: ['#ffd700', '#90ee90', '#87ceeb'][Math.floor(Math.random() * 3)]
            })
          }
          setGameState(prev => ({
            ...prev,
            particles: [...prev.particles, ...newParticles]
          }))
        }
      }
    } catch (e) {
      results.push({ passed: false, message: 'Syntax Error: ' + (e as Error).message })
    }

    setTestResults(results)
  }, [currentChallenge, userCode, gameState.features.particles])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setCurrentChallenge(null)
    setTestResults([])
  }, [])

  // Event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setGameState(prev => ({
        ...prev,
        keys: { ...prev.keys, [e.key.toLowerCase()]: true }
      }))

      if (e.key === ' ' && gameState.gameStarted) {
        e.preventDefault()
        checkTerminalInteraction()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setGameState(prev => ({
        ...prev,
        keys: { ...prev.keys, [e.key.toLowerCase()]: false }
      }))
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState.gameStarted, checkTerminalInteraction])

  // Start game loop
  useEffect(() => {
    animationIdRef.current = requestAnimationFrame(gameLoop)
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [gameLoop])

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas) {
        // Keep canvas internal dimensions fixed at 1000x800
        canvas.width = 1000
        canvas.height = 800
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.imageSmoothingEnabled = false
        }
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Update parent component with game data
  useEffect(() => {
    if (onGameDataChange) {
      const levelName = gameState.currentLevel ? gameState.currentLevel.name : 'Classic'
      
      onGameDataChange({
        score: gameState.score,
        level: levelName,
        gameStarted: gameState.gameStarted
      })
    }
  }, [gameState.score, gameState.gameStarted, gameState.currentLevel, onGameDataChange])

  return {
    canvasRef,
    gameState,
    currentChallenge,
    showModal,
    testResults,
    userCode,
    setUserCode,
    startGame,
    runTests,
    closeModal
  }
}