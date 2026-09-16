import { describe, it, expect } from 'vitest'
import { attractorTrajectory, ATTRACTOR_KINDS, attractorsOutside, cometStretch, COMET_LIMIT, modelMatrix } from '../attractors'
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

      // Centred on its bounding box, so a spec's centre is where the
      // curve visually sits, and scaled so its farthest point is at 1.
      it('is centred on its bounding box and reaches the unit sphere', () => {
        let maxR = 0
        for (let axis = 0; axis < 3; axis++) {
          let lo = Infinity, hi = -Infinity
          for (let i = 0; i < points; i++) { lo = Math.min(lo, xyz[i * 3 + axis]); hi = Math.max(hi, xyz[i * 3 + axis]) }
          expect(hi + lo).toBeCloseTo(0, 5)
        }
        for (let i = 0; i < points; i++) maxR = Math.max(maxR, Math.hypot(xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2]))
        expect(maxR).toBeCloseTo(1, 5)
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

  // Four systems that look like four systems: the same curve under two
  // names would be four panes of the same thing again.
  it('draws a different shape for every kind', () => {
    const signature = (kind: (typeof ATTRACTOR_KINDS)[number]) => {
      const points = 3000
      const xyz = attractorTrajectory(kind, points)
      let mean = 0
      let inner = 0
      const spread = [0, 0, 0]
      for (let i = 0; i < points; i++) {
        const r = Math.hypot(xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2])
        mean += r / points
        if (r < 0.5) inner += 1 / points
      }
      for (let axis = 0; axis < 3; axis++) {
        let lo = Infinity, hi = -Infinity
        for (let i = 0; i < points; i++) { lo = Math.min(lo, xyz[i * 3 + axis]); hi = Math.max(hi, xyz[i * 3 + axis]) }
        spread[axis] = hi - lo
      }
      // How round it is, how much of it sits near the middle, and how
      // flat: three ways for two curves to be the same shape.
      return [mean, inner, spread[1] / Math.max(spread[0], spread[2])]
    }
    const signatures = ATTRACTOR_KINDS.map(signature)
    for (let a = 0; a < signatures.length; a++) {
      for (let b = a + 1; b < signatures.length; b++) {
        const apart = signatures[a].map((v, i) => Math.abs(v - signatures[b][i]))
        expect(Math.max(...apart)).toBeGreaterThan(0.06)
      }
    }
  })

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

  // Seen from the middle of the room, each one spans more of the view
  // than the walls' height does: gigantic, not an ornament.
  it('looks gigantic from the middle of the room', () => {
    for (const s of specs) {
      const distance = Math.hypot(s.center[0], s.center[2])
      const angularDiameter = (2 * Math.atan(s.scale / distance) * 180) / Math.PI
      expect(angularDiameter).toBeGreaterThanOrEqual(40)
    }
  })

  // Four panes, four different things to look at: the same curve twice
  // would make two walls of the room say the same thing.
  it('shows a different system through every pane', () => {
    expect(specs).toHaveLength(4)
    expect(new Set(specs.map(s => s.kind)).size).toBe(specs.length)
    const walls = specs.map(s => (Math.abs(s.center[0]) > Math.abs(s.center[2]) ? (s.center[0] > 0 ? 'E' : 'W') : s.center[2] > 0 ? 'S' : 'N'))
    expect(new Set(walls).size).toBe(4)
  })

  // And drawn differently: a comet, a chain of beads, a drift of sparks,
  // a hard spark. Colour alone would leave four of the same thing.
  it('draws every one of them its own way', () => {
    const styles = specs.map(s => JSON.stringify(s.style))
    expect(new Set(styles).size).toBe(specs.length)
    expect(specs.filter(s => s.style.bead > 0)).toHaveLength(1)
    expect(specs.filter(s => s.style.twinkle > 0)).toHaveLength(1)
    // Heads that reach a long way back and heads that barely glow.
    const tails = specs.map(s => s.style.tail).sort((a, b) => a - b)
    expect(tails.at(-1)! / tails[0]).toBeGreaterThan(5)
    // Taken at different resolutions, so one reads smooth and one coarse.
    expect(new Set(specs.map(s => s.points)).size).toBe(specs.length)
    // Comets of their own sizes, and one wall with none at all.
    expect(specs.filter(s => s.style.comet === 0)).toHaveLength(1)
    const comets = specs.filter(s => s.style.comet > 0).map(s => s.style.comet)
    expect(new Set(comets).size).toBe(comets.length)
    for (const s of specs) {
      expect(s.style.tail).toBeGreaterThan(0)
      expect(s.style.core).toBeGreaterThan(0)
    }
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

// The comet is the lit stretch drawn as a ribbon rather than a wire. A
// curve is a loop, so the stretch behind the head wraps round its end.
describe('cometStretch', () => {
  it('reads the points just behind the head, oldest first', () => {
    expect(cometStretch(10, 6, 4)).toEqual([3, 4, 5, 6])
    expect(cometStretch(10, 6.9, 4)).toEqual([3, 4, 5, 6])
  })

  it('wraps round the end of the curve rather than stopping at it', () => {
    expect(cometStretch(10, 1, 4)).toEqual([8, 9, 0, 1])
    expect(cometStretch(10, 0, 3)).toEqual([8, 9, 0])
    for (const index of cometStretch(10, 0, 3)) {
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(10)
    }
  })

  it('draws nothing where there is no stretch to draw', () => {
    expect(cometStretch(10, 5, 1)).toEqual([])
    expect(cometStretch(10, 5, 0)).toEqual([])
  })

  it('never asks for more of a curve than there is, or than is worth it', () => {
    expect(cometStretch(10, 5, 50)).toHaveLength(10)
    expect(cometStretch(5000, 0, 5000)).toHaveLength(COMET_LIMIT)
  })
})
