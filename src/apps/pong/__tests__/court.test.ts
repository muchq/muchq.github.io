import { describe, expect, it } from 'vitest'
import type { PongCourt, PongFrame } from '../wire'
import { aimFor, canvasPoint, extrapolate, stickTarget, flatPoint, flatSize, pongName, project, tunnelSize, unproject, viewSeat } from '../court'

const flat: PongCourt = {
  width: 0,
  height: 400,
  depth: 600,
  paddleWidth: 0,
  paddleHeight: 80,
  ballRadius: 10,
  inset: 7,
  playerSpeed: 8,
  ticksPerSecond: 60
}

const tunnel: PongCourt = {
  width: 400,
  height: 300,
  depth: 800,
  paddleWidth: 100,
  paddleHeight: 75,
  ballRadius: 12,
  inset: 10,
  playerSpeed: 12,
  ticksPerSecond: 60
}

const frame = (over: Partial<PongFrame> = {}): PongFrame => ({
  gameId: 'GAME01',
  tick: 100,
  ball: { x: 200, y: 150, z: 400 },
  velocity: { x: 1, y: -2, z: 6 },
  paddles: [
    { x: 200, y: 150 },
    { x: 200, y: 150 }
  ],
  serveIn: 0,
  ...over
})

describe('the court on screen', () => {
  // A watcher sees it as the second seat does: the first seat's end on the left.
  it('views from a seat, or from the second seat’s side when watching', () => {
    expect(viewSeat(['alice', 'bob'], 'alice')).toBe(0)
    expect(viewSeat(['alice', 'bob'], 'bob')).toBe(1)
    expect(viewSeat(['alice', 'bob'], 'carol')).toBe(1)
  })

  // smallcat's layout: your end on the right, so the first seat's court is mirrored.
  it('lays the flat court out with your end on the right', () => {
    expect(flatSize(flat)).toEqual({ width: 600, height: 400 })
    expect(flatPoint(flat, 0, { z: 0, y: 30 })).toEqual({ x: 600, y: 30 })
    expect(flatPoint(flat, 0, { z: 600, y: 30 })).toEqual({ x: 0, y: 30 })
    expect(flatPoint(flat, 1, { z: 0, y: 30 })).toEqual({ x: 0, y: 30 })
    expect(flatPoint(flat, 1, { z: 600, y: 30 })).toEqual({ x: 600, y: 30 })
  })

  // From behind your end: its rim fills the canvas, the far end shrinks
  // toward the centre, and the second seat looks back along z, so x mirrors.
  it('projects the tunnel from behind your end', () => {
    const size = tunnelSize(tunnel)
    const centre = { x: size.width / 2, y: size.height / 2 }
    const near = project(tunnel, 0, { x: 0, y: 0, z: 0 })
    expect(near.x).toBeCloseTo(0)
    expect(near.y).toBeCloseTo(0)
    expect(project(tunnel, 0, { x: 400, y: 300, z: 0 }).x).toBeCloseTo(size.width)
    const far = project(tunnel, 0, { x: 0, y: 0, z: 800 })
    expect(far.x).toBeGreaterThan(0)
    expect(far.x).toBeLessThan(centre.x)
    expect(far.scale).toBeLessThan(near.scale)
    expect(project(tunnel, 0, { x: 200, y: 150, z: 500 })).toMatchObject(centre)
    const mirrored = project(tunnel, 1, { x: 0, y: 0, z: 800 })
    expect(mirrored.x).toBeCloseTo(size.width)
    expect(mirrored.y).toBeCloseTo(0)
  })

  // A pointer over the canvas names the court point on your paddle's plane.
  it('reads a pointer back into court units on your paddle’s plane', () => {
    for (const seat of [0, 1] as const) {
      const z = seat === 0 ? tunnel.inset : tunnel.depth - tunnel.inset
      const on = project(tunnel, seat, { x: 120, y: 70, z })
      const back = unproject(tunnel, seat, on)
      expect(back.x).toBeCloseTo(120)
      expect(back.y).toBeCloseTo(70)
    }
    expect(aimFor(flat, 0, { x: 33, y: 250 })).toEqual({ x: 0, y: 250 })
    expect(aimFor(tunnel, 1, project(tunnel, 1, { x: 300, y: 40, z: tunnel.depth - tunnel.inset }))).toEqual({
      x: expect.closeTo(300) as number,
      y: expect.closeTo(40) as number
    })
  })

  // The canvas is drawn contained in its box: capped in height, it is
  // letterboxed at the sides, and a pointer is read through the drawn court.
  it('reads a pointer through the court as drawn, letterboxed or not', () => {
    const size = { width: 600, height: 450 }
    expect(canvasPoint({ left: 10, top: 20, width: 300, height: 225 }, size, { x: 160, y: 132.5 })).toEqual({ x: 300, y: 225 })
    // 720 wide, capped at 450 tall: drawn 600 wide, 60 empty on each side.
    expect(canvasPoint({ left: 0, top: 0, width: 720, height: 450 }, size, { x: 60, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(canvasPoint({ left: 0, top: 0, width: 720, height: 450 }, size, { x: 660, y: 450 })).toEqual({ x: 600, y: 450 })
  })

  // Between frames the ball moves on by its velocity, for no longer than a
  // few dropped frames; waiting to be served, it waits.
  it('moves the ball on between frames, briefly, and not before the serve', () => {
    expect(extrapolate(frame(), tunnel, 0)).toEqual({ x: 200, y: 150, z: 400 })
    expect(extrapolate(frame(), tunnel, 50)).toEqual({ x: 203, y: 144, z: 418 })
    expect(extrapolate(frame(), tunnel, 5000)).toEqual(extrapolate(frame(), tunnel, 100))
    expect(extrapolate(frame({ serveIn: 30 }), tunnel, 50)).toEqual({ x: 200, y: 150, z: 400 })
    expect(extrapolate(frame({ ball: { x: 200, y: 150, z: 790 } }), tunnel, 100).z).toBe(800)
  })

  // A stick held off centre runs the paddle for the edge it points at,
  // in eight directions; near the centre it asks for nothing. The flat
  // court reads only up and down; from behind end 1, x runs right to left.
  it('reads a stick into the edge it runs the paddle for', () => {
    const paddle = { x: 150, y: 120 }
    expect(stickTarget(tunnel, 0, { x: 0.1, y: -0.1 }, paddle)).toBeNull()
    expect(stickTarget(tunnel, 0, { x: 0, y: -1 }, paddle)).toEqual({ x: 150, y: 0 })
    expect(stickTarget(tunnel, 0, { x: 0.8, y: 0.8 }, paddle)).toEqual({ x: 400, y: 300 })
    expect(stickTarget(tunnel, 0, { x: -1, y: 0.1 }, paddle)).toEqual({ x: 0, y: 120 })
    expect(stickTarget(tunnel, 1, { x: -1, y: 0 }, paddle)).toEqual({ x: 400, y: 120 })
    expect(stickTarget(flat, 0, { x: 1, y: 0.1 }, { x: 0, y: 120 })).toBeNull()
    expect(stickTarget(flat, 0, { x: 1, y: 0.9 }, { x: 0, y: 120 })).toEqual({ x: 0, y: 400 })
  })

  it('names smallcat’s bots by their level', () => {
    expect(pongName('smallcat@1')).toBe('smallcat bot (Easy)')
    expect(pongName('smallcat@2')).toBe('smallcat bot (Medium)')
    expect(pongName('smallcat@3')).toBe('smallcat bot (Hard)')
    expect(pongName('alice')).toBe('alice')
  })
})
