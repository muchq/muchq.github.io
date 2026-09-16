import { describe, it, expect } from 'vitest'
import { ROOM_GEOMETRIES, DEFAULT_ROOM, nextRoom, roomById, roomForGeometry, roomFragmentShader, RAY_TRACER_UNIFORMS } from '../roomGeometry'
import { SHADER_FOV, depthCoefficients } from '../projection'
import { PALETTE_KEYS, glslFloat, type Palette } from '../shaders'
import { PLANE_GEOMETRY, SPHERE_RADIUS, sphereGeometry } from '../surface'
import { CALM_SOUND, CHIPTUNE_SOUND } from '../audioSystem'
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
    expect(roomById('sphere')?.label).toBe('Sphere')
    expect(roomById('torus')).toBeUndefined()
  })

  it('stands the plane rooms on the hub plane and the sphere room on its sphere', () => {
    for (const id of ['grid', 'glasshouse']) {
      expect(roomById(id)!.geometry).toEqual(PLANE_GEOMETRY)
      // A plane ends somewhere, and the shader draws the edge.
      expect(roomById(id)!.bounded).toBe(true)
    }
    expect(roomById('sphere')!.geometry).toEqual(sphereGeometry(SPHERE_RADIUS))
    expect(roomById('sphere')!.bounded).toBe(false)
  })

  it('picks the room for the surface the hub names, honouring the one asked for', () => {
    // Two rooms stand on the plane: the one being walked toward wins,
    // and the first is the fallback for anyone else's change.
    expect(roomForGeometry(PLANE_GEOMETRY, 'glasshouse').id).toBe('glasshouse')
    expect(roomForGeometry(PLANE_GEOMETRY).id).toBe('grid')
    expect(roomForGeometry(PLANE_GEOMETRY, 'sphere').id).toBe('grid')
    expect(roomForGeometry(sphereGeometry(SPHERE_RADIUS), 'grid').id).toBe('sphere')
    // A room is a look, not a size: one sphere room draws any sphere the
    // hub allows, and the renderer stands the world on the hub's radius.
    expect(roomForGeometry(sphereGeometry(7)).id).toBe('sphere')
    expect(roomForGeometry(sphereGeometry(999), 'glasshouse').id).toBe('sphere')
  })

  it('hangs nothing outside the sphere room and trails no wake there', () => {
    expect(roomById('sphere')!.attractors).toEqual([])
    expect(roomById('sphere')!.trailLength).toBe(0)
  })

  it('keeps the plane rooms reflective and the sphere room flat', () => {
    expect(roomById('grid')!.reflect).toBe(1)
    expect(roomById('glasshouse')!.reflect).toBe(1)
    expect(roomById('sphere')!.reflect).toBe(0)
  })

  it('scores the plane rooms as the world always was and the sphere room as a cartridge', () => {
    expect(roomById('grid')!.sound).toBe(CALM_SOUND)
    expect(roomById('glasshouse')!.sound).toBe(CALM_SOUND)
    expect(roomById('sphere')!.sound).toBe(CHIPTUNE_SOUND)
  })

  it('has no fog in the sphere room, where the far wall is the point', () => {
    expect(roomById('grid')!.fog).toBeGreaterThan(0)
    expect(roomById('sphere')!.fog).toBe(0)
  })

  it('keeps the grid checker its size and gives the sphere room blocks', () => {
    expect(roomById('grid')!.block).toBe(0.5)
    expect(roomById('glasshouse')!.block).toBe(0.5)
    expect(roomById('sphere')!.block).toBeGreaterThanOrEqual(2)
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

      it('defines each room hook exactly once and the shared shader calls each', () => {
        expect(src.match(/vec4 roomWalls\(/g)).toHaveLength(1)
        expect(src).toMatch(/roomWalls\(cameraPos, rayDir/)
        expect(src.match(/vec3 roomAvatar\(/g)).toHaveLength(1)
        expect(src).toMatch(/lighting = roomAvatar\(lighting, sphereColor, hit\.normal, viewDir, hit\.point\)/)
        expect(src.match(/Floor roomFloor\(/g)).toHaveLength(1)
        expect(src).toMatch(/Floor ground = roomFloor\(rayOrigin, rayDir\)/)
        expect(src.match(/vec3 roomFloorShade\(/g)).toHaveLength(1)
        expect(src).toMatch(/lighting = roomFloorShade\(lighting, floorColor, hit\.normal, viewDir, hit\.point\)/)
        expect(src.match(/void main\(\)/g)).toHaveLength(1)
        expect(src).toContain(`const float ROOM_FOG = ${glslFloat(room.fog)};`)
        expect(src).toContain(`const float ROOM_BLOCK = ${glslFloat(room.block)};`)
        expect(src).toContain(`const float ROOM_REFLECT = ${glslFloat(room.reflect)};`)
        expect(src).toContain('floor(floorCoord / ROOM_BLOCK)')
        // The checker and the boundary read the room's plane coordinate,
        // not where the ray landed in space.
        expect(src).toContain('vec2 floorCoord = hit.coord;')
        expect(src).toContain('abs(floorCoord.x - boundary)')
        expect(src).toContain('abs(floorCoord.y - boundary)')
        expect(src).not.toContain('hit.point.x - boundary')
        // Cubes and pyramids stand on the room's ground.
        expect(src).toContain('mat3 frame = frameOf(u_objectUps[i]);')
        expect(src).toContain('hit.normal = frame * localNormal;')
        // Reflections bounce by the room's say-so.
        expect(src).toContain('reflectivity *= 0.3 * ROOM_REFLECT;')
        expect(src).toContain('reflectivity *= 0.1 * ROOM_REFLECT;')
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
        // The room's up, not the world's, squares the frame the rays are cast in.
        expect(src).toMatch(/cross\(forward, u_cameraUp\)/)
      })
    })
  }

  it('paints each room from its own palette, with no colour left hardcoded', () => {
    for (const room of ROOM_GEOMETRIES) {
      const src = roomFragmentShader(room)
      for (const key of PALETTE_KEYS) {
        const [r, g, b] = room.palette[key]
        expect(src).toContain(`const vec3 PALETTE_${key} = vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)});`)
        // Declared once and read at least once.
        expect(src.split(`PALETTE_${key}`).length - 1).toBeGreaterThanOrEqual(2)
      }
      // The colours the sky and floor were once written with.
      expect(src).not.toContain('vec3(0.48, 0.64, 0.8)')
      expect(src).not.toContain('vec3(0.9, 0.9, 0.95)')
      expect(src).not.toContain('vec3(0.0, 0.0, 0.0); // Black boundary')
    }
  })

  it('keeps the grid the colours the world always had', () => {
    expect(roomById('grid')!.palette).toEqual<Palette>({
      skyHorizon: [0.48, 0.64, 0.8],
      skyZenith: [0.64, 0.72, 0.8],
      cloud: [0.72, 0.76, 0.8],
      lightning: [0.9, 0.95, 1.0],
      floorLight: [0.9, 0.9, 0.95],
      floorDark: [0.7, 0.7, 0.8],
      boundary: [0.0, 0.0, 0.0],
    })
  })

  // Switching rooms has to read as a change of place, not of trim.
  it('makes the glasshouse starkly darker than the grid, with a boundary that glows instead', () => {
    const lum = ([r, g, b]: [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
    const grid = roomById('grid')!.palette
    const glass = roomById('glasshouse')!.palette
    expect(lum(grid.skyHorizon) - lum(glass.skyHorizon)).toBeGreaterThan(0.4)
    expect(lum(grid.floorLight) - lum(glass.floorLight)).toBeGreaterThan(0.4)
    expect(lum(grid.floorDark) - lum(glass.floorDark)).toBeGreaterThan(0.4)
    expect(lum(glass.boundary) - lum(grid.boundary)).toBeGreaterThan(0.4)
  })

  it('gives the grid and the glasshouse the flat floor, and the sphere room its own, with no sky on it', () => {
    const plane = /Floor roomFloor\([^)]*\)\s*\{\s*return planeFloor\(ro, rd\);\s*\}/
    expect(roomFragmentShader(roomById('grid')!)).toMatch(plane)
    expect(roomFragmentShader(roomById('glasshouse')!)).toMatch(plane)
    const sphere = roomFragmentShader(roomById('sphere')!)
    expect(sphere).not.toMatch(plane)
    // The wall is wherever the hub put it, not a number baked in here.
    expect(sphere).not.toContain('const float SPHERE_RADIUS')
    expect(sphere).toContain('intersectSphere(ro, rd, vec3(0.0), u_surfaceRadius)')
    expect(RAY_TRACER_UNIFORMS).toContain('u_surfaceRadius')
    // The whole wall is floor: no patch of it is parameterised, so
    // nothing bounds where the checker is drawn.
    expect(sphere).not.toContain('SPHERE_WRAP')
    expect(sphere).not.toContain('SPHERE_LAT')
    expect(sphere).toContain('const float ROOM_BOUNDED = 0.0;')
    expect(roomFragmentShader(roomById('grid')!)).toContain('const float ROOM_BOUNDED = 1.0;')
    // A sphere is a sphere: the wall goes all the way round, and nothing
    // in the shader paints sky on it.
    expect(sphere).not.toMatch(/\.sky\b/)
    expect(sphere).not.toContain('getSkyColor(-hit.normal)')
  })

  // A cartridge afternoon: green and brown blocks under red trim, and no
  // storm; the grid's grey gets nowhere near it.
  it('paints the sphere room in a cartoon palette, far from the grid in colour', () => {
    const grid = roomById('grid')!.palette
    const mario = roomById('sphere')!.palette
    const gap = (a: [number, number, number], b: [number, number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
    expect(gap(grid.floorLight, mario.floorLight)).toBeGreaterThan(0.5)
    expect(gap(grid.floorDark, mario.floorDark)).toBeGreaterThan(0.3)
    expect(gap(grid.boundary, mario.boundary)).toBeGreaterThan(0.5)
    expect(mario.lightning).toEqual([0, 0, 0])
  })

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
