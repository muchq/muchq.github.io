import { flatPoint, flatSize, project, tunnelSize, type Seat } from './court'
import type { PongCourt, PongVector } from './wire'

// One animation frame of the rally, in either layout. Your paddle is red
// and your opponent's green, as on smallcat.dog; a watcher's red is the
// second seat's.

export interface Scene {
  ball: PongVector
  // Paddle centres in seat order.
  paddles: ReadonlyArray<{ x: number; y: number }>
  // Ticks until the serve.
  serveIn: number
  // Lives in seat order.
  lives: readonly number[]
}

export const NEAR_COLOR = 'red'
export const FAR_COLOR = 'green'
const BALL_COLOR = 'rgba(240, 90, 240, 1.0)'

const faceAt = (ctx: CanvasRenderingContext2D, x: number) => {
  const y = 20
  ctx.beginPath()
  ctx.arc(x, y, 15, 0, Math.PI * 2, true)
  ctx.moveTo(x + 5, y)
  ctx.arc(x, y, 10, 0, Math.PI, false)
  ctx.moveTo(x - 5, y - 5)
  ctx.arc(x - 5, y - 5, 4, 0, Math.PI * 2, true)
  ctx.moveTo(x + 5, y - 5)
  ctx.arc(x + 5, y - 5, 4, 0, Math.PI * 2, true)
  ctx.stroke()
}

const serveText = (ctx: CanvasRenderingContext2D, court: PongCourt, scene: Scene, width: number, height: number, color: string) => {
  if (scene.serveIn <= 0) return
  ctx.fillStyle = color
  ctx.font = '24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`Serve in ${Math.ceil(scene.serveIn / court.ticksPerSecond)}`, width / 2, height / 2 - 40)
}

// smallcat's court: lives as faces along the top, each paddle flush with
// its end.
export const drawFlat = (ctx: CanvasRenderingContext2D, court: PongCourt, seat: Seat, scene: Scene) => {
  const { width, height } = flatSize(court)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = 'black'
  ctx.lineWidth = 1
  const left = (1 - seat) as Seat
  for (let i = 0; i < (scene.lives[left] ?? 0); i++) faceAt(ctx, 20 + 40 * i)
  for (let i = 0; i < (scene.lives[seat] ?? 0); i++) faceAt(ctx, width - 20 - 40 * i)

  const ball = flatPoint(court, seat, scene.ball)
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, court.ballRadius, 0, Math.PI * 2)
  ctx.fillStyle = BALL_COLOR
  ctx.fill()
  ctx.stroke()

  scene.paddles.forEach((paddle, end) => {
    const rim = flatPoint(court, seat, { z: end === 0 ? 0 : court.depth, y: 0 }).x
    const face = flatPoint(court, seat, { z: end === 0 ? court.inset : court.depth - court.inset, y: 0 }).x
    ctx.fillStyle = end === seat ? NEAR_COLOR : FAR_COLOR
    ctx.fillRect(Math.min(rim, face), paddle.y - court.paddleHeight / 2, Math.abs(face - rim), court.paddleHeight)
  })
  serveText(ctx, court, scene, width, height, 'black')
}

const TUNNEL_LINE = 'rgba(80, 220, 120, 0.6)'
const RINGS = 6

// The rectangle across the court at depth z, from the seat's eye.
const ring = (court: PongCourt, seat: Seat, z: number) => {
  const a = project(court, seat, { x: 0, y: 0, z })
  const b = project(court, seat, { x: court.width, y: court.height, z })
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

const paddleRect = (court: PongCourt, seat: Seat, end: number, paddle: { x: number; y: number }) => {
  const z = end === 0 ? court.inset : court.depth - court.inset
  const a = project(court, seat, { x: paddle.x - court.paddleWidth / 2, y: paddle.y - court.paddleHeight / 2, z })
  const b = project(court, seat, { x: paddle.x + court.paddleWidth / 2, y: paddle.y + court.paddleHeight / 2, z })
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

// The tunnel from behind your end: its walls as rings down the depth, the
// ball's own ring to say how far off it is, your opponent's paddle at the
// far end and yours, see-through, at the near one.
export const drawTunnel = (ctx: CanvasRenderingContext2D, court: PongCourt, seat: Seat, scene: Scene) => {
  const { width, height } = tunnelSize(court)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, width, height)
  ctx.lineWidth = 1
  ctx.strokeStyle = TUNNEL_LINE
  for (let i = 0; i <= RINGS; i++) {
    const r = ring(court, seat, (court.depth * i) / RINGS)
    ctx.strokeRect(r.x, r.y, r.w, r.h)
  }
  const near = ring(court, seat, 0)
  const far = ring(court, seat, court.depth)
  ctx.beginPath()
  for (const [nx, ny, fx, fy] of [
    [near.x, near.y, far.x, far.y],
    [near.x + near.w, near.y, far.x + far.w, far.y],
    [near.x, near.y + near.h, far.x, far.y + far.h],
    [near.x + near.w, near.y + near.h, far.x + far.w, far.y + far.h]
  ]) {
    ctx.moveTo(nx, ny)
    ctx.lineTo(fx, fy)
  }
  ctx.stroke()

  const opponent = (1 - seat) as Seat
  const theirs = scene.paddles[opponent]
  if (theirs !== undefined) {
    const r = paddleRect(court, seat, opponent, theirs)
    ctx.fillStyle = FAR_COLOR
    ctx.fillRect(r.x, r.y, r.w, r.h)
  }

  const depthRing = ring(court, seat, scene.ball.z)
  ctx.strokeStyle = 'rgba(240, 90, 240, 0.8)'
  ctx.strokeRect(depthRing.x, depthRing.y, depthRing.w, depthRing.h)
  const ball = project(court, seat, scene.ball)
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, court.ballRadius * ball.scale, 0, Math.PI * 2)
  ctx.fillStyle = BALL_COLOR
  ctx.fill()

  const mine = scene.paddles[seat]
  if (mine !== undefined) {
    const r = paddleRect(court, seat, seat, mine)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.35)'
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = NEAR_COLOR
    ctx.strokeRect(r.x, r.y, r.w, r.h)
  }
  serveText(ctx, court, scene, width, height, 'white')
}
