import { describe, expect, it } from 'vitest'
import type { PongFrame, PongView } from '../wire'
import { hitsBetween, missesBetween, soundFor } from '../sounds'

const frame = (vz: number, over: Partial<PongFrame> = {}): PongFrame => ({
  gameId: 'P1',
  tick: 10,
  ball: { x: 0, y: 200, z: 300 },
  velocity: { x: 0, y: 1, z: vz },
  paddles: [
    { x: 0, y: 200 },
    { x: 0, y: 200 }
  ],
  serveIn: 0,
  ...over
})

const view = (lives: [number, number], over: Partial<PongView> = {}): PongView => ({
  gameId: 'P1',
  phase: 'playing',
  players: [
    { playerId: 'alice', lives: lives[0] },
    { playerId: 'bob', lives: lives[1] }
  ],
  scoreSheet: [],
  ...over
})

describe('pong’s sounds', () => {
  // A hit turns the ball back along the court: heading for end 1 after it,
  // end 0's paddle hit it, and the other way about.
  it('hears a hit where the ball turns back, and whose end turned it', () => {
    expect(hitsBetween(frame(-6), frame(6))).toEqual([0])
    expect(hitsBetween(frame(6), frame(-6))).toEqual([1])
    expect(hitsBetween(frame(6), frame(7))).toEqual([])
    expect(hitsBetween(null, frame(6))).toEqual([])
  })

  // A serve also sets the ball going, and another table's frame is not this rally.
  it('hears no hit in a serve, or across tables', () => {
    expect(hitsBetween(frame(-6, { serveIn: 30 }), frame(6))).toEqual([])
    expect(hitsBetween(frame(-6), frame(6, { serveIn: 30 }))).toEqual([])
    expect(hitsBetween(frame(-6, { gameId: 'P2' }), frame(6))).toEqual([])
  })

  // A point is a life lost; a new game's full lives are none.
  it('hears a miss where a seat’s lives drop', () => {
    expect(missesBetween(view([3, 3]), view([3, 2]))).toEqual([1])
    expect(missesBetween(view([1, 2]), view([0, 2], { phase: 'ended' }))).toEqual([0])
    expect(missesBetween(view([0, 2], { phase: 'ended' }), view([3, 3]))).toEqual([])
    expect(missesBetween(null, view([3, 2]))).toEqual([])
    expect(missesBetween(view([3, 3], { gameId: 'P2' }), view([3, 2]))).toEqual([])
  })

  // smallcat's four, from the viewer's side: boo for your hit, ping for
  // theirs, woo when they miss, mah when you do.
  it('says each from the viewer’s side', () => {
    expect(soundFor('hit', 0, 0)).toBe('boo')
    expect(soundFor('hit', 1, 0)).toBe('ping')
    expect(soundFor('miss', 1, 0)).toBe('woo')
    expect(soundFor('miss', 0, 0)).toBe('mah')
    expect(soundFor('miss', 0, 1)).toBe('woo')
  })
})
