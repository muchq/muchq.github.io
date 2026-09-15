import { describe, it, expect } from 'vitest'
import { RoomResources } from '../roomResources'
import { ROOM_GEOMETRIES, RAY_TRACER_UNIFORMS, roomById, type RoomGeometry } from '../roomGeometry'
import { fakeGl } from '@/test/fakeGl'

// Each room's GL resources are built once, on first show, and kept; a
// room that will not build is remembered as such, so the hotkey skips
// it rather than recompiling it on every press.

const grid = roomById('grid')!
const glass = roomById('glasshouse')!
// A third room for the skip cases: the grid's shader under another id.
const third: RoomGeometry = { ...grid, id: 'third' as RoomGeometry['id'], label: 'Third' }
const failsGlass = (src: string) => !src.includes('fresnel')

describe('RoomResources', () => {
  it('builds a room on first use and reuses it afterwards', () => {
    const gl = fakeGl()
    const rooms = new RoomResources(gl)
    const a = rooms.get(grid)
    const b = rooms.get(glass)
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(rooms.get(grid)).toBe(a)
    expect(b).not.toBe(a)
    // One fullscreen vertex shader, one fragment shader per room, and the
    // line pass's two shaders for the room that has something to draw.
    expect(gl.createShader).toHaveBeenCalledTimes(1 + 2 + 2)
  })

  it('looks up every uniform the render loop sets, per program', () => {
    const gl = fakeGl()
    const built = new RoomResources(gl).get(grid)!
    for (const name of RAY_TRACER_UNIFORMS) expect(built.uniforms[name]).toEqual({ uniform: name })
  })

  it('has a line pass only for a room with something to hang or trail', () => {
    const gl = fakeGl()
    const rooms = new RoomResources(gl)
    expect(rooms.get(grid)!.lines).toBeNull()
    expect(rooms.get(glass)!.lines).not.toBeNull()
  })

  it('remembers a room that will not build, and compiles it only once', () => {
    const gl = fakeGl({ compiles: failsGlass })
    const rooms = new RoomResources(gl)
    expect(rooms.get(glass)).toBeNull()
    expect(rooms.get(glass)).toBeNull()
    expect(gl.compileShader).toHaveBeenCalledTimes(2)
    expect(gl.linkProgram).not.toHaveBeenCalled()
    expect(rooms.get(grid)).not.toBeNull()
  })

  it('returns null when the program does not link', () => {
    const gl = fakeGl({ links: false })
    expect(new RoomResources(gl).get(grid)).toBeNull()
  })

  describe('next', () => {
    it('walks the registry in order and wraps', () => {
      const rooms = new RoomResources(fakeGl(), ROOM_GEOMETRIES)
      expect(rooms.next(grid.id)).toBe(glass)
      expect(rooms.next(glass.id)).toBe(grid)
    })

    it('skips a room that will not build', () => {
      const rooms = new RoomResources(fakeGl({ compiles: failsGlass }), [grid, glass, third])
      expect(rooms.next(grid.id)).toBe(third)
      expect(rooms.next(third.id)).toBe(grid)
    })

    it('is null when no other room builds, leaving the caller where it was', () => {
      const rooms = new RoomResources(fakeGl({ compiles: failsGlass }), [grid, glass])
      expect(rooms.next(grid.id)).toBeNull()
    })
  })

  it('frees what it built on dispose', () => {
    const gl = fakeGl()
    const rooms = new RoomResources(gl)
    rooms.get(grid)
    rooms.get(glass)
    rooms.dispose()
    // Two room programs and the line pass's.
    expect(gl.deleteProgram).toHaveBeenCalledTimes(3)
    expect(gl.deleteVertexArray).toHaveBeenCalled()
    expect(gl.deleteBuffer).toHaveBeenCalled()
  })
})
