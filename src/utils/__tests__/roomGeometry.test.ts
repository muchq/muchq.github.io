import { describe, it, expect } from 'vitest'
import { ROOM_GEOMETRIES, DEFAULT_ROOM, nextRoom, roomById, roomFragmentShader, RAY_TRACER_UNIFORMS } from '../roomGeometry'
import { SHADER_FOV, depthCoefficients } from '../projection'
import { GAME_CONFIG } from '../gameClasses'

// The room registry is the seam a new geometry lands in: one entry, a
// GLSL block, a list of attractors. These pin what every entry owes.

describe('the registry', () => {
  it('starts on the grid the world always had', () => {
    expect(DEFAULT_ROOM.id).toBe('grid')
    expect(ROOM_GEOMETRIES[0]).toBe(DEFAULT_ROOM)
  })

  it('gives every room a distinct id and label', () => {
    expect(new Set(ROOM_GEOMETRIES.map(r => r.id)).size).toBe(ROOM_GEOMETRIES.length)
    expect(new Set(ROOM_GEOMETRIES.map(r => r.label)).size).toBe(ROOM_GEOMETRIES.length)
  })

  it('cycles through every room and wraps to the first', () => {
    const seen = [DEFAULT_ROOM.id]
    let room = DEFAULT_ROOM
    for (let i = 1; i < ROOM_GEOMETRIES.length; i++) {
      room = nextRoom(room.id)
      seen.push(room.id)
    }
    expect(seen).toEqual(ROOM_GEOMETRIES.map(r => r.id))
    expect(nextRoom(room.id)).toBe(DEFAULT_ROOM)
  })

  it('finds a room by id and nothing by an unknown one', () => {
    expect(roomById('glasshouse')?.label).toBe('Glasshouse')
    expect(roomById('torus')).toBeUndefined()
  })

  it('has a glasshouse with attractors outside its walls and a grid with none', () => {
    expect(roomById('grid')!.attractors).toEqual([])
    const glass = roomById('glasshouse')!
    expect(glass.attractors.length).toBeGreaterThan(0)
    for (const s of glass.attractors) {
      expect(Math.max(Math.abs(s.center[0]), Math.abs(s.center[2])) - s.scale).toBeGreaterThan(GAME_CONFIG.worldBoundary)
    }
  })

  it('gives avatars a wake in the glasshouse and none on the grid', () => {
    expect(roomById('grid')!.trailLength).toBe(0)
    expect(roomById('glasshouse')!.trailLength).toBeGreaterThan(1)
  })
})

describe('roomFragmentShader', () => {
  for (const room of ROOM_GEOMETRIES) {
    describe(room.id, () => {
      const src = roomFragmentShader(room)

      it('declares every uniform the render loop sets', () => {
        for (const name of RAY_TRACER_UNIFORMS) {
          expect(src).toMatch(new RegExp(`uniform \\w+ ${name}(\\[\\d+\\])?;`))
        }
      })

      it('defines each room hook exactly once and the shared main calls both', () => {
        expect(src.match(/vec4 roomWalls\(/g)).toHaveLength(1)
        expect(src).toMatch(/roomWalls\(cameraPos, rayDir/)
        expect(src.match(/vec3 roomAvatar\(/g)).toHaveLength(1)
        expect(src).toMatch(/lighting = roomAvatar\(lighting, sphereColor, hit\.normal, viewDir, hit\.point\)/)
        expect(src.match(/void main\(\)/g)).toHaveLength(1)
      })

      // The camera the labels and the line pass use is the one the rays
      // are cast from: the shader reads the same constants, not copies.
      it('casts rays with the shared fov and writes the shared depth mapping', () => {
        expect(src.match(/float fov = /g)).toHaveLength(1)
        expect(src).toContain(`float fov = ${SHADER_FOV};`)
        const { a, b } = depthCoefficients()
        expect(src).toContain(`const float DEPTH_A = ${a};`)
        expect(src).toContain(`const float DEPTH_B = ${b};`)
        expect(src).toMatch(/gl_FragDepth = .*fragDepth\(/)
      })
    })
  }

  it('gives the glasshouse walls and a rim the grid does not have', () => {
    const grid = roomFragmentShader(roomById('grid')!)
    const glass = roomFragmentShader(roomById('glasshouse')!)
    expect(glass).not.toBe(grid)
    // The grid's hooks are the no-ops; a stray wall or glow in them would
    // change the plaza.
    const noWalls = /vec4 roomWalls\([^)]*\)\s*\{\s*return vec4\(0\.0\);\s*\}/
    const noRim = /vec3 roomAvatar\(vec3 lit[^)]*\)\s*\{\s*return lit;\s*\}/
    expect(grid).toMatch(noWalls)
    expect(grid).toMatch(noRim)
    expect(glass).not.toMatch(noWalls)
    expect(glass).not.toMatch(noRim)
  })
})
