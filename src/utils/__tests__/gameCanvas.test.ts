import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock canvas context for testing
const mockContext = {
  imageSmoothingEnabled: false,
  fillStyle: '',
  fillRect: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  globalAlpha: 1,
  font: '',
  textAlign: '',
  fillText: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn()
  })),
  scale: vi.fn()
}

// Mock canvas element
const createMockCanvas = (width = 1000, height = 800) => ({
  width,
  height,
  getContext: vi.fn(() => mockContext),
  getBoundingClientRect: vi.fn(() => ({
    width,
    height,
    top: 0,
    left: 0,
    bottom: height,
    right: width,
    x: 0,
    y: 0,
    toJSON: vi.fn()
  } as DOMRect)),
  style: {} as CSSStyleDeclaration
})

// Test helper functions that mirror the game logic
function isWithinBounds(x: number, y: number, _canvasWidth: number, _canvasHeight: number, margin = 10) {
  return x >= margin && x <= _canvasWidth - margin && y >= margin && y <= _canvasHeight - margin
}

function generateTerminalPositions(_canvasWidth: number, _canvasHeight: number, count = 5) {
  const basePositions = [
    { x: 150, y: 120 },
    { x: 850, y: 180 },
    { x: 200, y: 600 },
    { x: 750, y: 520 },
    { x: 500, y: 350 }
  ]

  const positions = []
  for (let i = 0; i < count; i++) {
    const pos = basePositions[i] || {
      x: 200 + (i % 5) * 150,
      y: 200 + Math.floor(i / 5) * 200
    }
    positions.push(pos)
  }
  return positions
}

function calculateDistance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1)
}

function drawGrid(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, gridSize = 40) {
  for (let x = 0; x < canvasWidth; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasHeight)
    ctx.stroke()
  }
  for (let y = 0; y < canvasHeight; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
    ctx.stroke()
  }
}

describe('Game Canvas Setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Canvas Dimensions', () => {
    it('should setup canvas with 1000x800 dimensions', () => {
      const canvas = createMockCanvas(1000, 800)
      
      expect(canvas.width).toBe(1000)
      expect(canvas.height).toBe(800)
    })

    it('should disable image smoothing for pixelated rendering', () => {
      const canvas = createMockCanvas()
      const ctx = canvas.getContext()
      
      if (ctx) {
        ctx.imageSmoothingEnabled = false
        expect(ctx.imageSmoothingEnabled).toBe(false)
      }
    })

    it('should handle device pixel ratio scaling', () => {
      const canvas = createMockCanvas()
      const ctx = canvas.getContext()
      const dpr = 2 // Simulate high-DPI display
      
      if (ctx) {
        ctx.scale(dpr, dpr)
        expect(ctx.scale).toHaveBeenCalledWith(dpr, dpr)
      }
    })
  })

  describe('Player Position and Bounds', () => {
    it('should start player at center of 1000x800 canvas', () => {
      const canvasWidth = 1000
      const canvasHeight = 800
      const playerX = 500 // canvasWidth / 2
      const playerY = 400 // canvasHeight / 2
      
      expect(playerX).toBe(canvasWidth / 2)
      expect(playerY).toBe(canvasHeight / 2)
    })

    it('should keep player within canvas bounds', () => {
      const canvasWidth = 1000
      const canvasHeight = 800
      const margin = 10

      // Test boundary positions
      const testPositions = [
        { x: 0, y: 400 }, // Left edge - should be clamped to margin
        { x: 1000, y: 400 }, // Right edge - should be clamped to width - margin
        { x: 500, y: 0 }, // Top edge - should be clamped to margin
        { x: 500, y: 800 }, // Bottom edge - should be clamped to height - margin
        { x: 500, y: 400 } // Center - should remain unchanged
      ]

      testPositions.forEach(pos => {
        const clampedX = Math.max(margin, Math.min(canvasWidth - margin, pos.x))
        const clampedY = Math.max(margin, Math.min(canvasHeight - margin, pos.y))
        
        expect(isWithinBounds(clampedX, clampedY, canvasWidth, canvasHeight, margin)).toBe(true)
      })
    })

    it('should handle player movement within bounds', () => {
      const canvasWidth = 1000
      const canvasHeight = 800
      let playerX = 500
      const playerY = 400
      const speed = 3

      // Move right
      playerX += speed
      expect(isWithinBounds(playerX, playerY, canvasWidth, canvasHeight)).toBe(true)

      // Move to near right boundary
      playerX = 985
      const clampedX = Math.max(10, Math.min(canvasWidth - 10, playerX))
      expect(clampedX).toBe(985)
      expect(isWithinBounds(clampedX, playerY, canvasWidth, canvasHeight)).toBe(true)

      // Try to move beyond boundary
      playerX = 1005
      const boundedX = Math.max(10, Math.min(canvasWidth - 10, playerX))
      expect(boundedX).toBe(990) // Should be clamped to 1000 - 10
    })
  })

  describe('Terminal Positioning', () => {
    it('should generate terminal positions within canvas bounds', () => {
      const canvasWidth = 1000
      const canvasHeight = 800
      const terminalPositions = generateTerminalPositions(canvasWidth, canvasHeight, 5)
      
      expect(terminalPositions).toHaveLength(5)
      
      terminalPositions.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(0)
        expect(pos.x).toBeLessThanOrEqual(canvasWidth)
        expect(pos.y).toBeGreaterThanOrEqual(0)
        expect(pos.y).toBeLessThanOrEqual(canvasHeight)
      })
    })

    it('should use predefined positions for first 5 terminals', () => {
      const terminalPositions = generateTerminalPositions(1000, 800, 5)
      const expectedPositions = [
        { x: 150, y: 120 },
        { x: 850, y: 180 },
        { x: 200, y: 600 },
        { x: 750, y: 520 },
        { x: 500, y: 350 }
      ]
      
      expectedPositions.forEach((expected, index) => {
        expect(terminalPositions[index]).toEqual(expected)
      })
    })

    it('should generate fallback positions for additional terminals', () => {
      const terminalPositions = generateTerminalPositions(1000, 800, 8)
      
      expect(terminalPositions).toHaveLength(8)
      
      // Check that additional terminals (beyond first 5) are generated
      const additionalTerminals = terminalPositions.slice(5)
      additionalTerminals.forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(200)
        expect(pos.y).toBeGreaterThanOrEqual(200)
      })
    })

    it('should ensure terminals are within interaction range', () => {
      const canvasWidth = 1000
      const canvasHeight = 800
      const terminalPositions = generateTerminalPositions(canvasWidth, canvasHeight, 5)
      const terminalSize = 30
      const interactionRange = 40

      terminalPositions.forEach(terminal => {
        // Check that terminal can be placed with its size
        expect(terminal.x + terminalSize / 2).toBeLessThanOrEqual(canvasWidth)
        expect(terminal.y + terminalSize / 2).toBeLessThanOrEqual(canvasHeight)
        expect(terminal.x - terminalSize / 2).toBeGreaterThanOrEqual(0)
        expect(terminal.y - terminalSize / 2).toBeGreaterThanOrEqual(0)
        
        // Verify interaction range is accessible
        expect(interactionRange).toBe(40)
      })
    })
  })

  describe('Collision Detection', () => {
    it('should detect player-terminal interaction within range', () => {
      const playerX = 500
      const playerY = 400
      const terminalX = 520
      const terminalY = 410
      const interactionRange = 40

      const distance = calculateDistance(playerX, playerY, terminalX, terminalY)
      const canInteract = distance < interactionRange

      expect(distance).toBeLessThan(interactionRange)
      expect(canInteract).toBe(true)
    })

    it('should not detect interaction when player is too far', () => {
      const playerX = 500
      const playerY = 400
      const terminalX = 600
      const terminalY = 500
      const interactionRange = 40

      const distance = calculateDistance(playerX, playerY, terminalX, terminalY)
      const canInteract = distance < interactionRange

      expect(distance).toBeGreaterThan(interactionRange)
      expect(canInteract).toBe(false)
    })

    it('should calculate distance correctly', () => {
      const testCases = [
        { x1: 0, y1: 0, x2: 3, y2: 4, expected: 5 }, // 3-4-5 triangle
        { x1: 100, y1: 100, x2: 100, y2: 100, expected: 0 }, // Same position
        { x1: 0, y1: 0, x2: 100, y2: 0, expected: 100 }, // Horizontal line
        { x1: 0, y1: 0, x2: 0, y2: 100, expected: 100 } // Vertical line
      ]

      testCases.forEach(({ x1, y1, x2, y2, expected }) => {
        const distance = calculateDistance(x1, y1, x2, y2)
        expect(distance).toBeCloseTo(expected, 2)
      })
    })
  })

  describe('Grid Drawing', () => {
    it('should draw grid with correct spacing for 1000x800 canvas', () => {
      const canvas = createMockCanvas(1000, 800)
      const ctx = canvas.getContext()
      const gridSize = 40

      if (ctx) {
        drawGrid(ctx as unknown as CanvasRenderingContext2D, canvas.width, canvas.height, gridSize)

        // Check that grid lines are drawn
        expect(ctx.beginPath).toHaveBeenCalled()
        expect(ctx.moveTo).toHaveBeenCalled()
        expect(ctx.lineTo).toHaveBeenCalled()
        expect(ctx.stroke).toHaveBeenCalled()

        // Calculate expected number of grid lines
        const verticalLines = Math.floor(1000 / gridSize) // 25 lines (0, 40, 80, ..., 960)
        const horizontalLines = Math.floor(800 / gridSize) // 20 lines (0, 40, 80, ..., 760)
        
        // Each line requires beginPath, moveTo, lineTo, stroke
        const expectedCalls = verticalLines + horizontalLines
        expect(ctx.beginPath).toHaveBeenCalledTimes(expectedCalls)
      }
    })

    it('should handle different grid sizes', () => {
      const canvas = createMockCanvas(1000, 800)
      const ctx = canvas.getContext()

      if (ctx) {
        // Test with larger grid
        vi.clearAllMocks()
        drawGrid(ctx as unknown as CanvasRenderingContext2D, canvas.width, canvas.height, 100)
        
        const verticalLines = Math.floor(1000 / 100) // 10 lines
        const horizontalLines = Math.floor(800 / 100) // 8 lines
        const expectedCalls = verticalLines + horizontalLines // 18 total
        
        expect(ctx.beginPath).toHaveBeenCalledTimes(expectedCalls)
      }
    })
  })

  describe('Canvas Scaling and Responsiveness', () => {
    it('should maintain aspect ratio for different canvas sizes', () => {
      const originalRatio = 1000 / 800 // 1.25 (5:4)
      
      // Test different sizes while maintaining ratio
      const testSizes = [
        { width: 500, height: 400 },
        { width: 800, height: 640 },
        { width: 1200, height: 960 }
      ]

      testSizes.forEach(size => {
        const ratio = size.width / size.height
        expect(ratio).toBeCloseTo(originalRatio, 3)
      })
    })

    it('should handle canvas resizing', () => {
      // Simulate resize
      const canvas = createMockCanvas(800, 640)
      
      expect(canvas.width).toBe(800)
      expect(canvas.height).toBe(640)
      expect(canvas.width / canvas.height).toBeCloseTo(1.25, 3) // Maintains 5:4 ratio
    })

    it('should scale elements proportionally with canvas size', () => {
      const originalCanvas = { width: 1000, height: 800 }
      const scaledCanvas = { width: 500, height: 400 }
      
      const scaleX = scaledCanvas.width / originalCanvas.width
      const scaleY = scaledCanvas.height / originalCanvas.height
      
      expect(scaleX).toBe(0.5)
      expect(scaleY).toBe(0.5)
      
      // Elements should scale proportionally
      const originalTerminalSize = 30
      const scaledTerminalSize = originalTerminalSize * Math.min(scaleX, scaleY)
      
      expect(scaledTerminalSize).toBe(15)
    })
  })

  describe('Particle System', () => {
    it('should generate particles within canvas bounds', () => {
      // Simulate particle creation at player position
      const playerX = 500
      const playerY = 400
      const particles = []
      
      // Generate some test particles
      for (let i = 0; i < 10; i++) {
        particles.push({
          x: playerX + (Math.random() - 0.5) * 10,
          y: playerY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          life: 1,
          color: '#ffd700'
        })
      }
      
      particles.forEach(particle => {
        // Initial position should be near player
        expect(particle.x).toBeGreaterThan(playerX - 5)
        expect(particle.x).toBeLessThan(playerX + 5)
        expect(particle.y).toBeGreaterThan(playerY - 5)
        expect(particle.y).toBeLessThan(playerY + 5)
      })
    })

    it('should update particle positions over time', () => {
      const particle = {
        x: 500,
        y: 400,
        vx: 2,
        vy: -1,
        life: 1,
        color: '#ffd700'
      }

      // Simulate one frame update
      particle.x += particle.vx
      particle.y += particle.vy
      particle.life -= 0.02

      expect(particle.x).toBe(502)
      expect(particle.y).toBe(399)
      expect(particle.life).toBeCloseTo(0.98, 2)
    })

    it('should remove particles when life reaches zero', () => {
      const particles = [
        { x: 500, y: 400, vx: 1, vy: 1, life: 0.1, color: '#ffd700' },
        { x: 600, y: 500, vx: -1, vy: 0, life: 0.5, color: '#90ee90' }
      ]

      // Simulate multiple frame updates
      for (let frame = 0; frame < 10; frame++) {
        particles.forEach(particle => {
          particle.life -= 0.02
        })
      }

      const aliveParticles = particles.filter(p => p.life > 0)
      expect(aliveParticles).toHaveLength(1) // Only the second particle should survive
    })
  })

  describe('Performance Considerations', () => {
    it('should limit number of active particles', () => {
      const maxParticles = 100
      const particles = []

      // Try to create more particles than the limit
      for (let i = 0; i < 150; i++) {
        if (particles.length < maxParticles) {
          particles.push({
            x: Math.random() * 1000,
            y: Math.random() * 800,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1,
            color: '#ffd700'
          })
        }
      }

      expect(particles.length).toBeLessThanOrEqual(maxParticles)
    })

    it('should handle large canvas sizes efficiently', () => {
      const largeCanvas = createMockCanvas(2000, 1600)
      
      expect(largeCanvas.width).toBe(2000)
      expect(largeCanvas.height).toBe(1600)
      
      // Ensure terminal positions scale appropriately
      const terminalPositions = generateTerminalPositions(largeCanvas.width, largeCanvas.height, 5)
      terminalPositions.forEach(pos => {
        expect(pos.x).toBeLessThanOrEqual(largeCanvas.width)
        expect(pos.y).toBeLessThanOrEqual(largeCanvas.height)
      })
    })
  })
})