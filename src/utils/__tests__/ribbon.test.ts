import { describe, it, expect } from 'vitest'
import { ribbon, RIBBON_FLOATS_PER_VERTEX } from '../ribbon'
import type { Vec3 } from '../projection'

// A wake has width in the world: two vertices per point, square to the
// eye, tapering into the tail, and nothing at all where there is no path.

const shape = { width: 0.4, taper: 1 }
const vertices = (data: Float32Array) => {
  const out: { at: Vec3; index: number; edge: number }[] = []
  for (let i = 0; i < data.length; i += RIBBON_FLOATS_PER_VERTEX) {
    out.push({ at: [data[i], data[i + 1], data[i + 2]], index: data[i + 3], edge: data[i + 4] })
  }
  return out
}

describe('ribbon', () => {
  it('draws nothing for a path too short to have a direction', () => {
    expect(ribbon([], [0, 0, 10], shape)).toHaveLength(0)
    expect(ribbon([[0, 0, 0]], [0, 0, 10], shape)).toHaveLength(0)
  })

  it('puts two vertices either side of every point, square to the eye', () => {
    const path: Vec3[] = [
      [-2, 0, 0],
      [0, 0, 0],
      [2, 0, 0],
    ]
    // Looking down from above: a path along x spreads along z.
    const built = vertices(ribbon(path, [0, 50, 0], shape))
    expect(built).toHaveLength(6)
    for (let i = 0; i < 3; i++) {
      const [left, right] = [built[i * 2], built[i * 2 + 1]]
      expect(left.index).toBe(i)
      expect(right.index).toBe(i)
      expect(left.edge).toBe(-1)
      expect(right.edge).toBe(1)
      // Square to the path and to the eye: the offset is all in z.
      expect(left.at[0]).toBeCloseTo(path[i][0], 9)
      expect(left.at[1]).toBeCloseTo(0, 9)
      expect(left.at[2]).toBeCloseTo(-right.at[2], 9)
      expect(Math.abs(left.at[2])).toBeGreaterThan(0)
    }
  })

  it('tapers from the avatar back into the tail', () => {
    const path: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0],
    ]
    const built = vertices(ribbon(path, [0, 50, 0], shape))
    const widths = [0, 1, 2, 3].map(i => Math.abs(built[i * 2].at[2] - built[i * 2 + 1].at[2]))
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeGreaterThan(widths[i - 1])
    // The head is the width asked for, either side of the path.
    expect(widths[3]).toBeCloseTo(shape.width * 2, 6)
  })

  it('turns to face the eye, wherever it is', () => {
    const path: Vec3[] = [
      [0, 0, -1],
      [0, 0, 1],
    ]
    // Seen from along x, a path along z spreads in y.
    const built = vertices(ribbon(path, [50, 0, 0], shape))
    expect(Math.abs(built[0].at[1])).toBeGreaterThan(0)
    expect(built[0].at[0]).toBeCloseTo(0, 9)
  })

  it('carries the last direction through points that coincide', () => {
    const path: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
    ]
    const built = vertices(ribbon(path, [0, 50, 0], shape))
    expect(built).toHaveLength(8)
    for (const vertex of built) {
      expect(Number.isFinite(vertex.at[0])).toBe(true)
      expect(Number.isFinite(vertex.at[2])).toBe(true)
    }
    // Still square to the path that got here, not collapsed onto it.
    expect(Math.abs(built[7].at[2])).toBeGreaterThan(0)
  })

  // A wake that doubles back reverses the path's direction under it; the
  // ribbon has no front or back, so it must not reverse with it or the
  // quad between those two points crosses into a bowtie.
  it('keeps its sides the same way round through a turn back on itself', () => {
    const path: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [1.6, 0, 0.6],
      [0.6, 0, 0.6],
    ]
    const built = vertices(ribbon(path, [0, 50, 0], shape))
    for (let i = 1; i < path.length; i++) {
      const before: Vec3 = [
        built[(i - 1) * 2 + 1].at[0] - built[(i - 1) * 2].at[0],
        built[(i - 1) * 2 + 1].at[1] - built[(i - 1) * 2].at[1],
        built[(i - 1) * 2 + 1].at[2] - built[(i - 1) * 2].at[2],
      ]
      const now: Vec3 = [
        built[i * 2 + 1].at[0] - built[i * 2].at[0],
        built[i * 2 + 1].at[1] - built[i * 2].at[1],
        built[i * 2 + 1].at[2] - built[i * 2].at[2],
      ]
      const agrees = before[0] * now[0] + before[1] * now[1] + before[2] * now[2]
      expect(agrees, `point ${i}`).toBeGreaterThan(0)
    }
  })

  it('draws nothing where the path never moves', () => {
    const still: Vec3[] = [
      [2, 0, 2],
      [2, 0, 2],
      [2, 0, 2],
    ]
    expect(ribbon(still, [0, 50, 0], shape)).toHaveLength(0)
  })
})
