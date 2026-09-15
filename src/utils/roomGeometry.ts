import { composeFragmentShader, NO_WALLS_GLSL } from './shaders'
import { attractorsOutside, type AttractorSpec } from './attractors'
import { GAME_CONFIG } from './gameClasses'

// The rooms the world can be: each is a GLSL block the ray tracer calls
// for its walls (see shaders.ts), the attractors hung outside them, and
// the tint those attractors take on through the glass. A new room is a
// new entry here; the hotkey cycles the list in order and the hub will
// one day name one per room (MoonBase#1554).

export type RoomGeometryId = 'grid' | 'glasshouse'

export interface RoomGeometry {
  id: RoomGeometryId
  label: string
  walls: string
  attractors: AttractorSpec[]
  // rgb and strength of the wall between the camera and the attractors.
  behindGlass: [number, number, number, number]
}

// The uniforms the render loop sets every frame; every room's shader
// must declare them, and RoomPrograms looks each one up.
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

// Four panes of glass on the boundary, from the floor up without end.
// The nearest pane the primary ray crosses before landing tints the
// pixel: faint face-on, stronger at a grazing angle, with a mullion
// every five units to give the height something to read against.
const GLASSHOUSE_WALLS_GLSL = `
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
    float fresnel = pow(1.0 - facing, 3.0);
    float along = (abs(n.x) > 0.5) ? p.z : p.x;
    vec2 cell = abs(fract(vec2(along, p.y) / 5.0) - 0.5);
    float line = 1.0 - smoothstep(0.0, 0.03, min(cell.x, cell.y));
    float alpha = mix(0.10, 0.55, fresnel) + line * 0.35;
    vec3 tint = mix(vec3(0.62, 0.86, 1.0), vec3(0.9, 0.97, 1.0), line);
    return vec4(tint, clamp(alpha, 0.0, 0.85));
  }
`

export const ROOM_GEOMETRIES: readonly RoomGeometry[] = [
  { id: 'grid', label: 'Grid', walls: NO_WALLS_GLSL, attractors: [], behindGlass: [0, 0, 0, 0] },
  {
    id: 'glasshouse',
    label: 'Glasshouse',
    walls: GLASSHOUSE_WALLS_GLSL,
    attractors: attractorsOutside(GAME_CONFIG.worldBoundary),
    behindGlass: [0.62, 0.86, 1.0, 0.35],
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
  return composeFragmentShader(room.walls)
}
