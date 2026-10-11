import { describe, expect, it } from 'vitest'
import type { PongCourt } from '../wire'
import { FAR_COLOR, NEAR_COLOR, drawFlat, drawTunnel, type Scene } from '../draw'

// A canvas that remembers each rectangle filled, in the colour it was.
const recorder = () => {
  const rects: Array<{ x: number; y: number; w: number; h: number; style: string }> = []
  const faces: number[] = []
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    clearRect: () => {},
    fillRect(x: number, y: number, w: number, h: number) {
      rects.push({ x, y, w, h, style: String(this.fillStyle) })
    },
    strokeRect: () => {},
    beginPath: () => {},
    arc: (x: number, _y: number, r: number) => {
      if (r === 15) faces.push(x)
    },
    moveTo: () => {},
    lineTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {}
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects, faces }
}

const flat: PongCourt = { width: 0, height: 400, depth: 600, paddleWidth: 0, paddleHeight: 80, ballRadius: 10, inset: 7, playerSpeed: 8, ticksPerSecond: 60 }
const tunnel: PongCourt = { width: 400, height: 300, depth: 800, paddleWidth: 100, paddleHeight: 75, ballRadius: 12, inset: 10, playerSpeed: 12, ticksPerSecond: 60 }

const scene = (over: Partial<Scene> = {}): Scene => ({
  ball: { x: 0, y: 200, z: 300 },
  paddles: [
    { x: 0, y: 100 },
    { x: 0, y: 300 }
  ],
  serveIn: 0,
  lives: [3, 1],
  ...over
})

describe('drawing the rally', () => {
  // smallcat's layout: yours red and flush with the right edge, theirs
  // green on the left, each centred where the frame says.
  it('puts your paddle on the right in red, from either seat', () => {
    for (const seat of [0, 1] as const) {
      const { ctx, rects } = recorder()
      drawFlat(ctx, flat, seat, scene())
      const red = rects.find(rect => rect.style === NEAR_COLOR)
      const green = rects.find(rect => rect.style === FAR_COLOR)
      expect(red).toEqual({ x: 593, y: seat === 0 ? 60 : 260, w: 7, h: 80, style: NEAR_COLOR })
      expect(green).toEqual({ x: 0, y: seat === 0 ? 260 : 60, w: 7, h: 80, style: FAR_COLOR })
    }
  })

  // Faces along the top: your lives at the right, theirs at the left.
  it('counts each side’s lives in faces on its own side', () => {
    const { ctx, faces } = recorder()
    drawFlat(ctx, flat, 0, scene())
    expect(faces).toEqual([20, 580, 540, 500])
  })

  // In the tunnel your opponent's paddle is far off, so it draws smaller.
  it('draws their paddle at the far end, smaller than yours', () => {
    const { ctx, rects } = recorder()
    drawTunnel(ctx, tunnel, 0, scene({ paddles: [{ x: 200, y: 150 }, { x: 200, y: 150 }] }))
    const far = rects.find(rect => rect.style === FAR_COLOR)
    const near = rects.find(rect => rect.style === 'rgba(255, 0, 0, 0.35)')
    expect(far).toBeDefined()
    expect(near).toBeDefined()
    expect(far!.w).toBeLessThan(near!.w)
  })
})
