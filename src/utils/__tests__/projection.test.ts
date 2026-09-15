import { describe, it, expect } from 'vitest'
import { cameraBasis, projectToNdc, shaderRayDir, viewProjection, ndcDepth, transformPoint, DEPTH_RANGE, SHADER_FOV } from '../projection'

// One camera model, three consumers: the ray tracer's ray formula (GLSL),
// the player labels (DOM), and the attractor pass (a matrix). These pin
// that they agree, since a drift between them puts a label or a line on
// the wrong pixel with nothing else failing.

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cam: [number, number, number] = [3, 3, 10]
const target: [number, number, number] = [0, -0.5, 0]
const aspect = 16 / 9

describe('cameraBasis', () => {
  it('is orthonormal and right-handed with world up', () => {
    const { forward, right, up } = cameraBasis(cam, target)
    expect(dot(forward, forward)).toBeCloseTo(1)
    expect(dot(right, right)).toBeCloseTo(1)
    expect(dot(up, up)).toBeCloseTo(1)
    expect(dot(forward, right)).toBeCloseTo(0)
    expect(dot(right, up)).toBeCloseTo(0)
    expect(right[1]).toBeCloseTo(0)
    expect(up[1]).toBeGreaterThan(0)
  })

  // On the inside of a sphere, up is wherever the wall is not.
  it('takes a tilted up and keeps the frame orthonormal around it', () => {
    const tilted: [number, number, number] = [0.6, 0.8, 0]
    const { forward, right, up } = cameraBasis(cam, target, tilted)
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    expect(dot(forward, forward)).toBeCloseTo(1)
    expect(dot(right, right)).toBeCloseTo(1)
    expect(dot(up, up)).toBeCloseTo(1)
    expect(dot(forward, right)).toBeCloseTo(0)
    expect(dot(right, up)).toBeCloseTo(0)
    expect(dot(right, tilted)).toBeCloseTo(0)
    expect(dot(up, tilted)).toBeGreaterThan(0.9)
    expect(dot(forward, right)).toBeCloseTo(0)
    expect(dot(right, up)).toBeCloseTo(0)
  })
})

describe('projectToNdc', () => {
  it('puts the camera target at the centre of the screen', () => {
    const p = projectToNdc(target, cam, target, aspect)
    expect(p).not.toBeNull()
    expect(p!.x).toBeCloseTo(0)
    expect(p!.y).toBeCloseTo(0)
  })

  it('refuses a point behind the camera', () => {
    expect(projectToNdc([6, 6.5, 20], cam, target, aspect)).toBeNull()
  })

  // The label math the hook carried inline before this module: at the
  // shader's fov a point one unit right and one up per unit forward lands
  // at ndc (1/(fov*aspect), 1/fov).
  it('matches the label projection the world always used', () => {
    const { forward, right, up } = cameraBasis(cam, target)
    const d = 5
    const point: [number, number, number] = [
      cam[0] + d * (forward[0] + right[0] + up[0]),
      cam[1] + d * (forward[1] + right[1] + up[1]),
      cam[2] + d * (forward[2] + right[2] + up[2]),
    ]
    const p = projectToNdc(point, cam, target, aspect)!
    expect(p.x).toBeCloseTo(1 / (SHADER_FOV * aspect))
    expect(p.y).toBeCloseTo(1 / SHADER_FOV)
    expect(p.forward).toBeCloseTo(d)
  })

  it('round-trips through the ray the shader would cast for that pixel', () => {
    const basis = cameraBasis(cam, target)
    for (const [nx, ny] of [[0.3, -0.7], [-0.9, 0.2], [0, 0.95]]) {
      const dir = shaderRayDir(nx, ny, basis, aspect)
      const point: [number, number, number] = [cam[0] + 7 * dir[0], cam[1] + 7 * dir[1], cam[2] + 7 * dir[2]]
      const p = projectToNdc(point, cam, target, aspect)!
      expect(p.x).toBeCloseTo(nx)
      expect(p.y).toBeCloseTo(ny)
    }
  })
})

describe('viewProjection', () => {
  it('agrees with projectToNdc on x and y, and with ndcDepth on z, under any up', () => {
    for (const up of [[0, 1, 0], [0.6, 0.8, 0]] as [number, number, number][]) {
      const m = viewProjection(cam, target, aspect, up)
      for (const point of [[1, 2, 3], [-4, 0.5, -2], [0, 10, -40]] as [number, number, number][]) {
        const clip = transformPoint(m, point)
        const ndc = [clip[0] / clip[3], clip[1] / clip[3], clip[2] / clip[3]]
        const p = projectToNdc(point, cam, target, aspect, up)!
        expect(ndc[0]).toBeCloseTo(p.x)
        expect(ndc[1]).toBeCloseTo(p.y)
        expect(ndc[2]).toBeCloseTo(ndcDepth(p.forward))
      }
    }
  })

  it('agrees with projectToNdc on x and y, and with ndcDepth on z', () => {
    const m = viewProjection(cam, target, aspect)
    for (const point of [[1, 2, 3], [-4, 0.5, -2], [0, 10, -40]] as [number, number, number][]) {
      const clip = transformPoint(m, point)
      const ndc = [clip[0] / clip[3], clip[1] / clip[3], clip[2] / clip[3]]
      const p = projectToNdc(point, cam, target, aspect)!
      expect(ndc[0]).toBeCloseTo(p.x)
      expect(ndc[1]).toBeCloseTo(p.y)
      expect(ndc[2]).toBeCloseTo(ndcDepth(p.forward))
    }
  })

  it('maps the near and far planes to the ends of depth', () => {
    expect(ndcDepth(DEPTH_RANGE.near)).toBeCloseTo(-1)
    expect(ndcDepth(DEPTH_RANGE.far)).toBeCloseTo(1)
    expect(ndcDepth(DEPTH_RANGE.near * 3)).toBeGreaterThan(-1)
    expect(ndcDepth(DEPTH_RANGE.near * 3)).toBeLessThan(ndcDepth(DEPTH_RANGE.near * 4))
  })
})
