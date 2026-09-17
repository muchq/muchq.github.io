import {
  composeFragmentShader,
  glslFloat,
  NO_ROOM_GLSL,
  NO_WALLS_GLSL,
  PLAIN_SKY_GLSL,
  PLANE_FLOOR_GLSL,
  type Palette,
} from './shaders'
import { attractorsOutside, type AttractorSpec } from './attractors'
import { GAME_CONFIG } from './gameClasses'
import type { Vec3 } from './projection'
import { GLASSHOUSE_GEOMETRY, PLANE_GEOMETRY, sphereGeometry, sameSurfaceKind, type Geometry } from './surface'
import { CALM_SOUND, CHIPTUNE_SOUND, TECHNO_SOUND, type SoundProfile } from './audioSystem'

// The rooms the world can be: each is a palette the sky and floor are
// painted in, the surface the hub keeps its players on (MoonBase#1554),
// how the shared tracer is tuned there (fog, block size, reflections), a
// GLSL block the ray tracer calls for its ground, walls and shading (see
// shaders.ts), the attractors hung outside, the tint those take on
// through the glass, how long a wake an avatar leaves, and what it
// sounds like. A new room is a new entry here.
//
// Every room is a surface the hub knows by name, so stepping between
// them is the room's business and not this client's: the hotkey asks the
// hub, and everyone standing there redraws together. The glasshouse
// walks exactly as the grid does and is still its own surface, because
// the hub polls deja for a room standing in one. The hotkey cycles the
// list in order.

export type RoomGeometryId = 'grid' | 'glasshouse' | 'sphere'

export interface RoomGeometry {
  id: RoomGeometryId
  label: string
  palette: Palette
  // The surface the hub holds this room's players on.
  geometry: Geometry
  // Whether the floor has an edge to draw; a sphere closes on itself.
  bounded: boolean
  // Distance fog density; 0 for none.
  fog: number
  // Side of a checker cell, in plane units.
  block: number
  // How much a surface reflects the next bounce; 0 keeps colours flat.
  reflect: number
  glsl: string
  attractors: AttractorSpec[]
  // rgb and strength of the wall between the camera and the line pass.
  behindGlass: [number, number, number, number]
  // How tall this room's glass is drawn, in plane units; 0 for a room
  // with no glass. No height rides the wire — a tape splat's `v` is a
  // fraction of this — so it is the client's own choice, and a room
  // without walls has nothing to splat against.
  wallHeight: number
  // Points in an avatar's wake; 0 for none.
  trailLength: number
  sound: SoundProfile
}

// The uniforms the render loop sets every frame; every room's shader
// must declare them, and RoomResources looks each one up.
export const RAY_TRACER_UNIFORMS = [
  'u_resolution',
  'u_cameraPos',
  'u_cameraTarget',
  'u_cameraUp',
  'u_time',
  'u_worldBoundary',
  'u_surfaceRadius',
  'u_numObjects',
  'u_objectCenters',
  'u_objectColors',
  'u_objectShapes',
  'u_objectUps',
] as const
export type RayTracerUniform = (typeof RAY_TRACER_UNIFORMS)[number]

// The stormy afternoon the world always had.
const GRID_PALETTE: Palette = {
  skyHorizon: [0.48, 0.64, 0.8],
  skyZenith: [0.64, 0.72, 0.8],
  cloud: [0.72, 0.76, 0.8],
  lightning: [0.9, 0.95, 1.0],
  floorLight: [0.9, 0.9, 0.95],
  floorDark: [0.7, 0.7, 0.8],
  boundary: [0.0, 0.0, 0.0],
}

// Deep night: the glass, the attractors and the avatars carry the light.
// The floor is barely there on its own — what you see of it is what the
// avatars throw onto it (GLASSHOUSE_FLOOR_SHADE_GLSL).
const GLASSHOUSE_PALETTE: Palette = {
  skyHorizon: [0.08, 0.05, 0.18],
  skyZenith: [0.02, 0.02, 0.07],
  cloud: [0.14, 0.1, 0.24],
  lightning: [0.6, 0.8, 1.0],
  floorLight: [0.15, 0.15, 0.21],
  floorDark: [0.06, 0.06, 0.1],
  boundary: [0.3, 0.9, 1.0],
}

// An SNES afternoon: a flat saturated sky, white clouds, green and
// brown blocks, red trim.
const MARIO_PALETTE: Palette = {
  skyHorizon: [0.4, 0.7, 1.0],
  skyZenith: [0.3, 0.55, 1.0],
  cloud: [1, 1, 1],
  // No storm over a cartridge afternoon.
  lightning: [0, 0, 0],
  floorLight: [0.36, 0.78, 0.22],
  floorDark: [0.65, 0.4, 0.16],
  boundary: [0.93, 0.2, 0.12],
}

const GLASS_TINT: Vec3 = [0.62, 0.86, 1.0]

// A palette colour as CSS, for the parts of a room the browser draws
// rather than the tracer. The renderer reads a room's `boundary` — what
// the shader paints the mullions and pane edges in — through this and
// hands it to the tape on the glass, which is DOM over the canvas and
// has no business knowing which rooms exist.
export function paletteCss(colour: Vec3, alpha = 1): string {
  const [r, g, b] = colour.map(c => Math.round(Math.max(0, Math.min(1, c)) * 255))
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// How much of the endless glass the tape uses: the shader draws the
// panes from the floor up without end, and this is the band deja's
// splats are spread over — tall enough to read as a wall from across the
// room, low enough that the top of it is in frame from the floor.
const GLASSHOUSE_WALL_HEIGHT = 16
const glsl3 = (v: Vec3) => `vec3(${v.map(n => n.toFixed(2)).join(', ')})`

// Four panes of glass on the boundary, from the floor up without end.
// The nearest pane the primary ray crosses before landing tints the
// pixel: faint face-on, stronger at a grazing angle, with a mullion
// every tenth of the boundary to give the height something to read
// against. Avatars breathe: a rim glow in their own colour that pulses.
// The room's light comes from the people in it. Every avatar is a lamp:
// the floor takes its colour, falling off with distance, and the glass
// underfoot throws a hard little streak of it back at the camera. Two
// avatars close together mix, which is the whole point of the room.
const GLASSHOUSE_FLOOR_SHADE_GLSL = `
  vec3 roomFloorShade(vec3 lit, vec3 base, vec3 normal, vec3 viewDir, vec3 point) {
    vec3 pooled = vec3(0.0);
    for (int i = 0; i < u_numObjects && i < 10; i++) {
      vec3 toLamp = u_objectCenters[i] - point;
      float dist = length(toLamp);
      vec3 dir = toLamp / max(dist, 0.001);
      float fall = 1.0 / (1.0 + dist * dist * 0.06);
      pooled += u_objectColors[i] * max(0.0, dot(normal, dir)) * fall;
      vec3 halfway = normalize(dir + viewDir);
      pooled += u_objectColors[i] * pow(max(0.0, dot(normal, halfway)), 48.0) * fall * 1.6;
    }
    return lit + pooled * 1.4;
  }
`

// Beyond the glass, a long way out: a sparse field of stars and two
// moons. The stars are a lattice in direction alone, so they turn with
// the camera and never slide however far you walk — the sky is that far
// away. The moons are spheres at a great but finite distance, traced
// from where the camera actually is, so they do slide, a little, which
// is the whole of what tells you they are nearer than the stars.
// Where the moons hang. The camera has no pitch control: it looks down
// at the avatar, so the only sky you can ever see is a band a dozen
// degrees deep above the horizon, and a moon placed by eye lands above
// it. These sit inside that band by construction, and a test holds them
// there against the camera's own frustum.
export interface Moon {
  centre: readonly [number, number, number]
  radius: number
  tint: readonly [number, number, number]
}
// The star field, in numbers rather than in the shader, because one of
// them constrains another: only the ray's own cell is hashed, so a disc
// wider than the margin left around the cell's faces would be cut off
// flat against a neighbour that almost always holds no star.
export const GLASSHOUSE_STARS = {
  // Cells across a unit direction: how fine the field is.
  lattice: 90,
  // A cell carries a star when its hash clears this.
  threshold: 0.955,
  // The disc, and how far a star may wander inside its own cell.
  radius: 0.3,
  jitter: 0.4,
} as const

export const GLASSHOUSE_MOONS: readonly Moon[] = [
  { centre: [-1500, 288, -2300], radius: 150, tint: [0.86, 0.88, 0.95] },
  { centre: [2100, 128, 900], radius: 95, tint: [0.95, 0.74, 0.62] },
]

// A GLSL literal for a constant the room needs by value.
const vec3 = (v: readonly [number, number, number]) => `vec3(${v.map(glslFloat).join(', ')})`

const GLASSHOUSE_SKY_GLSL = `
  const vec3 MOON_LIGHT = normalize(vec3(-0.4, 0.3, 0.86));

  // One moon: a lit disc with a soft limb, a few darker seas, and a
  // faint ring of light around it. Black where the ray misses.
  vec3 glasshouseMoon(vec3 ro, vec3 rd, vec3 centre, float radius, vec3 tint) {
    float t = intersectSphere(ro, rd, centre, radius);
    if (t > 0.0) {
      vec3 normal = normalize(ro + rd * t - centre);
      float lit = max(0.0, dot(normal, MOON_LIGHT));
      // Seas: slow noise over the face, and a little light either side
      // of the terminator so the edge is not a knife.
      float seas = noise(normal.xy * 4.0 + 13.0) * 0.35 + noise(normal.yz * 9.0) * 0.15;
      float shade = smoothstep(0.0, 0.35, lit) * (1.0 - seas * 0.55) + 0.04;
      return tint * shade;
    }
    // The halo, from how near the ray passed the middle of it.
    vec3 toMoon = centre - ro;
    float along = dot(toMoon, rd);
    if (along <= 0.0) return vec3(0.0);
    float miss = length(toMoon - rd * along);
    float halo = exp(-(miss / radius - 1.0) * 3.0);
    return tint * clamp(halo, 0.0, 1.0) * 0.06;
  }

  vec3 roomSky(vec3 rayOrigin, vec3 rayDir, vec3 base) {
    vec3 sky = base;

    // Stars, on a lattice of directions: one cell in a few hundred
    // carries one, placed somewhere inside its own cell so the field
    // reads as scattered rather than as a grid.
    vec3 lattice = rayDir * ${glslFloat(GLASSHOUSE_STARS.lattice)};
    vec3 cell = floor(lattice);
    float pick = hash(cell.xy + cell.z * 113.0);
    if (pick > ${glslFloat(GLASSHOUSE_STARS.threshold)}) {
      // Kept clear of the cell's faces, so a disc is never cut off flat
      // against a neighbour that holds no star.
      vec3 at = ${glslFloat((1 - GLASSHOUSE_STARS.jitter) / 2)} + ${glslFloat(GLASSHOUSE_STARS.jitter)} * vec3(hash(cell.xy + 7.0), hash(cell.yz + 19.0), hash(cell.xz + 31.0));
      float near = length(fract(lattice) - at);
      float shape = smoothstep(${glslFloat(GLASSHOUSE_STARS.radius)}, 0.0, near);
      // Slow, and never all the way out: stars twinkle, they do not blink.
      float twinkle = 0.62 + 0.38 * sin(u_time * 1.7 + pick * 320.0);
      sky += vec3(0.85, 0.9, 1.0) * shape * twinkle * (0.7 + 0.9 * fract(pick * 71.0));
    }

${GLASSHOUSE_MOONS.map(
    moon => `    sky += glasshouseMoon(rayOrigin, rayDir, ${vec3(moon.centre)}, ${glslFloat(moon.radius)}, ${vec3(moon.tint)});`,
  ).join('\n')}
    return sky;
  }
`

const GLASSHOUSE_GLSL = PLANE_FLOOR_GLSL + GLASSHOUSE_FLOOR_SHADE_GLSL + GLASSHOUSE_SKY_GLSL + `
  vec4 roomWalls(vec3 ro, vec3 rd, float tHit) {
    float b = u_worldBoundary;
    float t = tHit;
    vec3 n = vec3(0.0);
    vec3 p = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      vec3 normal = (i == 0) ? vec3(1.0, 0.0, 0.0)
                  : (i == 1) ? vec3(-1.0, 0.0, 0.0)
                  : (i == 2) ? vec3(0.0, 0.0, 1.0)
                  : vec3(0.0, 0.0, -1.0);
      float denom = dot(normal, rd);
      if (abs(denom) < 1e-5) continue;
      float ti = dot(normal * b - ro, normal) / denom;
      if (ti <= 0.0 || ti >= t) continue;
      vec3 q = ro + rd * ti;
      float along = (i < 2) ? q.z : q.x;
      if (abs(along) > b || q.y < ${GAME_CONFIG.groundLevel.toFixed(1)}) continue;
      t = ti;
      n = normal;
      p = q;
    }
    if (t >= tHit) return vec4(0.0);
    float facing = abs(dot(rd, n));
    float fresnel = pow(max(0.0, 1.0 - facing), 3.0);
    float pitch = b / 10.0;
    float along = (abs(n.x) > 0.5) ? p.z : p.x;
    vec2 cell = abs(fract(vec2(along, p.y) / pitch) - 0.5);
    float line = 1.0 - smoothstep(0.0, 0.03, min(cell.x, cell.y));
    float alpha = mix(0.10, 0.55, fresnel) + line * 0.35;
    vec3 tint = mix(${glsl3(GLASS_TINT)}, vec3(0.9, 0.97, 1.0), line);
    return vec4(tint, clamp(alpha, 0.0, 0.85));
  }

  vec3 roomAvatar(vec3 lit, vec3 base, vec3 normal, vec3 viewDir, vec3 point) {
    float rim = pow(max(0.0, 1.0 - abs(dot(normal, viewDir))), 2.5);
    float pulse = 0.55 + 0.45 * sin(u_time * 2.2 + point.x * 0.7 + point.z * 0.5);
    return lit + base * rim * pulse * 0.9 + vec3(rim * pulse * 0.25);
  }
`

// The inside of a giant sphere, the whole of it: the floor is the wall
// wherever you are standing, and you can walk to any of it. The checker
// is laid out in arc length, so a block is the same size underfoot at
// the equator as at a pole, and nothing is drawn where the world ends
// because it does not. Drawn like a cartridge-era platformer: flat
// colour in a few bands, and an ink outline round every avatar.
const SPHERE_GLSL = NO_WALLS_GLSL + PLAIN_SKY_GLSL + `
  const float PI = 3.14159265;
  const vec3 TOON_LIGHT = normalize(vec3(0.4, 1.0, 0.3));

  Floor roomFloor(vec3 ro, vec3 rd) {
    Floor f;
    // The wall is wherever the hub put it: the room draws the sphere the
    // world actually stands on, not the one it was written for.
    f.t = intersectSphere(ro, rd, vec3(0.0), u_surfaceRadius);
    vec3 n = normalize(ro + rd * f.t);
    f.normal = -n;
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float lon = atan(n.x, -n.z);
    f.coord = vec2(lon * u_surfaceRadius * cos(lat), lat * u_surfaceRadius);
    return f;
  }

  vec3 roomAvatar(vec3 lit, vec3 base, vec3 normal, vec3 viewDir, vec3 point) {
    if (abs(dot(normal, viewDir)) < 0.28) return vec3(0.05, 0.03, 0.03);
    float light = dot(normal, TOON_LIGHT);
    float band = light > 0.45 ? 1.0 : (light > -0.1 ? 0.72 : 0.5);
    return base * band;
  }

  vec3 roomFloorShade(vec3 lit, vec3 base, vec3 normal, vec3 viewDir, vec3 point) {
    float light = dot(normal, TOON_LIGHT);
    return base * (light > 0.2 ? 1.0 : 0.82);
  }
`

export const ROOM_GEOMETRIES: readonly RoomGeometry[] = [
  {
    id: 'grid',
    label: 'Grid',
    palette: GRID_PALETTE,
    geometry: PLANE_GEOMETRY,
    bounded: true,
    fog: 0.05,
    block: 0.5,
    reflect: 1,
    glsl: NO_ROOM_GLSL,
    attractors: [],
    behindGlass: [0, 0, 0, 0],
    wallHeight: 0,
    trailLength: 0,
    sound: CALM_SOUND,
  },
  {
    id: 'glasshouse',
    label: 'Glasshouse',
    palette: GLASSHOUSE_PALETTE,
    geometry: GLASSHOUSE_GEOMETRY,
    bounded: true,
    fog: 0.05,
    block: 0.5,
    reflect: 1,
    glsl: GLASSHOUSE_GLSL,
    attractors: attractorsOutside(GAME_CONFIG.worldBoundary),
    behindGlass: [...GLASS_TINT, 0.35],
    wallHeight: GLASSHOUSE_WALL_HEIGHT,
    trailLength: 120,
    sound: TECHNO_SOUND,
  },
  {
    id: 'sphere',
    label: 'Sphere',
    palette: MARIO_PALETTE,
    geometry: sphereGeometry(),
    bounded: false,
    fog: 0,
    block: 2.5,
    reflect: 0,
    glsl: SPHERE_GLSL,
    attractors: [],
    behindGlass: [0, 0, 0, 0],
    wallHeight: 0,
    trailLength: 0,
    sound: CHIPTUNE_SOUND,
  },
]

export const DEFAULT_ROOM = ROOM_GEOMETRIES[0]

export function roomById(id: string): RoomGeometry | undefined {
  return ROOM_GEOMETRIES.find(r => r.id === id)
}

export function nextRoom(id: RoomGeometryId): RoomGeometry {
  const i = ROOM_GEOMETRIES.findIndex(r => r.id === id)
  return ROOM_GEOMETRIES[(i + 1) % ROOM_GEOMETRIES.length]
}

// Which room to draw for the surface the hub named. A room is a look,
// not a size: the sphere room draws a sphere of any radius the hub
// allows, and the renderer stands the world on the hub's own geometry.
// Should two rooms ever share a surface, the one this client was heading
// for wins; otherwise it is the first that draws that surface.
export function roomForGeometry(geometry: Geometry, wanted?: RoomGeometryId): RoomGeometry {
  const preferred = wanted && roomById(wanted)
  if (preferred && sameSurfaceKind(preferred.geometry, geometry)) return preferred
  return ROOM_GEOMETRIES.find(r => sameSurfaceKind(r.geometry, geometry)) ?? DEFAULT_ROOM
}

export function roomFragmentShader(room: RoomGeometry): string {
  return composeFragmentShader(room.glsl, room)
}
