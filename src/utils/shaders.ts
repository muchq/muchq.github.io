// WebGL2 Shaders for the Thoughts Game
import { DEPTH_RANGE, SHADER_FOV, depthCoefficients } from './projection'

// GLSL ES wants a decimal point on a float literal.
export const glslFloat = (n: number) => (Number.isInteger(n) ? `${n}.0` : `${n}`)

// The colours a room paints the world in: read by the sky and the floor
// as PALETTE_* constants, so a room is a change of place, not of trim.
export const PALETTE_KEYS = ['skyHorizon', 'skyZenith', 'cloud', 'lightning', 'floorLight', 'floorDark', 'boundary'] as const
export type Palette = Record<(typeof PALETTE_KEYS)[number], [number, number, number]>

const paletteGlsl = (palette: Palette) =>
  PALETTE_KEYS.map(key => {
    const [r, g, b] = palette[key]
    return `  const vec3 PALETTE_${key} = vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)});`
  }).join('\n') + '\n'

export const vertexShaderSource = `#version 300 es
  layout(location = 0) in vec2 a_position;
  out vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

// The ray tracer, in two halves around the hooks a room fills in:
//
//   Floor roomFloor(vec3 ro, vec3 rd)
//     where the ray lands on the room's ground, its normal there, and
//     the plane coordinate the checker and boundary read;
//   vec4 roomWalls(vec3 ro, vec3 rd, float tHit)
//     the tint (rgb) and its strength (a) of whatever the room puts
//     between the camera and the primary ray's landing point, tHit
//     along the ray;
//   vec3 roomAvatar(vec3 lit, vec3 base, vec3 normal, vec3 viewDir, vec3 point)
//   vec3 roomFloorShade(vec3 lit, vec3 base, vec3 normal, vec3 viewDir, vec3 point)
//     the room's last word on a lit avatar or ground surface.
//
// composeFragmentShader() joins the halves around a room's block; the
// blocks below are the defaults a room composes from.
const fragmentShaderHeader = `#version 300 es
  precision highp float;

  in vec2 v_uv;

  uniform vec2 u_resolution;
  uniform vec3 u_cameraPos;
  uniform vec3 u_cameraTarget;
  uniform vec3 u_cameraUp;
  uniform float u_time;
  uniform float u_worldBoundary;
  // The radius of the surface the world stands on; 0 on a plane.
  uniform float u_surfaceRadius;

  // Multiple object support (up to 10 players)
  uniform int u_numObjects;
  uniform vec3 u_objectCenters[10];
  uniform vec3 u_objectColors[10];
  uniform int u_objectShapes[10]; // 0=sphere, 1=cube, 2=pyramid
  uniform vec3 u_objectUps[10];   // which way each one stands
`

export const fragmentShaderPrelude = `

  // Light sources
  const vec3 light1 = vec3(1.0, 1.0, 1.0);   // Main light (top right)
  const vec3 light2 = vec3(-5.0, 8.0, 2.0);  // Second light (high above left)

  // Noise functions for clouds and lightning
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 3; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }

    return value;
  }

  out vec4 fragColor;

  // Ray-sphere intersection
  float intersectSphere(vec3 rayOrigin, vec3 rayDir, vec3 sphereCenter, float radius) {
    vec3 oc = rayOrigin - sphereCenter;
    float a = dot(rayDir, rayDir);
    float b = 2.0 * dot(oc, rayDir);
    float c = dot(oc, oc) - radius * radius;
    float discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0.0) {
      return -1.0;
    }

    float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
    float t2 = (-b + sqrt(discriminant)) / (2.0 * a);

    if (t1 > 0.0) return t1;
    if (t2 > 0.0) return t2;
    return -1.0;
  }

  // Ray-plane intersection
  float intersectPlane(vec3 rayOrigin, vec3 rayDir, vec3 planePoint, vec3 planeNormal) {
    float denom = dot(planeNormal, rayDir);
    if (abs(denom) < 0.0001) return -1.0; // Ray parallel to plane

    vec3 p0l0 = planePoint - rayOrigin;
    float t = dot(p0l0, planeNormal) / denom;
    return t > 0.0 ? t : -1.0;
  }

  // Ray-cube intersection
  float intersectCube(vec3 rayOrigin, vec3 rayDir, vec3 cubeCenter, float size) {
    vec3 m = 1.0 / rayDir; // Can cause division by zero
    vec3 n = m * (rayOrigin - cubeCenter);
    vec3 k = abs(m) * size;
    
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    
    if (tN > tF || tF < 0.0) return -1.0;
    return tN > 0.0 ? tN : tF;
  }

  // Ray-pyramid intersection (approximated as cone)
  float intersectPyramid(vec3 rayOrigin, vec3 rayDir, vec3 pyramidCenter, float height) {
    vec3 oc = rayOrigin - pyramidCenter;
    float radius = height * 0.7; // Pyramid base radius
    
    float a = rayDir.x * rayDir.x + rayDir.z * rayDir.z - (rayDir.y * rayDir.y) * 0.25;
    float b = 2.0 * (oc.x * rayDir.x + oc.z * rayDir.z - (oc.y * rayDir.y) * 0.25);
    float c = oc.x * oc.x + oc.z * oc.z - (oc.y * oc.y) * 0.25;
    
    float discriminant = b * b - 4.0 * a * c;
    if (discriminant < 0.0) return -1.0;
    
    float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
    float t2 = (-b + sqrt(discriminant)) / (2.0 * a);
    
    float t = (t1 > 0.0) ? t1 : t2;
    if (t < 0.0) return -1.0;
    
    vec3 hit = rayOrigin + t * rayDir;
    if (hit.y < pyramidCenter.y - height || hit.y > pyramidCenter.y + height) return -1.0;
    
    return t;
  }

  // Calculate lighting from a point light
  vec3 calculateLighting(vec3 hitPoint, vec3 normal, vec3 lightPos, vec3 viewDir, vec3 baseColor) {
    vec3 lightDir = normalize(lightPos - hitPoint);
    float distance = length(lightPos - hitPoint);
    float attenuation = 1.0 / (1.0 + 0.1 * distance + 0.01 * distance * distance);

    // Diffuse lighting
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Specular lighting (Blinn-Phong)
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0);

    return baseColor * diffuse * attenuation + vec3(1.0) * specular * attenuation * 0.3;
  }

  // Scene intersection - returns closest hit
  struct Hit {
    float t;
    int objectId; // 0 = miss, 1-10 = sphere index, 11 = floor
    vec3 point;
    vec3 normal;
    vec3 color;
    vec2 coord; // floor only: the plane coordinate
  };

  // What a room's ground looks like to a ray.
  struct Floor {
    float t;
    vec3 normal;
    vec2 coord;
  };

  Floor planeFloor(vec3 ro, vec3 rd) {
    Floor f;
    f.t = intersectPlane(ro, rd, vec3(0.0, -2.0, 0.0), vec3(0.0, 1.0, 0.0));
    f.normal = vec3(0.0, 1.0, 0.0);
    f.coord = (ro + rd * f.t).xz;
    return f;
  }

  // A frame whose y is \`up\`, for a shape standing on a room's ground.
  mat3 frameOf(vec3 up) {
    vec3 helper = abs(up.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 right = normalize(cross(up, helper));
    vec3 forward = cross(right, up);
    return mat3(right, up, forward);
  }
  // Generate stormy sky color with lightning
  vec3 getSkyColor(vec3 rayDir) {
    // Use 3D noise directly from ray direction to avoid seams
    vec3 noiseCoord = rayDir * 3.0 + vec3(u_time * 0.02, u_time * 0.01, 0.0);

    // Generate cloud density using simpler sampling
    float cloudDensity = fbm(noiseCoord.xy);
    cloudDensity = smoothstep(0.4, 0.8, cloudDensity * 0.8);

    vec3 skyColor = mix(PALETTE_skyHorizon, PALETTE_skyZenith, rayDir.y * 0.5 + 0.5);
    vec3 cloudColor = PALETTE_cloud;

    // Add some cloud variation
    float cloudVariation = fbm(noiseCoord.xy * 2.0) * 0.3;
    cloudColor *= (1.0 - cloudVariation);

    // Lightning system - roughly once per minute (60 seconds)
    float lightningCycle = u_time / 60.0; // One cycle per minute
    float lightningPhase = fract(lightningCycle);

    // Lightning occurs in a brief window each cycle
    float lightningWindow = 0.02; // 2% of the cycle (about 1.2 seconds)
    float lightningIntensity = 0.0;

    if (lightningPhase < lightningWindow) {
      // Create flickering lightning effect
      float flicker = sin(u_time * 50.0) * sin(u_time * 73.0) * sin(u_time * 97.0);
      flicker = smoothstep(0.7, 1.0, abs(flicker));

      // Lightning location in 3D space (varies per cycle)
      vec3 lightningCenter = vec3(
        hash(vec2(floor(lightningCycle))) * 2.0 - 1.0,
        0.3, // Keep lightning in upper part of sky
        hash(vec2(floor(lightningCycle) + 1.0)) * 2.0 - 1.0
      );
      lightningCenter = normalize(lightningCenter);

      // Distance from this ray to lightning center in 3D
      float distToLightning = length(rayDir - lightningCenter);

      // Lightning glow (stronger in clouds)
      float lightningGlow = exp(-distToLightning * 12.0) * flicker;
      lightningIntensity = lightningGlow * (0.5 + cloudDensity * 1.5);
    }

    // Add natural color noise to the sky (seamless)
    vec3 colorNoiseCoord = rayDir * 8.0 + vec3(u_time * 0.005, 0.0, 0.0); // Slow-moving noise
    float colorNoise1 = noise(colorNoiseCoord.xy) * 2.0 - 1.0;          // -1 to 1
    float colorNoise2 = noise(colorNoiseCoord.xz + vec2(100.0)) * 2.0 - 1.0;
    float colorNoise3 = noise(colorNoiseCoord.yz + vec2(200.0)) * 2.0 - 1.0;

    // Apply subtle color variations to base sky and clouds
    vec3 skyNoise = vec3(colorNoise1, colorNoise2, colorNoise3) * 0.06; // Very subtle
    vec3 cloudNoise = vec3(colorNoise2, colorNoise3, colorNoise1) * 0.04; // Even more subtle for clouds

    // Apply noise to colors
    vec3 noisySkyColor = skyColor + skyNoise;
    vec3 noisyCloudColor = cloudColor + cloudNoise;

    // Mix sky, clouds, and lightning
    vec3 baseColor = mix(noisySkyColor, noisyCloudColor, cloudDensity);
    vec3 lightningColor = PALETTE_lightning * lightningIntensity;

    return baseColor + lightningColor;
  }

  // View-space distance to window depth: the mapping viewProjection()
  // (projection.ts) gives the line pass, from the same two numbers, so
  // the two passes share a depth buffer.
  const float DEPTH_NEAR = ${glslFloat(DEPTH_RANGE.near)};
  const float DEPTH_A = ${glslFloat(depthCoefficients().a)};
  const float DEPTH_B = ${glslFloat(depthCoefficients().b)};
  float fragDepth(float zView) {
    return clamp((DEPTH_A + DEPTH_B / max(zView, DEPTH_NEAR)) * 0.5 + 0.5, 0.0, 1.0);
  }
`

// traceRay and main, after the room's block so its hooks are defined.
export const fragmentShaderMain = `
  Hit traceRay(vec3 rayOrigin, vec3 rayDir) {
    Hit hit;
    hit.t = -1.0;
    hit.objectId = 0;
    float closestT = 1e30;

    // Test all objects
    for (int i = 0; i < u_numObjects && i < 10; i++) {
      float objectT = -1.0;
      vec3 objectCenter = u_objectCenters[i];
      int shapeType = u_objectShapes[i];
      // Cubes and pyramids stand on the room's ground: the ray is taken
      // into the shape's own frame, whose y is its up.
      mat3 frame = frameOf(u_objectUps[i]);
      vec3 localOrigin = (rayOrigin - objectCenter) * frame;
      vec3 localDir = rayDir * frame;

      // Test intersection based on shape type
      if (shapeType == 0) { // Sphere
        objectT = intersectSphere(rayOrigin, rayDir, objectCenter, 1.0);
      } else if (shapeType == 1) { // Cube
        objectT = intersectCube(localOrigin, localDir, vec3(0.0), 1.0);
      } else if (shapeType == 2) { // Pyramid
        objectT = intersectPyramid(localOrigin, localDir, vec3(0.0), 2.0);
      }

      if (objectT > 0.0 && objectT < closestT) {
        closestT = objectT;
        hit.t = objectT;
        hit.objectId = i + 1; // object indices start at 1
        hit.point = rayOrigin + objectT * rayDir;
        vec3 localPoint = localOrigin + objectT * localDir;

        // Calculate normal based on shape type
        if (shapeType == 0) { // Sphere
          hit.normal = normalize(hit.point - objectCenter);
        } else if (shapeType == 1) { // Cube
          vec3 d = abs(localPoint);
          float maxComp = max(max(d.x, d.y), d.z);
          vec3 localNormal;
          if (maxComp == d.x) localNormal = sign(localPoint.x) * vec3(1.0, 0.0, 0.0);
          else if (maxComp == d.y) localNormal = sign(localPoint.y) * vec3(0.0, 1.0, 0.0);
          else localNormal = sign(localPoint.z) * vec3(0.0, 0.0, 1.0);
          hit.normal = frame * localNormal;
        } else if (shapeType == 2) { // Pyramid
          // Simplified pyramid normal (cone-like)
          vec3 toTip = vec3(0.0, 1.0, 0.0);
          vec3 toPoint = normalize(localPoint);
          hit.normal = frame * normalize(mix(toPoint, toTip, 0.3));
        }

        hit.color = u_objectColors[i];
      }
    }

    // Test the room's ground
    Floor ground = roomFloor(rayOrigin, rayDir);

    if (ground.t > 0.0 && ground.t < closestT) {
      hit.t = ground.t;
      hit.objectId = 11; // floor
      hit.point = rayOrigin + ground.t * rayDir;
      hit.normal = ground.normal;
      hit.coord = ground.coord;
    }

    return hit;
  }


  void main() {
    // Convert screen coordinates to normalized device coordinates
    vec2 ndc = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
    ndc.x *= u_resolution.x / u_resolution.y; // Correct aspect ratio

    // Camera setup that looks at fixed target (sphere's zenith)
    vec3 cameraPos = u_cameraPos;
    vec3 target = u_cameraTarget;

    // Create camera coordinate system (look-at matrix)
    vec3 forward = normalize(target - cameraPos);
    vec3 right = normalize(cross(forward, u_cameraUp));
    vec3 up = cross(right, forward);

    // Calculate ray direction in world space
    float fov = ${glslFloat(SHADER_FOV)}; // Shared with the labels and the line pass (projection.ts)
    vec3 rayDir = normalize(forward + ndc.x * right * fov + ndc.y * up * fov);

    // Get stormy sky color with lightning
    vec3 backgroundColor = getSkyColor(rayDir);

    vec3 finalColor = vec3(0.0);
    vec3 rayOrigin = cameraPos;
    vec3 currentRayDir = rayDir;
    float reflectivity = 1.0;
    // Where the primary ray lands; -1.0 is the sky.
    float primaryT = -1.0;

    // Ray tracing with reflections (up to 2 bounces)
    for (int bounce = 0; bounce < 2; bounce++) {
      Hit hit = traceRay(rayOrigin, currentRayDir);
      if (bounce == 0) primaryT = hit.t;

      if (hit.objectId == 0) {
        // Hit background - get sky color for this ray direction
        vec3 skyColor = getSkyColor(currentRayDir);
        finalColor += skyColor * reflectivity;
        break;
      }

      vec3 viewDir = normalize(rayOrigin - hit.point);
      vec3 lighting = vec3(0.0);

      if (hit.objectId >= 1 && hit.objectId <= 10) {
        // Hit sphere - use color from hit struct
        vec3 sphereColor = hit.color;

        // Add lighting from both light sources
        lighting += calculateLighting(hit.point, hit.normal, light1, viewDir, sphereColor) * 0.4;
        lighting += calculateLighting(hit.point, hit.normal, light2, viewDir, sphereColor) * 0.4;

        // Add ambient
        lighting += sphereColor * 0.2;

        lighting = roomAvatar(lighting, sphereColor, hit.normal, viewDir, hit.point);
        finalColor += lighting * reflectivity;

        // Set up reflection ray
        currentRayDir = reflect(-viewDir, hit.normal);
        rayOrigin = hit.point + hit.normal * 0.001; // Offset to avoid self-intersection
        reflectivity *= 0.3 * ROOM_REFLECT; // Reduce reflection strength

      } else if (hit.objectId == 11) {
        // Hit floor
        vec2 floorCoord = hit.coord;
        vec2 checker = floor(floorCoord / ROOM_BLOCK);
        float checkerPattern = mod(checker.x + checker.y, 2.0);

        vec3 floorColor = mix(PALETTE_floorLight, PALETTE_floorDark, checkerPattern);

        // Add boundary lines
        float boundary = u_worldBoundary;
        float lineWidth = 2.0; // Thicker boundary lines

        // Distance to each boundary edge
        float distToEdgeX = min(abs(floorCoord.x - boundary), abs(floorCoord.x + boundary));
        float distToEdgeZ = min(abs(floorCoord.y - boundary), abs(floorCoord.y + boundary));
        float distToEdge = min(distToEdgeX, distToEdgeZ);

        // Create boundary line effect
        if (ROOM_BOUNDED > 0.5 && distToEdge < lineWidth) {
          float lineIntensity = 1.0 - smoothstep(0.0, lineWidth, distToEdge);
          floorColor = mix(floorColor, PALETTE_boundary, lineIntensity * 0.9);
        }

        // Add lighting from both light sources
        lighting += calculateLighting(hit.point, hit.normal, light1, viewDir, floorColor) * 0.3;
        lighting += calculateLighting(hit.point, hit.normal, light2, viewDir, floorColor) * 0.3;

        // Add ambient
        lighting += floorColor * 0.2;

        lighting = roomFloorShade(lighting, floorColor, hit.normal, viewDir, hit.point);

        // Distance fog
        float distance = length(hit.point - cameraPos);
        float fogFactor = exp(-distance * ROOM_FOG);
        vec3 fogColor = getSkyColor(normalize(hit.point - cameraPos));
        lighting = mix(fogColor, lighting, fogFactor);

        finalColor += lighting * reflectivity;

        // Set up reflection ray (floor is less reflective)
        currentRayDir = reflect(-viewDir, hit.normal);
        rayOrigin = hit.point + hit.normal * 0.001;
        reflectivity *= 0.1 * ROOM_REFLECT; // Very weak floor reflections
      }

      // Stop if reflectivity gets too low
      if (reflectivity < 0.01) break;
    }

    // The room's walls stand between the camera and whatever the primary
    // ray landed on; they tint but never reflect.
    vec4 wall = roomWalls(cameraPos, rayDir, primaryT > 0.0 ? primaryT : 1e30);
    finalColor = mix(finalColor, wall.rgb, wall.a);

    fragColor = vec4(finalColor, 1.0);
    gl_FragDepth = primaryT > 0.0 ? fragDepth(primaryT * dot(rayDir, forward)) : 1.0;
  }
`

// The defaults a room composes its block from.
export const NO_WALLS_GLSL = `
  vec4 roomWalls(vec3 ro, vec3 rd, float tHit) {
    return vec4(0.0);
  }
`
export const PLANE_FLOOR_GLSL = `
  Floor roomFloor(vec3 ro, vec3 rd) {
    return planeFloor(ro, rd);
  }
`
export const PLAIN_AVATAR_GLSL = `
  vec3 roomAvatar(vec3 lit, vec3 base, vec3 normal, vec3 viewDir, vec3 point) {
    return lit;
  }
`
export const PLAIN_FLOOR_SHADE_GLSL = `
  vec3 roomFloorShade(vec3 lit, vec3 base, vec3 normal, vec3 viewDir, vec3 point) {
    return lit;
  }
`
export const NO_ROOM_GLSL = NO_WALLS_GLSL + PLANE_FLOOR_GLSL + PLAIN_AVATAR_GLSL + PLAIN_FLOOR_SHADE_GLSL

export interface RoomLook {
  palette: Palette
  // Distance fog density; 0 for none.
  fog: number
  // Side of a checker cell, in plane units.
  block: number
  // How much a surface reflects the next bounce; 0 keeps colours flat.
  reflect: number
  // Whether the floor has an edge to draw a line along; a surface that
  // closes on itself has none, and the line would be a lie.
  bounded: boolean
}

export function composeFragmentShader(roomGlsl: string, look: RoomLook): string {
  const constants =
    `  const float ROOM_FOG = ${glslFloat(look.fog)};\n` +
    `  const float ROOM_BLOCK = ${glslFloat(look.block)};\n` +
    `  const float ROOM_REFLECT = ${glslFloat(look.reflect)};\n` +
    `  const float ROOM_BOUNDED = ${glslFloat(look.bounded ? 1 : 0)};\n`
  return fragmentShaderHeader + paletteGlsl(look.palette) + constants + fragmentShaderPrelude + roomGlsl + fragmentShaderMain
}

// The line pass: a strip per attractor or wake through the same camera
// as the ray tracer, with a glowing head running along it (u_head, in
// points) and the trail fading behind it. u_glass tints the whole thing
// the colour of the wall it is seen through.
export const lineVertexShaderSource = `#version 300 es
  layout(location = 0) in vec3 a_position;
  layout(location = 1) in float a_index;
  // Which side of a ribbon this vertex sits on, -1 to 1. A wire has no
  // sides and leaves it 0, the middle.
  layout(location = 2) in float a_edge;
  uniform mat4 u_viewProj;
  uniform mat4 u_model;
  uniform float u_head;
  uniform float u_count;
  // bead, tail, twinkle, core: how this curve is drawn, as against what
  // shape it is (attractors.ts's AttractorStyle). Both stages read it,
  // and a uniform read in both must say the same precision in both or
  // the program will not link — the vertex stage's default is high and
  // the fragment stage's is medium.
  uniform highp vec4 u_style;
  out float v_glow;
  out float v_edge;
  // A curve has thousands of points, which is more than medium floats
  // count exactly, and the beads are drawn by counting them.
  out highp float v_index;

  void main() {
    gl_Position = u_viewProj * u_model * vec4(a_position, 1.0);
    float behind = mod(u_head - a_index + u_count, u_count);
    v_glow = exp(-behind / (u_count * u_style.y));
    v_edge = a_edge;
    v_index = a_index;
  }
`

export const lineFragmentShaderSource = `#version 300 es
  precision mediump float;
  in float v_glow;
  in float v_edge;
  in highp float v_index;
  uniform vec3 u_color;
  uniform vec4 u_glass;
  uniform highp vec4 u_style;
  uniform highp float u_time;
  out vec4 fragColor;

  void main() {
    // Across a ribbon: bright down the middle, gone by the edges, so it
    // reads as light rather than as a strip of paper. A wire is all
    // middle.
    float across = 1.0 - v_edge * v_edge;
    float core = across * across;
    // Along it: beads at a spacing, and a shimmer that crawls with time.
    // Both off leaves the solid curve the world always drew.
    float beaded = u_style.x > 0.0
      ? 0.12 + 0.88 * pow(abs(sin(3.14159265 * v_index / u_style.x)), 6.0)
      : 1.0;
    float shimmer = 1.0 - u_style.z * 0.85 * (0.5 + 0.5 * sin(v_index * 1.7 + u_time * 5.0));
    vec3 rgb = mix(u_color * 0.7, vec3(1.0), v_glow * u_style.w + core * 0.15);
    rgb = mix(rgb, u_glass.rgb, u_glass.a);
    fragColor = vec4(rgb, (0.22 + 0.78 * v_glow) * core * beaded * shimmer);
  }
`
