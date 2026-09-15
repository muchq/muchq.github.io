import { describe, it, expect } from 'vitest'
import { RoomPrograms } from '../roomPrograms'
import { ROOM_GEOMETRIES, RAY_TRACER_UNIFORMS, roomById } from '../roomGeometry'
import { fakeGl } from '@/test/fakeGl'

// Each room's ray tracer is compiled once and kept; switching back and
// forth must not recompile, and a room that fails to compile must not
// take the world down with it.

describe('RoomPrograms', () => {
  it('compiles a room on first use and reuses it afterwards', () => {
    const gl = fakeGl()
    const programs = new RoomPrograms(gl)
    const grid = roomById('grid')!
    const glass = roomById('glasshouse')!
    const a = programs.get(grid)
    const b = programs.get(glass)
    const c = programs.get(grid)
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(c).toBe(a)
    expect(b).not.toBe(a)
    // One vertex shader shared, one fragment shader per room.
    expect(gl.createShader).toHaveBeenCalledTimes(1 + 2)
    expect(gl.linkProgram).toHaveBeenCalledTimes(2)
  })

  it('looks up every uniform the render loop sets, per program', () => {
    const gl = fakeGl()
    const programs = new RoomPrograms(gl)
    const p = programs.get(ROOM_GEOMETRIES[0])!
    for (const name of RAY_TRACER_UNIFORMS) {
      expect(p.uniforms[name]).toEqual({ uniform: name })
    }
    expect(p.positionLocation).toBe(0)
  })

  it('returns null for a room whose wall block does not compile, and still builds the others', () => {
    // Only the glasshouse's fragment shader fails; the vertex shader and
    // the grid's fragment shader build.
    const gl = fakeGl({ compiles: src => !src.includes('fresnel') })
    const programs = new RoomPrograms(gl)
    expect(programs.get(roomById('glasshouse')!)).toBeNull()
    expect(gl.deleteShader).toHaveBeenCalledTimes(1)
    expect(gl.linkProgram).not.toHaveBeenCalled()
    expect(programs.get(roomById('grid')!)).not.toBeNull()
  })

  it('returns null when no shader compiles at all', () => {
    const gl = fakeGl({ compiles: false })
    const programs = new RoomPrograms(gl)
    expect(programs.get(ROOM_GEOMETRIES[0])).toBeNull()
    expect(gl.linkProgram).not.toHaveBeenCalled()
  })

  it('returns null when the program does not link', () => {
    const gl = fakeGl({ links: false })
    const programs = new RoomPrograms(gl)
    expect(programs.get(ROOM_GEOMETRIES[0])).toBeNull()
  })
})
