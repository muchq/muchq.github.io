import { describe, it, expect } from 'vitest'
import { attractorTrajectory, ATTRACTOR_KINDS, attractorsOutside, modelMatrix } from '../attractors'
import { transformPoint } from '../projection'
import { GAME_CONFIG } from '../gameClasses'

describe('attractorTrajectory', () => {
  for (const kind of ATTRACTOR_KINDS) {
    describe(kind, () => {
      const points = 3000
      const xyz = attractorTrajectory(kind, points)

      it('has one xyz triple per point, all finite', () => {
        expect(xyz.length).toBe(points * 3)
        expect(Array.from(xyz).every(Number.isFinite)).toBe(true)
      })

      it('is centred and fits in the unit ball', () => {
        let maxR = 0
        const mean = [0, 0, 0]
        for (let i = 0; i < points; i++) {
          const x = xyz[i * 3], y = xyz[i * 3 + 1], z = xyz[i * 3 + 2]
          mean[0] += x / points; mean[1] += y / points; mean[2] += z / points
          maxR = Math.max(maxR, Math.hypot(x, y, z))
        }
        expect(maxR).toBeLessThanOrEqual(1 + 1e-6)
        expect(maxR).toBeGreaterThan(0.9)
        expect(Math.abs(mean[0])).toBeLessThan(0.3)
        expect(Math.abs(mean[2])).toBeLessThan(0.3)
      })

      // A strange attractor never settles: consecutive points keep moving
      // and the path fills space rather than a line.
      it('keeps moving and does not collapse onto a point or a plane', () => {
        let still = 0
        for (let i = 1; i < points; i++) {
          const d = Math.hypot(xyz[i * 3] - xyz[i * 3 - 3], xyz[i * 3 + 1] - xyz[i * 3 - 2], xyz[i * 3 + 2] - xyz[i * 3 - 1])
          if (d < 1e-6) still++
        }
        expect(still).toBe(0)
        const spread = [0, 1, 2].map(axis => {
          let lo = Infinity, hi = -Infinity
          for (let i = 0; i < points; i++) { lo = Math.min(lo, xyz[i * 3 + axis]); hi = Math.max(hi, xyz[i * 3 + axis]) }
          return hi - lo
        })
        for (const s of spread) expect(s).toBeGreaterThan(0.2)
      })

      it('is deterministic, so every client draws the same curve', () => {
        expect(attractorTrajectory(kind, points)).toEqual(xyz)
      })
    })
  }

  it('rejects a kind it does not integrate', () => {
    expect(() => attractorTrajectory('mandelbrot' as never, 10)).toThrow(/mandelbrot/)
  })
})

describe('attractorsOutside', () => {
  const specs = attractorsOutside(GAME_CONFIG.worldBoundary)

  it('places every attractor wholly outside the walls and above the floor', () => {
    expect(specs.length).toBeGreaterThan(0)
    for (const s of specs) {
      const [cx, cy, cz] = s.center
      expect(Math.max(Math.abs(cx), Math.abs(cz)) - s.scale).toBeGreaterThan(GAME_CONFIG.worldBoundary)
      expect(cy - s.scale).toBeGreaterThan(GAME_CONFIG.groundLevel)
    }
  })

  it('uses more than one kind', () => {
    expect(new Set(specs.map(s => s.kind)).size).toBeGreaterThan(1)
  })

  // The twin: the placement rule, not the fixture, is what holds them out.
  it('moves out with the boundary', () => {
    const wider = attractorsOutside(GAME_CONFIG.worldBoundary * 3)
    for (const s of wider) {
      expect(Math.max(Math.abs(s.center[0]), Math.abs(s.center[2])) - s.scale).toBeGreaterThan(GAME_CONFIG.worldBoundary * 3)
    }
  })
})

describe('modelMatrix', () => {
  it('scales, spins about y, then lands on the centre', () => {
    const m = modelMatrix([10, 5, -20], 4, Math.PI / 2)
    const origin = transformPoint(m, [0, 0, 0])
    expect(origin.slice(0, 3).map(v => +v.toFixed(6))).toEqual([10, 5, -20])
    const x = transformPoint(m, [1, 0, 0])
    expect(x[0]).toBeCloseTo(10)
    expect(x[1]).toBeCloseTo(5)
    expect(x[2]).toBeCloseTo(-24)
    const y = transformPoint(m, [0, 1, 0])
    expect(y[1]).toBeCloseTo(9)
  })
})
