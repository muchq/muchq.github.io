document.querySelector('.mobile-menu-toggle').addEventListener('click', function() {
  document.querySelector('.nav-menu').classList.toggle('active');
});

// Audio setup for bounce sound (global scope)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let lastBounceTime = 0;
let soundEnabled = false; // Default sound off

// Sound toggle functionality
const soundToggle = document.getElementById('sound-toggle');
soundToggle.addEventListener('click', function() {
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    soundToggle.textContent = '🔊 Sound: ON';
    soundToggle.classList.add('enabled');
    // Resume audio context if needed (browser security)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  } else {
    soundToggle.textContent = '🔇 Sound: OFF';
    soundToggle.classList.remove('enabled');
  }
});

function playBoingSound() {
  if (!soundEnabled) return; // Don't play if sound disabled

  const now = audioContext.currentTime;

  // Create oscillator for the "boing" sound
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // Connect audio nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Configure the boing sound - starts low and rises (half duration)
  oscillator.frequency.setValueAtTime(200, now);
  oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.05);
  oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.15);

  // Gentle volume envelope (30% quieter: 0.1 -> 0.07, half duration)
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.07, now + 0.005); // Quick attack
  gainNode.gain.exponentialRampToValueAtTime(0.007, now + 0.15); // Gentle decay

  // Use a triangle wave for a softer sound
  oscillator.type = 'triangle';

  // Play the sound
  oscillator.start(now);
  oscillator.stop(now + 0.15);
}

// Mobile Joystick System
class VirtualJoystick {
  constructor(container, knob) {
    this.container = container;
    this.knob = knob;
    this.centerX = 60; // Half of joystick width
    this.centerY = 60; // Half of joystick height
    this.maxDistance = 35; // Max distance from center
    this.active = false;
    this.x = 0; // -1 to 1
    this.y = 0; // -1 to 1

    this.setupEvents();
  }

  setupEvents() {
    // Touch events
    this.container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.active = true;
      this.handleMove(e.touches[0]);
    });

    this.container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.active) {
        this.handleMove(e.touches[0]);
      }
    });

    this.container.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.active = false;
      this.resetPosition();
    });

    // Mouse events for testing on desktop
    this.container.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.active = true;
      this.handleMove(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.active) {
        this.handleMove(e);
      }
    });

    document.addEventListener('mouseup', () => {
      this.active = false;
      this.resetPosition();
    });
  }

  handleMove(pointer) {
    const rect = this.container.getBoundingClientRect();
    const deltaX = pointer.clientX - rect.left - this.centerX;
    const deltaY = pointer.clientY - rect.top - this.centerY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX);

    const constrainedDistance = Math.min(distance, this.maxDistance);

    const knobX = Math.cos(angle) * constrainedDistance;
    const knobY = Math.sin(angle) * constrainedDistance;

    // Update knob position (preserve CSS centering and add offset)
    this.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

    // Update normalized values (-1 to 1)
    this.x = knobX / this.maxDistance;
    this.y = knobY / this.maxDistance;
  }

  resetPosition() {
    this.knob.style.transform = `translate(-50%, -50%)`;
    this.x = 0;
    this.y = 0;
  }
}

// Initialize joysticks
const leftJoystick = new VirtualJoystick(
  document.getElementById('left-joystick'),
  document.getElementById('left-knob')
);

const rightJoystick = new VirtualJoystick(
  document.getElementById('right-joystick'),
  document.getElementById('right-knob')
);

// WebGL 3D Scene
const canvas = document.getElementById('scene-canvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
  console.error('WebGL2 not supported');
  // Fallback to regular WebGL
  const gl1 = canvas.getContext('webgl');
  if (!gl1) {
    console.error('WebGL not supported at all');
    // Set a fallback background
    canvas.style.background = 'linear-gradient(to bottom, #b3d9ff 0%, #6bb6ff 100%)';
  }
} else {
  // Fullscreen vertex shader
  const vertexShaderSource = `#version 300 es
    in vec2 a_position;
    out vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Ray-traced fragment shader
  const fragmentShaderSource = `#version 300 es
    precision highp float;

    in vec2 v_uv;

    uniform vec2 u_resolution;
    uniform vec3 u_sphereCenter;
    uniform vec3 u_cameraPos;
    uniform vec3 u_cameraTarget;
    uniform float u_time;
    uniform float u_worldBoundary;

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
      int objectId; // 0 = miss, 1 = sphere, 2 = floor
      vec3 point;
      vec3 normal;
    };

    Hit traceRay(vec3 rayOrigin, vec3 rayDir) {
      Hit hit;
      hit.t = -1.0;
      hit.objectId = 0;

      // Test sphere
      float sphereT = intersectSphere(rayOrigin, rayDir, u_sphereCenter, 1.0);

      // Test floor
      vec3 floorPoint = vec3(0.0, -2.0, 0.0);
      vec3 floorNormal = vec3(0.0, 1.0, 0.0);
      float floorT = intersectPlane(rayOrigin, rayDir, floorPoint, floorNormal);

      // Find closest hit
      bool hitSphere = sphereT > 0.0;
      bool hitFloor = floorT > 0.0;

      if (hitSphere && (!hitFloor || sphereT < floorT)) {
        hit.t = sphereT;
        hit.objectId = 1;
        hit.point = rayOrigin + sphereT * rayDir;
        hit.normal = normalize(hit.point - u_sphereCenter);
      } else if (hitFloor) {
        hit.t = floorT;
        hit.objectId = 2;
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

        if (hit.objectId == 1) {
          // Hit sphere
          vec3 sphereColor = vec3(1.0, 0.5, 0.2); // Orange

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

        } else if (hit.objectId == 2) {
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
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  // Create shaders and program
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  if (!vertexShader || !fragmentShader) {
    console.error('Failed to create shaders');
  } else {

  const program = createProgram(gl, vertexShader, fragmentShader);

  if (!program) {
    console.error('Failed to create program');
  } else {


  // Create plane geometry (large quad)
  const planeVertices = new Float32Array([
    -50, 0, -50,  0, 1, 0,  0, 0,
     50, 0, -50,  0, 1, 0,  1, 0,
    -50, 0,  50,  0, 1, 0,  0, 1,
     50, 0,  50,  0, 1, 0,  1, 1
  ]);

  const planeIndices = new Uint16Array([
    0, 1, 2,
    1, 3, 2
  ]);

  // Create sphere geometry
  function createSphere(radius, segments) {
    const vertices = [];
    const indices = [];

    for (let lat = 0; lat <= segments; lat++) {
      const theta = lat * Math.PI / segments;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= segments; lon++) {
        const phi = lon * 2 * Math.PI / segments;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;

        vertices.push(
          radius * x, radius * y, radius * z,  // position
          x, y, z,                              // normal
          lon / segments, lat / segments        // texCoord
        );
      }
    }

    for (let lat = 0; lat < segments; lat++) {
      for (let lon = 0; lon < segments; lon++) {
        const first = (lat * (segments + 1)) + lon;
        const second = first + segments + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices)
    };
  }

  const sphere = createSphere(5, 32);

  // Create buffers
  const planeVAO = gl.createVertexArray();
  gl.bindVertexArray(planeVAO);

  const planeVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, planeVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, planeVertices, gl.STATIC_DRAW);

  const planeIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planeIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, planeIndices, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const normalLocation = gl.getAttribLocation(program, 'a_normal');
  const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');


  if (positionLocation !== -1) {
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 8 * 4, 0);
  }
  if (normalLocation !== -1) {
    gl.enableVertexAttribArray(normalLocation);
    gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 8 * 4, 3 * 4);
  }
  if (texCoordLocation !== -1) {
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 8 * 4, 6 * 4);
  }

  const sphereVAO = gl.createVertexArray();
  gl.bindVertexArray(sphereVAO);

  const sphereVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sphere.vertices, gl.STATIC_DRAW);

  const sphereIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);

  if (positionLocation !== -1) {
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 8 * 4, 0);
  }
  if (normalLocation !== -1) {
    gl.enableVertexAttribArray(normalLocation);
    gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 8 * 4, 3 * 4);
  }
  if (texCoordLocation !== -1) {
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 8 * 4, 6 * 4);
  }

  // Get uniform locations for ray tracing
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
  const sphereCenterLocation = gl.getUniformLocation(program, 'u_sphereCenter');
  const cameraPosLocation = gl.getUniformLocation(program, 'u_cameraPos');
  const cameraTargetLocation = gl.getUniformLocation(program, 'u_cameraTarget');
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  const worldBoundaryLocation = gl.getUniformLocation(program, 'u_worldBoundary');

  // Camera and sphere position
  let spherePosition = [0, 0, 0]; // Sphere floats above floor at y=-2
  const moveSpeed = 0.20;
  const worldBoundary = 50; // ±50 units from center (22.5 seconds to traverse at current speed)

  // Camera controls
  let cameraAngle = 0; // Rotation angle around sphere (in radians)
  let cameraDistance = 7; // Distance from sphere
  let cameraHeight = 4; // Height above sphere
  const rotateSpeed = 0.05;
  const zoomSpeed = 0.2;

  // Input handling
  const keys = {};
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function updateSpherePosition() {
    // Calculate camera-relative movement directions
    const forward = [Math.sin(cameraAngle), 0, Math.cos(cameraAngle)];
    const right = [Math.cos(cameraAngle), 0, -Math.sin(cameraAngle)];

    // Store current position for boundary checking
    const oldPosition = [spherePosition[0], spherePosition[1], spherePosition[2]];

    // Combine keyboard and joystick input for movement
    let moveX = 0, moveZ = 0;

    // WASD keyboard input
    if (keys['w']) moveZ -= 1;
    if (keys['s']) moveZ += 1;
    if (keys['a']) moveX -= 1;
    if (keys['d']) moveX += 1;

    // Left joystick input (WASD equivalent)
    moveX += leftJoystick.x;
    moveZ += leftJoystick.y; // Match WASD behavior

    // Apply movement relative to camera direction
    if (moveX !== 0 || moveZ !== 0) {
      spherePosition[0] += (forward[0] * moveZ + right[0] * moveX) * moveSpeed;
      spherePosition[2] += (forward[2] * moveZ + right[2] * moveX) * moveSpeed;
    }

    // Boundary collision detection
    if (Math.abs(spherePosition[0]) > worldBoundary) {
      spherePosition[0] = oldPosition[0]; // Revert X movement
    }
    if (Math.abs(spherePosition[2]) > worldBoundary) {
      spherePosition[2] = oldPosition[2]; // Revert Z movement
    }

    // Combine keyboard and joystick input for camera control
    let cameraRotate = 0, cameraZoom = 0;

    // Arrow key input
    if (keys['arrowleft']) cameraRotate += 1;
    if (keys['arrowright']) cameraRotate -= 1;
    if (keys['arrowup']) cameraZoom -= 1;
    if (keys['arrowdown']) cameraZoom += 1;

    // Right joystick input (arrow key equivalent)
    cameraRotate -= rightJoystick.x; // Invert X for correct rotation direction
    cameraZoom += rightJoystick.y;

    // Apply camera changes
    if (cameraRotate !== 0) {
      cameraAngle += cameraRotate * rotateSpeed;
    }
    if (cameraZoom !== 0) {
      cameraDistance = Math.max(2, Math.min(15, cameraDistance + cameraZoom * zoomSpeed));
    }
  }

  // Resize canvas
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();


  // FPS tracking
  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 0;
  const fpsElement = document.getElementById('fps-counter');

  // Mini-map elements
  const miniMapPlayer = document.getElementById('mini-map-player');
  const miniMapDirection = document.getElementById('mini-map-direction');

  // Update mini-map
  function updateMiniMap() {
    // Convert world coordinates to mini-map coordinates
    // Check if we're on mobile (width < 1024px)
    const isMobile = window.innerWidth < 1024;
    const mapSize = isMobile ? 65 : 130; // Mobile uses smaller boundary
    const mapMargin = isMobile ? 5 : 10;  // Mobile uses smaller margin
    const mapCenter = mapSize / 2 + mapMargin;

    const mapX = mapCenter + (spherePosition[0] / worldBoundary) * (mapSize / 2);
    const mapZ = mapCenter + (spherePosition[2] / worldBoundary) * (mapSize / 2);

    miniMapPlayer.style.left = `${mapX}px`;
    miniMapPlayer.style.top = `${mapZ}px`;

    // Update direction indicator (camera angle in degrees)
    const directionDegrees = (-cameraAngle * 180 / Math.PI) + 90; // Reverse and add 90° to align with mini-map orientation
    miniMapDirection.style.transform = `translate(-50%, -100%) rotate(${directionDegrees}deg)`;
  }

  // Render loop
  function render(time) {
    updateSpherePosition();
    updateMiniMap();

    // FPS calculation
    frameCount++;
    if (time - lastTime >= 1000) { // Update FPS every second
      fps = Math.round((frameCount * 1000) / (time - lastTime));
      fpsElement.textContent = `FPS: ${fps}`;
      frameCount = 0;
      lastTime = time;
    }

    // Clear with a different color to verify canvas is working
    gl.clearColor(0.2, 0.2, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);

    // Calculate camera position using polar coordinates around sphere (fixed Y position)
    const fixedSphereY = -1.0; // Keep camera at a fixed height relative to sphere's center position
    const cameraPosition = [
      spherePosition[0] + Math.sin(cameraAngle) * cameraDistance,
      fixedSphereY + cameraHeight,
      spherePosition[2] + Math.cos(cameraAngle) * cameraDistance
    ];


    // Add energetic boinnnngy bounce motion to sphere
    const bounceHeight = 1.0; // Maximum bounce height (half as high)
    const bounceSpeed = 5.6; // How fast the bouncing cycle is (40% faster!)
    const sphereRadius = 1.0; // Sphere radius from shader
    const groundLevel = -2.0; // Floor level from shader

    // Create a gravity-like bounce using a parabolic arc
    const cycle = (time * 0.001 * bounceSpeed) % (2 * Math.PI);
    const normalizedTime = cycle / (2 * Math.PI); // 0 to 1 for one complete bounce

    // Use a parabolic function that starts and ends at ground level
    // y = 4h * t * (1-t) gives a parabola from 0 to 1 with peak at 0.5
    const bounceY = 4 * bounceHeight * normalizedTime * (1 - normalizedTime);
    const bobbingY = (groundLevel + sphereRadius) + bounceY;

    // Detect ground impact for sound (when sphere is at its lowest point)
    const isAtGround = bounceY < 0.05; // Very close to ground
    const timeSinceLastBounce = time - lastBounceTime;

    if (isAtGround && timeSinceLastBounce > 200) { // Prevent multiple triggers, min 200ms between bounces
      playBoingSound();
      lastBounceTime = time;
    }

    // Set uniforms for ray tracing
    const sphereZenith = (groundLevel + sphereRadius) + (bounceHeight / 2); // Midpoint of bounce
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform3f(sphereCenterLocation, spherePosition[0], bobbingY, spherePosition[2]);
    gl.uniform3f(cameraPosLocation, cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    gl.uniform3f(cameraTargetLocation, spherePosition[0], sphereZenith, spherePosition[2]);
    gl.uniform1f(timeLocation, time * 0.001);
    gl.uniform1f(worldBoundaryLocation, worldBoundary);

    // Create fullscreen quad
    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const quadVAO = gl.createVertexArray();
    gl.bindVertexArray(quadVAO);

    if (positionLocation !== -1) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }


    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
  } // end program check
  } // end shader check
} // end WebGL2 check
