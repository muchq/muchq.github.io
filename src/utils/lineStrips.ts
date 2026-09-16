import { createShader, createProgram } from './gameUtils'
import { lineVertexShaderSource, lineFragmentShaderSource } from './shaders'
import { attractorTrajectory, modelMatrix, type AttractorSpec } from './attractors'
import type { Mat4, Vec3 } from './projection'

// A ribbon the caller rebuilds every frame: x, y, z, index, edge per
// vertex, two vertices per point of the path.
export interface DynamicStrip {
  data: Float32Array
  // Vertices to draw.
  vertices: number
  // Points of the path, which is what the glow runs along.
  points: number
  color: Vec3
}

interface Geometry {
  vao: WebGLVertexArrayObject
  buffer: WebGLBuffer
}

interface Strip extends Geometry {
  spec: AttractorSpec
}

const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])

// How far back along a wake its head still glows, as a fraction of the
// wake's length.
const WAKE_TAIL = 0.25

// The line pass after the ray-traced frame: attractors uploaded once,
// wakes uploaded every frame, all blended over it, tested against the
// depth it wrote (so players occlude them) and writing none.
export class LineStrips {
  private constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly program: WebGLProgram,
    private readonly strips: Strip[],
    private readonly dynamic: Geometry,
    private readonly u: Record<'viewProj' | 'model' | 'head' | 'count' | 'color' | 'glass' | 'style' | 'time', WebGLUniformLocation | null>,
  ) {}

  static create(gl: WebGL2RenderingContext, attractors: AttractorSpec[]): LineStrips | null {
    const vertex = createShader(gl, gl.VERTEX_SHADER, lineVertexShaderSource)
    const fragment = vertex && createShader(gl, gl.FRAGMENT_SHADER, lineFragmentShaderSource)
    const program = vertex && fragment && createProgram(gl, vertex, fragment)
    if (!program) return null
    const strips: Strip[] = []
    for (const spec of attractors) {
      const geometry = LineStrips.geometry(gl)
      if (!geometry) return null
      // Interleaved x, y, z, index per point.
      const xyz = attractorTrajectory(spec.kind, spec.points)
      const data = new Float32Array(spec.points * 4)
      for (let i = 0; i < spec.points; i++) data.set([xyz[i * 3], xyz[i * 3 + 1], xyz[i * 3 + 2], i], i * 4)
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.buffer)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      strips.push({ ...geometry, spec })
    }
    const dynamic = LineStrips.ribbonGeometry(gl)
    gl.bindVertexArray(null)
    if (!dynamic) return null
    const u = {
      viewProj: gl.getUniformLocation(program, 'u_viewProj'),
      model: gl.getUniformLocation(program, 'u_model'),
      head: gl.getUniformLocation(program, 'u_head'),
      count: gl.getUniformLocation(program, 'u_count'),
      color: gl.getUniformLocation(program, 'u_color'),
      glass: gl.getUniformLocation(program, 'u_glass'),
      style: gl.getUniformLocation(program, 'u_style'),
      time: gl.getUniformLocation(program, 'u_time'),
    }
    return new LineStrips(gl, program, strips, dynamic, u)
  }

  // The same, plus the edge a ribbon's vertex sits on. An attractor's
  // array leaves that attribute off, and reads the 0 of a point dead
  // centre, which is the whole of a wire.
  private static ribbonGeometry(gl: WebGL2RenderingContext): Geometry | null {
    const vao = gl.createVertexArray()
    const buffer = gl.createBuffer()
    if (!vao || !buffer) return null
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 20, 12)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16)
    return { vao, buffer }
  }

  // A vertex array over one buffer of x, y, z, index floats, left bound.
  private static geometry(gl: WebGL2RenderingContext): Geometry | null {
    const vao = gl.createVertexArray()
    const buffer = gl.createBuffer()
    if (!vao || !buffer) return null
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12)
    return { vao, buffer }
  }

  draw(viewProj: Mat4, timeSeconds: number, glass: [number, number, number, number], wakes: DynamicStrip[] = []): void {
    const { gl, u } = this
    if (this.strips.length === 0 && wakes.length === 0) return
    gl.useProgram(this.program)
    gl.enable(gl.DEPTH_TEST)
    gl.depthMask(false)
    gl.enable(gl.BLEND)
    // Attractors are seen through the glass, so they blend over what is
    // behind them.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniformMatrix4fv(u.viewProj, false, viewProj)
    gl.uniform4f(u.glass, glass[0], glass[1], glass[2], glass[3])
    gl.uniform1f(u.time, timeSeconds)
    // A wire has no sides. Which VAO has the edge attribute is per-VAO
    // state, but the value a disabled one reads is the context's, so it
    // is set here rather than assumed.
    gl.vertexAttrib1f(2, 0)
    for (const { spec, vao } of this.strips) {
      gl.bindVertexArray(vao)
      gl.uniformMatrix4fv(u.model, false, modelMatrix(spec.center, spec.scale, spec.spin * timeSeconds))
      gl.uniform1f(u.head, (timeSeconds * spec.speed) % spec.points)
      gl.uniform1f(u.count, spec.points)
      gl.uniform3f(u.color, spec.color[0], spec.color[1], spec.color[2])
      const { bead, tail, twinkle, core } = spec.style
      gl.uniform4f(u.style, bead, tail, twinkle, core)
      gl.drawArrays(gl.LINE_STRIP, 0, spec.points)
    }
    if (wakes.length > 0) {
      // A wake is light an avatar leaves behind, so it adds to the room
      // rather than covering it, and overlapping wakes brighten. It is
      // also in here with you, not out beyond the glass, so none of the
      // tint that the attractors are seen through touches it.
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
      gl.uniform4f(u.glass, 0, 0, 0, 0)
      // A wake is one steady comet: no beads, no shimmer, and a head
      // that whitens as it always did.
      gl.uniform4f(u.style, 0, WAKE_TAIL, 0, 0.45)
      gl.bindVertexArray(this.dynamic.vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamic.buffer)
      gl.uniformMatrix4fv(u.model, false, IDENTITY)
      for (const wake of wakes) {
        gl.bufferData(gl.ARRAY_BUFFER, wake.data, gl.DYNAMIC_DRAW)
        gl.uniform1f(u.head, wake.points - 1)
        gl.uniform1f(u.count, wake.points)
        gl.uniform3f(u.color, wake.color[0], wake.color[1], wake.color[2])
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, wake.vertices)
      }
    }
    gl.bindVertexArray(null)
    gl.disable(gl.BLEND)
    gl.depthMask(true)
  }

  dispose(): void {
    const { gl } = this
    for (const { vao, buffer } of [...this.strips, this.dynamic]) {
      gl.deleteVertexArray(vao)
      gl.deleteBuffer(buffer)
    }
    gl.deleteProgram(this.program)
  }
}
