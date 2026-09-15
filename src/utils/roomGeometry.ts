import { composeFragmentShader, NO_ROOM_GLSL, type Palette } from './shaders'
import { attractorsOutside, type AttractorSpec } from './attractors'
import { GAME_CONFIG } from './gameClasses'
import type { Vec3 } from './projection'

// The rooms the world can be: each is a palette the sky and floor are
// painted in, a GLSL block the ray tracer calls for its walls and its
// avatars (see shaders.ts), the attractors hung outside, the tint those
// take on through the glass, and how long a wake an avatar leaves. A new room with walls and ornaments is a new
// entry here; a room that replaces the floor needs a hook in shaders.ts
// first, since the floor lives in traceRay. The hotkey cycles the list
// in order and the hub will one day name one per room (MoonBase#1554).

export type RoomGeometryId = 'grid' | 'glasshouse'

export interface RoomGeometry {
  id: RoomGeometryId
  label: string
  palette: Palette
  glsl: string
  attractors: AttractorSpec[]
  // rgb and strength of the wall between the camera and the line pass.
  behindGlass: [number, number, number, number]
  // Points in an avatar's wake; 0 for none.
  trailLength: number
}

// The uniforms the render loop sets every frame; every room's shader
// must declare them, and RoomResources looks each one up.
export const RAY_TRACER_UNIFORMS = [
  'u_resolution',
  'u_cameraPos',
  'u_cameraTarget',
  'u_time',
  'u_worldBoundary',
  'u_numObjects',
  'u_objectCenters',
  'u_objectColors',
  'u_objectShapes',
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
const GLASSHOUSE_PALETTE: Palette = {
  skyHorizon: [0.06, 0.03, 0.14],
  skyZenith: [0.01, 0.01, 0.05],
  cloud: [0.11, 0.08, 0.2],
  lightning: [0.6, 0.8, 1.0],
  floorLight: [0.13, 0.13, 0.18],
  floorDark: [0.05, 0.05, 0.08],
  boundary: [0.3, 0.9, 1.0],
}

const GLASS_TINT: Vec3 = [0.62, 0.86, 1.0]
const glsl3 = (v: Vec3) => `vec3(${v.map(n => n.toFixed(2)).join(', ')})`

// Four panes of glass on the boundary, from the floor up without end.
// The nearest pane the primary ray crosses before landing tints the
// pixel: faint face-on, stronger at a grazing angle, with a mullion
// every tenth of the boundary to give the height something to read
// against. Avatars breathe: a rim glow in their own colour that pulses.
const GLASSHOUSE_GLSL = `
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

export const ROOM_GEOMETRIES: readonly RoomGeometry[] = [
  {
    id: 'grid',
    label: 'Grid',
    palette: GRID_PALETTE,
    glsl: NO_ROOM_GLSL,
    attractors: [],
    behindGlass: [0, 0, 0, 0],
    trailLength: 0,
  },
  {
    id: 'glasshouse',
    label: 'Glasshouse',
    palette: GLASSHOUSE_PALETTE,
    glsl: GLASSHOUSE_GLSL,
    attractors: attractorsOutside(GAME_CONFIG.worldBoundary),
    behindGlass: [...GLASS_TINT, 0.35],
    trailLength: 120,
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

export function roomFragmentShader(room: RoomGeometry): string {
  return composeFragmentShader(room.glsl, room.palette)
}
