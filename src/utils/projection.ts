// One camera model for the world's three consumers: the ray tracer casts
// a ray per pixel from it (GLSL, shaders.ts), the player labels project
// through it (DOM), and the attractor pass rasterises with it (a matrix).
// The tests pin that the three agree; a change here is a change to all.

export type Vec3 = [number, number, number]

// The ray tracer's field-of-view factor: a pixel at the edge of the
// screen leans this far off the forward axis per unit forward.
export const SHADER_FOV = 0.8

// Window depth spans this view-space range, in the ray tracer's
// gl_FragDepth and in the attractor pass's projection alike.
export const DEPTH_RANGE = { near: 0.1, far: 600 } as const

export interface CameraBasis {
  forward: Vec3
  right: Vec3
  up: Vec3
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const normalize = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

// The look-at frame the shader builds: forward at the target, right
// level with the ground, up from the two.
export function cameraBasis(cameraPos: Vec3, target: Vec3): CameraBasis {
  const forward = normalize(sub(target, cameraPos))
  const right = normalize(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  return { forward, right, up }
}

// The direction the shader casts for a screen position in [-1, 1]².
export function shaderRayDir(ndcX: number, ndcY: number, basis: CameraBasis, aspect: number): Vec3 {
  const fov = SHADER_FOV
  const x = ndcX * aspect
  const { forward, right, up } = basis
  return normalize([
    forward[0] + x * right[0] * fov + ndcY * up[0] * fov,
    forward[1] + x * right[1] * fov + ndcY * up[1] * fov,
    forward[2] + x * right[2] * fov + ndcY * up[2] * fov,
  ])
}

export interface Projected {
  x: number
  y: number
  // View-space distance along the camera's forward axis.
  forward: number
}

// Where a world point lands on screen, in [-1, 1]² with y up, or null
// when it is not in front of the camera.
export function projectToNdc(point: Vec3, cameraPos: Vec3, target: Vec3, aspect: number): Projected | null {
  const fov = SHADER_FOV
  const { forward, right, up } = cameraBasis(cameraPos, target)
  const rel = sub(point, cameraPos)
  const f = dot(rel, forward)
  if (f <= 0) return null
  return {
    x: dot(rel, right) / f / fov / aspect,
    y: dot(rel, up) / f / fov,
    forward: f,
  }
}

// The perspective depth mapping, NDC z = a + b / zView, over
// DEPTH_RANGE. The ray tracer's fragDepth is built from these two numbers,
// so the formula lives here once.
export function depthCoefficients(): { a: number; b: number } {
  const { near, far } = DEPTH_RANGE
  return { a: (far + near) / (far - near), b: (-2 * far * near) / (far - near) }
}

// Window-depth NDC z for a view-space distance.
export function ndcDepth(zView: number): number {
  const { a, b } = depthCoefficients()
  return a + b / zView
}

// Column-major 4x4, as WebGL takes it.
export type Mat4 = Float32Array

// The matrix that takes a world point to clip space such that clip / w
// is (projectToNdc.x, projectToNdc.y, ndcDepth(forward)).
export function viewProjection(cameraPos: Vec3, target: Vec3, aspect: number): Mat4 {
  const { forward, right, up } = cameraBasis(cameraPos, target)
  const { a, b } = depthCoefficients()
  const sx = 1 / (SHADER_FOV * aspect)
  const sy = 1 / SHADER_FOV
  // Rows of P·V, then laid down column-major.
  const rows = [
    [sx * right[0], sx * right[1], sx * right[2], -sx * dot(right, cameraPos)],
    [sy * up[0], sy * up[1], sy * up[2], -sy * dot(up, cameraPos)],
    [a * forward[0], a * forward[1], a * forward[2], -a * dot(forward, cameraPos) + b],
    [forward[0], forward[1], forward[2], -dot(forward, cameraPos)],
  ]
  const m = new Float32Array(16)
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) m[col * 4 + row] = rows[row][col]
  return m
}

// m · [p, 1], as [x, y, z, w].
export function transformPoint(m: Mat4, p: Vec3): [number, number, number, number] {
  const out: [number, number, number, number] = [0, 0, 0, 0]
  for (let row = 0; row < 4; row++) {
    out[row] = m[row] * p[0] + m[4 + row] * p[1] + m[8 + row] * p[2] + m[12 + row]
  }
  return out
}
