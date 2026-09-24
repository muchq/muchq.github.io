import { createShader, createProgram } from './gameUtils'
import { vertexShaderSource } from './shaders'
import { LineStrips } from './lineStrips'
import { RAY_TRACER_UNIFORMS, ROOM_GEOMETRIES, roomFragmentShader, type RayTracerUniform, type RoomGeometry, type RoomGeometryId } from './roomGeometry'

export interface BuiltRoom {
  program: WebGLProgram
  uniforms: Record<RayTracerUniform, WebGLUniformLocation | null>
  // Null for a room with nothing to hang and no wakes.
  lines: LineStrips | null
}

// Each room's GL resources, built the first time the room is shown and
// kept for the session. All share the fullscreen vertex shader. A room
// that will not build is remembered as null, so it is never rebuilt on
// every press and the cycle steps past it.
export class RoomResources {
  private readonly built = new Map<RoomGeometryId, BuiltRoom | null>()
  private vertex: WebGLShader | null = null

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly rooms: readonly RoomGeometry[] = ROOM_GEOMETRIES,
  ) {}

  get(room: RoomGeometry): BuiltRoom | null {
    const cached = this.built.get(room.id)
    if (cached !== undefined) return cached
    const result = this.build(room)
    this.built.set(room.id, result)
    return result
  }

  // Tried and would not build. A room never tried has not failed.
  failed(room: RoomGeometry): boolean {
    return this.built.get(room.id) === null
  }

  // The first room after `id` in the registry that builds, wrapping; null
  // when none does.
  next(id: RoomGeometryId): RoomGeometry | null {
    const start = this.rooms.findIndex(r => r.id === id)
    for (let step = 1; step < this.rooms.length; step++) {
      const room = this.rooms[(start + step) % this.rooms.length]
      if (this.get(room)) return room
    }
    return null
  }

  private build(room: RoomGeometry): BuiltRoom | null {
    const gl = this.gl
    this.vertex ??= createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    if (!this.vertex) return null
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, roomFragmentShader(room))
    if (!fragment) return null
    const program = createProgram(gl, this.vertex, fragment)
    if (!program) return null
    const uniforms = {} as Record<RayTracerUniform, WebGLUniformLocation | null>
    for (const name of RAY_TRACER_UNIFORMS) uniforms[name] = gl.getUniformLocation(program, name)
    const wantsLines = room.attractors.length > 0 || room.trailLength > 0
    const lines = wantsLines ? LineStrips.create(gl, room.attractors) : null
    if (wantsLines && !lines) {
      gl.deleteProgram(program)
      return null
    }
    return { program, uniforms, lines }
  }

  dispose(): void {
    for (const built of this.built.values()) {
      if (!built) continue
      built.lines?.dispose()
      this.gl.deleteProgram(built.program)
    }
    this.built.clear()
    if (this.vertex) this.gl.deleteShader(this.vertex)
    this.vertex = null
  }
}
