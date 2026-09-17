import { describe, it, expect } from 'vitest'
import { ROOM_GEOMETRIES, DEFAULT_ROOM, GLASSHOUSE_MOONS, GLASSHOUSE_STARS, nextRoom, paletteCss, roomById, roomForGeometry, roomFragmentShader, RAY_TRACER_UNIFORMS } from '../roomGeometry'
import { SHADER_FOV, cameraBasis, depthCoefficients, shaderRayDir, type Vec3 } from '../projection'
import { PALETTE_KEYS, glslFloat, type Palette } from '../shaders'
import { GLASSHOUSE_GEOMETRY, PLANE_GEOMETRY, SPHERE_RADIUS, cameraView, frameAt, sphereGeometry, surfaceFor } from '../surface'
import { CALM_SOUND, CHIPTUNE_SOUND, TECHNO_SOUND } from '../audioSystem'
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

  // Every room is a surface the hub knows by name: the glasshouse is not
  // the plane in different light, because the hub polls deja for a room
  // standing in a glasshouse and for no other.
  it('stands each room on the hub surface it is, and the sphere room on its sphere', () => {
    expect(roomById('grid')!.geometry).toEqual(PLANE_GEOMETRY)
    expect(roomById('glasshouse')!.geometry).toEqual(GLASSHOUSE_GEOMETRY)
    for (const id of ['grid', 'glasshouse']) {
      // A plane ends somewhere, and the shader draws the edge.
      expect(roomById(id)!.bounded).toBe(true)
      // And the floor is the plane's either way, so a step is too.
      expect(surfaceFor(roomById(id)!.geometry).settle([99, 0, 0])).toEqual([GAME_CONFIG.worldBoundary, 0, 0])
    }
    expect(roomById('sphere')!.geometry).toEqual(sphereGeometry(SPHERE_RADIUS))
    expect(roomById('sphere')!.bounded).toBe(false)
  })

  // Only a room with glass has a wall for deja's tape to splat against.
  it('gives the glasshouse glass to draw on and the other rooms none', () => {
    expect(roomById('glasshouse')!.wallHeight).toBeGreaterThan(0)
    expect(roomById('grid')!.wallHeight).toBe(0)
    expect(roomById('sphere')!.wallHeight).toBe(0)
  })

  it('picks the room for the surface the hub names, honouring the one asked for', () => {
    // The surface decides the room; the one being walked toward only
    // breaks a tie between rooms drawing the same surface.
    expect(roomForGeometry(GLASSHOUSE_GEOMETRY).id).toBe('glasshouse')
    expect(roomForGeometry(GLASSHOUSE_GEOMETRY, 'grid').id).toBe('glasshouse')
    expect(roomForGeometry(PLANE_GEOMETRY).id).toBe('grid')
    expect(roomForGeometry(PLANE_GEOMETRY, 'glasshouse').id).toBe('grid')
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

  it('scores each room for the room it is', () => {
    expect(roomById('grid')!.sound).toBe(CALM_SOUND)
    // A glass room at night with things circling outside is a club.
    expect(roomById('glasshouse')!.sound).toBe(TECHNO_SOUND)
    expect(roomById('sphere')!.sound).toBe(CHIPTUNE_SOUND)
  })

  // The room is lit by the people in it, which is why its floor is
  // nearly black on its own and its own shade hook is not the plain one.
  it('lights the glasshouse floor from the avatars standing on it', () => {
    const glasshouse = roomFragmentShader(roomById('glasshouse')!)
    expect(glasshouse).toContain('u_objectCenters[i]')
    expect(glasshouse).toContain('u_objectColors[i]')
    // The numbers, not just the names: a lamp that falls off with
    // distance and is added to what the room already had.
    expect(glasshouse).toContain('for (int i = 0; i < u_numObjects && i < 10; i++)')
    expect(glasshouse).toContain('float fall = 1.0 / (1.0 + dist * dist * 0.06);')
    expect(glasshouse).toContain('pooled += u_objectColors[i] * max(0.0, dot(normal, dir)) * fall;')
    expect(glasshouse).toContain('return lit + pooled * 1.4;')
    expect(glasshouse).not.toMatch(/roomFloorShade\([^)]*\)\s*\{\s*return lit;\s*\}/)
    // The other rooms are lit as they were.
    for (const id of ['grid', 'sphere']) {
      expect(roomFragmentShader(roomById(id)!)).not.toContain('halfway')
    }
  })

  it('hangs a night sky beyond the glass, and only there', () => {
    const glasshouse = roomFragmentShader(roomById('glasshouse')!)
    // Stars live on a lattice of directions, so they turn with the
    // camera and never slide: the sky is meant to read as very far off.
    // Take the scale out and they would swim as you walk.
    expect(glasshouse).toContain(`vec3 lattice = rayDir * ${glslFloat(GLASSHOUSE_STARS.lattice)};`)
    expect(glasshouse).toContain('vec3 cell = floor(lattice);')
    expect(glasshouse).toContain('float pick = hash(cell.xy + cell.z * 113.0);')
    // Sparse: a few cells in a hundred carry one.
    expect(GLASSHOUSE_STARS.threshold).toBeGreaterThan(0.9)
    expect(glasshouse).toContain(`if (pick > ${glslFloat(GLASSHOUSE_STARS.threshold)}) {`)
    expect(glasshouse).toContain('float near = length(fract(lattice) - at);')
    // Only the ray's own cell is hashed, so a disc that reached a face
    // would be cut off flat against a neighbour holding no star. The
    // jitter has to leave the radius room on both sides.
    expect(GLASSHOUSE_STARS.radius).toBeLessThanOrEqual((1 - GLASSHOUSE_STARS.jitter) / 2)
    expect(glasshouse).toContain(`vec3 at = ${glslFloat((1 - GLASSHOUSE_STARS.jitter) / 2)} + ${glslFloat(GLASSHOUSE_STARS.jitter)} * vec3(`)
    expect(glasshouse).toContain(`float shape = smoothstep(${glslFloat(GLASSHOUSE_STARS.radius)}, 0.0, near);`)
    // Twinkle never reaches zero — stars twinkle, they do not blink.
    expect(glasshouse).toContain('float twinkle = 0.62 + 0.38 * sin(u_time * 1.7 + pick * 320.0);')

    // The moons are traced from where the camera actually is, at a
    // great but finite distance, which is the whole of what parallaxes
    // them against the stars. Trace them from the origin instead and
    // the effect is gone.
    expect(GLASSHOUSE_MOONS).toHaveLength(2)
    for (const moon of GLASSHOUSE_MOONS) {
      expect(glasshouse).toContain(`glasshouseMoon(rayOrigin, rayDir, vec3(${moon.centre.map(glslFloat).join(', ')})`)
    }
    expect(glasshouse).toContain('float t = intersectSphere(ro, rd, centre, radius);')

    // Two different sizes, so one reads as nearer than the other.
    expect(new Set(GLASSHOUSE_MOONS.map(moon => moon.radius)).size).toBe(2)

    // The other rooms keep the plain pass-through.
    for (const id of ['grid', 'sphere']) {
      const src = roomFragmentShader(roomById(id)!)
      expect(src).toMatch(/vec3 roomSky\(vec3 rayOrigin, vec3 rayDir, vec3 base\) \{\s*return base;\s*\}/)
      expect(src).not.toContain('glasshouseMoon')
    }
  })

  // A moon you cannot look at is not in the sky. The camera has no
  // pitch control — it looks down at the avatar — so the only sky on
  // screen is a sliver above the horizon, and the first pass put both
  // moons over the top of it. Measured where the complaint lives: in
  // the frame, not in degrees. The horizon sits around 0.63 of the way
  // up, so the whole sky is the top fifth of the picture.
  it('keeps every moon inside the sliver of sky the camera can actually see', () => {
    const surface = surfaceFor(PLANE_GEOMETRY)
    const frame = frameAt(surface, [0, 0, 0])
    const waist = GAME_CONFIG.groundLevel + GAME_CONFIG.sphereRadius + GAME_CONFIG.bounceHeight / 2
    const camera = { distance: 7, height: 4 } // GameState's own defaults
    const { eye, target } = cameraView(surface, frame, frame.position, camera, GAME_CONFIG.groundLevel, waist)
    const basis = cameraBasis(eye, target)
    const elevation = (v: Vec3) => Math.atan2(v[1], Math.hypot(v[0], v[2]))
    // Where an elevation lands up the frame. A ray is forward plus
    // ndcY * up * fov, so its angle off forward has tangent ndcY * fov;
    // the top of the frame is 1 whatever the aspect.
    const pitch = elevation(basis.forward)
    const upFrame = (radians: number) => Math.tan(radians - pitch) / SHADER_FOV
    expect(upFrame(elevation(shaderRayDir(0, 1, basis, 16 / 9)))).toBeCloseTo(1, 3)

    const horizon = upFrame(0)
    expect(horizon).toBeLessThan(1) // else no sky is on screen at all
    // Half a percent of the frame is the smallest gap that still reads
    // as a gap at the heights people actually play at.
    const clear = 0.005
    for (const moon of GLASSHOUSE_MOONS) {
      const centre = elevation(moon.centre as unknown as Vec3)
      const half = Math.atan2(moon.radius, Math.hypot(moon.centre[0], moon.centre[1], moon.centre[2]))
      expect(upFrame(centre - half), `${moon.centre} bottom`).toBeGreaterThan(horizon + clear)
      expect(upFrame(centre + half), `${moon.centre} top`).toBeLessThan(1 - clear)
    }
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
        expect(src.match(/vec3 roomSky\(vec3 rayOrigin, vec3 rayDir, vec3 base\) \{/g)).toHaveLength(1)
        expect(src).toMatch(/return roomSky\(rayOrigin, rayDir, baseColor \+ lightningColor\);/)
        expect(src.match(/void main\(\)/g)).toHaveLength(1)
        // The room block is emitted after the prelude, so the prelude's
        // own call to roomSky only compiles because a prototype comes
        // first. Nothing else in the file needs one, which is exactly
        // why it is easy to drop.
        expect(src.indexOf('vec3 roomSky(vec3 rayOrigin, vec3 rayDir, vec3 base);')).toBeGreaterThan(-1)
        expect(src.indexOf('vec3 roomSky(vec3 rayOrigin, vec3 rayDir, vec3 base);')).toBeLessThan(
          src.indexOf('return roomSky(rayOrigin, rayDir, baseColor + lightningColor);'),
        )
        // A reflected ray starts on the floor, not at the eye. Pass the
        // camera here and anything a room puts at a finite distance
        // reflects from the wrong place.
        expect(src).toContain('vec3 skyColor = getSkyColor(rayOrigin, currentRayDir);')
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

// The tape on the glass is DOM over the canvas, so it needs the room's
// colours as CSS rather than as floats bound for a uniform.
describe('a palette in the browser', () => {
  it('hands the DOM the same glass the shader paints', () => {
    expect(paletteCss(roomById('glasshouse')!.palette.boundary)).toBe('rgb(77, 230, 255)')
    expect(paletteCss(roomById('glasshouse')!.palette.boundary, 0.5)).toBe('rgba(77, 230, 255, 0.5)')
    // A full alpha is plain rgb, not rgba(..., 1).
    expect(paletteCss([0, 0.5, 1], 1)).toBe('rgb(0, 128, 255)')
    // Out of range is clamped, not emitted as nonsense a browser drops.
    expect(paletteCss([-1, 2, 0.5])).toBe('rgb(0, 255, 128)')
  })
})
