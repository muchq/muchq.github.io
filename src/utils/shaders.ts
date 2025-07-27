// WebGL2 Shaders for the Thoughts Game

export const vertexShaderSource = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

export const fragmentShaderSource = `#version 300 es
  precision highp float;

  in vec2 v_uv;

  uniform vec2 u_resolution;
  uniform vec3 u_cameraPos;
  uniform vec3 u_cameraTarget;
  uniform float u_time;
  uniform float u_worldBoundary;

  // Multiple object support (up to 10 players)
  uniform int u_numObjects;
  uniform vec3 u_objectCenters[10];
  uniform vec3 u_objectColors[10];
  uniform int u_objectShapes[10]; // 0=sphere, 1=cube, 2=pyramid

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
  };

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
      
      // Test intersection based on shape type
      if (shapeType == 0) { // Sphere
        objectT = intersectSphere(rayOrigin, rayDir, objectCenter, 1.0);
      } else if (shapeType == 1) { // Cube
        objectT = intersectCube(rayOrigin, rayDir, objectCenter, 1.0);
      } else if (shapeType == 2) { // Pyramid
        objectT = intersectPyramid(rayOrigin, rayDir, objectCenter, 2.0);
      }
      
      if (objectT > 0.0 && objectT < closestT) {
        closestT = objectT;
        hit.t = objectT;
        hit.objectId = i + 1; // object indices start at 1
        hit.point = rayOrigin + objectT * rayDir;
        
        // Calculate normal based on shape type
        if (shapeType == 0) { // Sphere
          hit.normal = normalize(hit.point - objectCenter);
        } else if (shapeType == 1) { // Cube
          vec3 d = abs(hit.point - objectCenter);
          float maxComp = max(max(d.x, d.y), d.z);
          if (maxComp == d.x) hit.normal = sign(hit.point.x - objectCenter.x) * vec3(1.0, 0.0, 0.0);
          else if (maxComp == d.y) hit.normal = sign(hit.point.y - objectCenter.y) * vec3(0.0, 1.0, 0.0);
          else hit.normal = sign(hit.point.z - objectCenter.z) * vec3(0.0, 0.0, 1.0);
        } else if (shapeType == 2) { // Pyramid
          // Simplified pyramid normal (cone-like)
          vec3 toTip = normalize(vec3(0.0, 1.0, 0.0));
          vec3 toPoint = normalize(hit.point - objectCenter);
          hit.normal = normalize(mix(toPoint, toTip, 0.3));
        }
        
        hit.color = u_objectColors[i];
      }
    }

    // Test floor
    vec3 floorPoint = vec3(0.0, -2.0, 0.0);
    vec3 floorNormal = vec3(0.0, 1.0, 0.0);
    float floorT = intersectPlane(rayOrigin, rayDir, floorPoint, floorNormal);

    if (floorT > 0.0 && floorT < closestT) {
      hit.t = floorT;
      hit.objectId = 11; // floor
      hit.point = rayOrigin + floorT * rayDir;
      hit.normal = floorNormal;
    }

    return hit;
  }

  // Generate stormy sky color with lightning
  vec3 getSkyColor(vec3 rayDir) {
    // Use 3D noise directly from ray direction to avoid seams
    vec3 noiseCoord = rayDir * 3.0 + vec3(u_time * 0.02, u_time * 0.01, 0.0);

    // Generate cloud density using simpler sampling
    float cloudDensity = fbm(noiseCoord.xy);
    cloudDensity = smoothstep(0.4, 0.8, cloudDensity * 0.8);

    // Darker storm sky colors (20% darker)
    vec3 skyColor = mix(vec3(0.48, 0.64, 0.8), vec3(0.64, 0.72, 0.8), rayDir.y * 0.5 + 0.5);
    vec3 cloudColor = vec3(0.72, 0.76, 0.8);

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
    vec3 lightningColor = vec3(0.9, 0.95, 1.0) * lightningIntensity;

    return baseColor + lightningColor;
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
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);

    // Calculate ray direction in world space
    float fov = 0.8; // Field of view factor
    vec3 rayDir = normalize(forward + ndc.x * right * fov + ndc.y * up * fov);

    // Get stormy sky color with lightning
    vec3 backgroundColor = getSkyColor(rayDir);

    vec3 finalColor = vec3(0.0);
    vec3 rayOrigin = cameraPos;
    vec3 currentRayDir = rayDir;
    float reflectivity = 1.0;

    // Ray tracing with reflections (up to 2 bounces)
    for (int bounce = 0; bounce < 2; bounce++) {
      Hit hit = traceRay(rayOrigin, currentRayDir);

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

        finalColor += lighting * reflectivity;

        // Set up reflection ray
        currentRayDir = reflect(-viewDir, hit.normal);
        rayOrigin = hit.point + hit.normal * 0.001; // Offset to avoid self-intersection
        reflectivity *= 0.3; // Reduce reflection strength

      } else if (hit.objectId == 11) {
        // Hit floor
        vec2 floorCoord = hit.point.xz;
        vec2 checker = floor(floorCoord * 2.0);
        float checkerPattern = mod(checker.x + checker.y, 2.0);

        vec3 floorColor1 = vec3(0.9, 0.9, 0.95); // Light gray
        vec3 floorColor2 = vec3(0.7, 0.7, 0.8);  // Darker gray
        vec3 floorColor = mix(floorColor1, floorColor2, checkerPattern);

        // Add boundary lines
        float boundary = u_worldBoundary;
        float lineWidth = 2.0; // Thicker boundary lines

        // Distance to each boundary edge
        float distToEdgeX = min(abs(hit.point.x - boundary), abs(hit.point.x + boundary));
        float distToEdgeZ = min(abs(hit.point.z - boundary), abs(hit.point.z + boundary));
        float distToEdge = min(distToEdgeX, distToEdgeZ);

        // Create boundary line effect
        if (distToEdge < lineWidth) {
          float lineIntensity = 1.0 - smoothstep(0.0, lineWidth, distToEdge);
          vec3 boundaryColor = vec3(0.0, 0.0, 0.0); // Black boundary
          floorColor = mix(floorColor, boundaryColor, lineIntensity * 0.9);
        }

        // Add lighting from both light sources
        lighting += calculateLighting(hit.point, hit.normal, light1, viewDir, floorColor) * 0.3;
        lighting += calculateLighting(hit.point, hit.normal, light2, viewDir, floorColor) * 0.3;

        // Add ambient
        lighting += floorColor * 0.2;

        // Distance fog
        float distance = length(hit.point - cameraPos);
        float fogFactor = exp(-distance * 0.05);
        vec3 fogColor = getSkyColor(normalize(hit.point - cameraPos));
        lighting = mix(fogColor, lighting, fogFactor);

        finalColor += lighting * reflectivity;

        // Set up reflection ray (floor is less reflective)
        currentRayDir = reflect(-viewDir, hit.normal);
        rayOrigin = hit.point + hit.normal * 0.001;
        reflectivity *= 0.1; // Very weak floor reflections
      }

      // Stop if reflectivity gets too low
      if (reflectivity < 0.01) break;
    }

    fragColor = vec4(finalColor, 1.0);
  }
`