import { describe, it, expect } from 'vitest'
import { AvatarTrails } from '../avatarTrails'
import { RIBBON_FLOATS_PER_VERTEX } from '../ribbon'

// The wake behind each avatar: the last N places it passed through,
// oldest first, as a ribbon the line pass glows from the newest.

const at = (x: number): [number, number, number] => [x, 0, 0]
const orange = (): [number, number, number] => [1, 0.5, 0]
const above: [number, number, number] = [0, 50, 0]
// Two vertices per point of the path.
const pointsIn = (data: Float32Array) => data.length / RIBBON_FLOATS_PER_VERTEX / 2

describe('AvatarTrails', () => {
  it('keeps the newest N places per avatar, oldest first, indexed in order', () => {
    const trails = new AvatarTrails(3)
    for (const x of [1, 2, 3, 4, 5]) trails.record('a', at(x))
    const [strip] = trails.strips(orange, above)
    expect(strip.points).toBe(3)
    expect(strip.vertices).toBe(6)
    expect(pointsIn(strip.data)).toBe(3)
    // x runs 3, 4, 5 along the path, two vertices each, indexed 0, 1, 2.
    const xs = [0, 2, 4].map(i => strip.data[i * RIBBON_FLOATS_PER_VERTEX])
    expect(xs).toEqual([3, 4, 5])
    const indexes = [0, 2, 4].map(i => strip.data[i * RIBBON_FLOATS_PER_VERTEX + 3])
    expect(indexes).toEqual([0, 1, 2])
    expect(strip.color).toEqual([1, 0.5, 0])
  })

  // Frames are not evenly spaced and an avatar is not always moving, so
  // the wake takes a point by distance travelled rather than by frame:
  // otherwise a slow frame leaves a different path from a fast one, and
  // standing still fills the wake with one place over and over.
  it('takes a point only once the avatar has gone somewhere', () => {
    const trails = new AvatarTrails(10)
    for (let i = 0; i < 20; i++) trails.record('a', [i * 0.02, 0, 0])
    const [strip] = trails.strips(orange, above)
    expect(strip.points).toBeLessThan(5)
    const still = new AvatarTrails(10)
    for (let i = 0; i < 20; i++) still.record('b', at(3))
    expect(still.strips(orange, above)).toHaveLength(0)
  })

  it('keeps each avatar apart', () => {
    const trails = new AvatarTrails(4)
    trails.record('a', at(1))
    trails.record('b', at(9))
    trails.record('a', at(2))
    const strips = trails.strips(id => (id === 'a' ? [1, 0, 0] : [0, 0, 1]), above)
    // b has one place and no path, so it draws nothing at all.
    expect(strips).toHaveLength(1)
    expect(strips[0].points).toBe(2)
    expect(strips[0].color).toEqual([1, 0, 0])
  })

  it('forgets an avatar that has left, and keeps the rest', () => {
    const trails = new AvatarTrails(4)
    trails.record('a', at(1))
    trails.record('a', at(2))
    trails.record('b', at(8))
    trails.record('b', at(9))
    trails.prune(['b'])
    const left = trails.strips(orange, above)
    expect(left).toHaveLength(1)
    expect(left[0].data[0]).toBe(8)
    trails.prune(['b'])
    expect(trails.strips(orange, above)).toHaveLength(1)
  })

  it('refuses a capacity that could not hold a segment', () => {
    expect(() => new AvatarTrails(1)).toThrow(/capacity/)
    expect(() => new AvatarTrails(2)).not.toThrow()
  })
})
