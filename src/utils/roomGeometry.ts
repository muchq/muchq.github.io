import {
  composeFragmentShader,
  NO_ROOM_GLSL,
  NO_WALLS_GLSL,
  PLANE_FLOOR_GLSL,
  type Palette,
} from './shaders'
import { attractorsOutside, type AttractorSpec } from './attractors'
import { GAME_CONFIG } from './gameClasses'
import type { Vec3 } from './projection'
import { PLANE_GEOMETRY, sphereGeometry, sameSurfaceKind, type Geometry } from './surface'
import { CALM_SOUND, CHIPTUNE_SOUND, TECHNO_SOUND, type SoundProfile } from './audioSystem'

// The rooms the world can be: each is a palette the sky and floor are
// painted in, the surface the hub keeps its players on (MoonBase#1554),
// how the shared tracer is tuned there (fog, block size, reflections), a
// GLSL block the ray tracer calls for its ground, walls and shading (see
// shaders.ts), the attractors hung outside, the tint those take on
// through the glass, how long a wake an avatar leaves, and what it
// sounds like. A new room is a new entry here.
//
// Two rooms can stand on one surface: grid and glasshouse are the same
// plane in different light, so switching between them is this client's
// own business, while stepping to or from the sphere is the room's and
// goes through the hub. The hotkey cycles the list in order.

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

const GLASSHOUSE_GLSL = PLANE_FLOOR_GLSL + GLASSHOUSE_FLOOR_SHADE_GLSL + `
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
const SPHERE_GLSL = NO_WALLS_GLSL + `
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
    trailLength: 0,
    sound: CALM_SOUND,
  },
  {
    id: 'glasshouse',
    label: 'Glasshouse',
    palette: GLASSHOUSE_PALETTE,
    geometry: PLANE_GEOMETRY,
    bounded: true,
    fog: 0.05,
    block: 0.5,
    reflect: 1,
    glsl: GLASSHOUSE_GLSL,
    attractors: attractorsOutside(GAME_CONFIG.worldBoundary),
    behindGlass: [...GLASS_TINT, 0.35],
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
// Several rooms can share a kind, so a room this client was heading for
// wins; otherwise it is the first of that kind.
export function roomForGeometry(geometry: Geometry, wanted?: RoomGeometryId): RoomGeometry {
  const preferred = wanted && roomById(wanted)
  if (preferred && sameSurfaceKind(preferred.geometry, geometry)) return preferred
  return ROOM_GEOMETRIES.find(r => sameSurfaceKind(r.geometry, geometry)) ?? DEFAULT_ROOM
}

export function roomFragmentShader(room: RoomGeometry): string {
  return composeFragmentShader(room.glsl, room)
}
