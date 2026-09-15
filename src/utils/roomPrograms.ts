import { createShader, createProgram } from './gameUtils'
import { vertexShaderSource } from './shaders'
import { RAY_TRACER_UNIFORMS, roomFragmentShader, type RayTracerUniform, type RoomGeometry, type RoomGeometryId } from './roomGeometry'

export interface RayTracerProgram {
  program: WebGLProgram
  positionLocation: number
  uniforms: Record<RayTracerUniform, WebGLUniformLocation | null>
}

// One compiled ray tracer per room, built the first time the room is
// shown and kept for the rest of the session. All share the fullscreen
// vertex shader. A room whose shader will not build is null, and the
// caller stays where it was.
export class RoomPrograms {
  private readonly cache = new Map<RoomGeometryId, RayTracerProgram>()
  private vertex: WebGLShader | null = null

  constructor(private readonly gl: WebGL2RenderingContext) {}

  get(room: RoomGeometry): RayTracerProgram | null {
    const cached = this.cache.get(room.id)
    if (cached) return cached
    const gl = this.gl
    this.vertex ??= createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    if (!this.vertex) return null
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, roomFragmentShader(room))
    if (!fragment) return null
    const program = createProgram(gl, this.vertex, fragment)
    if (!program) return null
    const uniforms = {} as Record<RayTracerUniform, WebGLUniformLocation | null>
    for (const name of RAY_TRACER_UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name)
    const built = { program, positionLocation: gl.getAttribLocation(program, 'a_position'), uniforms }
    this.cache.set(room.id, built)
    return built
  }
}
