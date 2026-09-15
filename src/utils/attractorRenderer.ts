import { createShader, createProgram } from './gameUtils'
import { attractorVertexShaderSource, attractorFragmentShaderSource } from './shaders'
import { attractorTrajectory, modelMatrix, type AttractorSpec } from './attractors'
import type { Mat4 } from './projection'

interface Strip {
  spec: AttractorSpec
  vao: WebGLVertexArrayObject
}

// Draws a room's attractors after the ray-traced frame: blended over it,
// tested against the depth it wrote (so the floor and players occlude
// them), writing no depth of their own.
export class AttractorRenderer {
  private constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly program: WebGLProgram,
    private readonly strips: Strip[],
    private readonly u: Record<'viewProj' | 'model' | 'head' | 'count' | 'color' | 'glass', WebGLUniformLocation | null>,
  ) {}

  static create(gl: WebGL2RenderingContext, specs: AttractorSpec[]): AttractorRenderer | null {
    if (specs.length === 0) return null
    const vertex = createShader(gl, gl.VERTEX_SHADER, attractorVertexShaderSource)
    const fragment = vertex && createShader(gl, gl.FRAGMENT_SHADER, attractorFragmentShaderSource)
    const program = vertex && fragment && createProgram(gl, vertex, fragment)
    if (!program) return null
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const indexLocation = gl.getAttribLocation(program, 'a_index')
    const strips = specs.map(spec => {
      // Interleaved x, y, z, index per point.
      const xyz = attractorTrajectory(spec.kind, spec.points)
      const data = new Float32Array(spec.points * 4)
      for (let i = 0; i < spec.points; i++) {
        data[i * 4] = xyz[i * 3]
        data[i * 4 + 1] = xyz[i * 3 + 1]
        data[i * 4 + 2] = xyz[i * 3 + 2]
        data[i * 4 + 3] = i
      }
      const vao = gl.createVertexArray()!
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 16, 0)
      gl.enableVertexAttribArray(indexLocation)
      gl.vertexAttribPointer(indexLocation, 1, gl.FLOAT, false, 16, 12)
      return { spec, vao }
    })
    gl.bindVertexArray(null)
    const u = {
      viewProj: gl.getUniformLocation(program, 'u_viewProj'),
      model: gl.getUniformLocation(program, 'u_model'),
      head: gl.getUniformLocation(program, 'u_head'),
      count: gl.getUniformLocation(program, 'u_count'),
      color: gl.getUniformLocation(program, 'u_color'),
      glass: gl.getUniformLocation(program, 'u_glass'),
    }
    return new AttractorRenderer(gl, program, strips, u)
  }

  draw(viewProj: Mat4, timeSeconds: number, glass: [number, number, number, number]): void {
    const { gl, u } = this
    gl.useProgram(this.program)
    gl.enable(gl.DEPTH_TEST)
    gl.depthMask(false)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniformMatrix4fv(u.viewProj, false, viewProj)
    gl.uniform4f(u.glass, glass[0], glass[1], glass[2], glass[3])
    for (const { spec, vao } of this.strips) {
      gl.bindVertexArray(vao)
      gl.uniformMatrix4fv(u.model, false, modelMatrix(spec.center, spec.scale, spec.spin * timeSeconds))
      gl.uniform1f(u.head, (timeSeconds * spec.speed) % spec.points)
      gl.uniform1f(u.count, spec.points)
      gl.uniform3f(u.color, spec.color[0], spec.color[1], spec.color[2])
      gl.drawArrays(gl.LINE_STRIP, 0, spec.points)
    }
    gl.bindVertexArray(null)
    gl.disable(gl.BLEND)
    gl.depthMask(true)
  }
}
