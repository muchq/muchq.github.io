import { describe, it, expect } from 'vitest'
import { AvatarTrails } from '../avatarTrails'

// The wake behind each avatar: its last N positions, oldest first, as a
// strip the line pass glows from the newest point.

const at = (x: number): [number, number, number] => [x, 0, 0]
const orange = (): [number, number, number] => [1, 0.5, 0]

describe('AvatarTrails', () => {
  it('keeps the newest N points per avatar, oldest first, indexed in order', () => {
    const trails = new AvatarTrails(3)
    for (const x of [1, 2, 3, 4, 5]) trails.record('a', at(x))
    const [strip] = trails.strips(orange)
    expect(strip.count).toBe(3)
    expect(Array.from(strip.data)).toEqual([3, 0, 0, 0, 4, 0, 0, 1, 5, 0, 0, 2])
    expect(strip.color).toEqual([1, 0.5, 0])
  })

  it('keeps each avatar apart', () => {
    const trails = new AvatarTrails(4)
    trails.record('a', at(1))
    trails.record('b', at(9))
    trails.record('a', at(2))
    const strips = trails.strips(id => (id === 'a' ? [1, 0, 0] : [0, 0, 1]))
    expect(strips.map(s => s.count)).toEqual([2, 1])
    expect(strips[1].color).toEqual([0, 0, 1])
  })

  it('forgets an avatar that has left, and keeps the rest', () => {
    const trails = new AvatarTrails(4)
    trails.record('a', at(1))
    trails.record('b', at(2))
    trails.prune(['b'])
    expect(trails.strips(orange).map(s => s.count)).toEqual([1])
    trails.prune(['b'])
    expect(trails.strips(orange)).toHaveLength(1)
  })

  it('refuses a capacity that could not hold a segment', () => {
    expect(() => new AvatarTrails(1)).toThrow(/capacity/)
    expect(() => new AvatarTrails(2)).not.toThrow()
  })
})
