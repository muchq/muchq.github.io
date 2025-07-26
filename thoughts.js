document.querySelector('.mobile-menu-toggle').addEventListener('click', function() {
  document.querySelector('.nav-menu').classList.toggle('active');
});

// Audio setup for bounce sound and background music (global scope)
let audioContext = null;
let lastBounceTime = 0;
let soundEnabled = false; // Default sound off

// Initialize audio context only when needed (mobile compatibility)
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Simplified background music system
let backgroundMusic = {
  isPlaying: false,
  gainNode: null,
  nextNoteTime: 0,
  tempo: 60, // Slower, more relaxed
  noteIndex: 0,
  chordIndex: 0
};

// Simple melody pattern - just peaceful arpeggios
const melodyPattern = [
  60, 64, 67, 72, // C E G C' (simple arpeggio)
  67, 71, 74, 79, // G B D G'
  57, 60, 64, 69, // A C E A'
  65, 69, 72, 77  // F A C F'
];

// Simple chord progression (I-V-vi-IV in C major)
const chordProgression = [
  [60, 64, 67], // C major
  [67, 71, 74], // G major  
  [57, 60, 64], // A minor
  [65, 69, 72]  // F major
];

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Simple reverb using delay instead of convolution (mobile-friendly)
function createSimpleReverb() {
  const delay = audioContext.createDelay(0.3);
  const feedback = audioContext.createGain();
  const wetGain = audioContext.createGain();
  
  delay.delayTime.setValueAtTime(0.15, audioContext.currentTime);
  feedback.gain.setValueAtTime(0.3, audioContext.currentTime);
  wetGain.gain.setValueAtTime(0.2, audioContext.currentTime);
  
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wetGain);
  
  return { input: delay, output: wetGain };
}

function createSimpleNote(frequency, startTime, duration, volume = 0.03) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.1);
  gainNode.gain.setValueAtTime(volume, startTime + duration * 0.7);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(backgroundMusic.gainNode);
  
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
  
  return { oscillator, gainNode };
}

function createSimpleChord(frequencies, startTime, duration) {
  const chordOscillators = [];
  
  frequencies.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, startTime);
    
    const volume = 0.02; // Quieter chords
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.2);
    gainNode.gain.setValueAtTime(volume, startTime + duration - 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(backgroundMusic.gainNode);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    
    chordOscillators.push({ oscillator, gainNode });
  });
  
  return chordOscillators;
}


function scheduleNextMusicNotes() {
  if (!backgroundMusic.isPlaying) return;
  
  const currentTime = audioContext.currentTime;
  const secondsPerBeat = 60.0 / backgroundMusic.tempo;
  const noteLength = secondsPerBeat * 2; // Half notes
  const chordLength = secondsPerBeat * 8; // Very long chords
  
  // Schedule ahead by 200ms
  while (backgroundMusic.nextNoteTime < currentTime + 0.2) {
    // Play melody note occasionally (30% chance)
    if (Math.random() < 0.3) {
      const melodyMidi = melodyPattern[backgroundMusic.noteIndex];
      const melodyFreq = midiToFreq(melodyMidi);
      createSimpleNote(melodyFreq, backgroundMusic.nextNoteTime, noteLength * 1.5);
    }
    
    // Play chord every 8 beats
    if (backgroundMusic.noteIndex % 4 === 0) {
      const chord = chordProgression[backgroundMusic.chordIndex];
      const chordFreqs = chord.map(midi => midiToFreq(midi - 12));
      createSimpleChord(chordFreqs, backgroundMusic.nextNoteTime, chordLength);
      
      backgroundMusic.chordIndex = (backgroundMusic.chordIndex + 1) % chordProgression.length;
    }
    
    // Advance to next note
    backgroundMusic.nextNoteTime += noteLength;
    backgroundMusic.noteIndex = (backgroundMusic.noteIndex + 1) % melodyPattern.length;
  }
  
  // Schedule next batch
  if (backgroundMusic.isPlaying) {
    setTimeout(scheduleNextMusicNotes, 200);
  }
}

function startBackgroundMusic() {
  if (backgroundMusic.isPlaying || !soundEnabled) return;
  
  // Initialize audio context if needed
  initAudioContext();
  
  // Create master gain node for background music
  backgroundMusic.gainNode = audioContext.createGain();
  backgroundMusic.gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Much quieter
  backgroundMusic.gainNode.connect(audioContext.destination);
  
  backgroundMusic.isPlaying = true;
  backgroundMusic.nextNoteTime = audioContext.currentTime;
  backgroundMusic.noteIndex = 0;
  backgroundMusic.chordIndex = 0;
  
  scheduleNextMusicNotes();
  console.log('🎵 Started simple background music');
}

function stopBackgroundMusic() {
  if (!backgroundMusic.isPlaying) return;
  
  backgroundMusic.isPlaying = false;
  
  // Clean up gain node
  if (backgroundMusic.gainNode) {
    backgroundMusic.gainNode.disconnect();
    backgroundMusic.gainNode = null;
  }
  
  console.log('🎵 Stopped background music');
}

// Sound toggle functionality
const soundToggle = document.getElementById('sound-toggle');
soundToggle.addEventListener('click', function() {
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    soundToggle.textContent = '🔊 Sound: ON';
    soundToggle.classList.add('enabled');
    
    // Initialize and resume audio context if needed (mobile compatibility)
    const context = initAudioContext();
    if (context.state === 'suspended') {
      context.resume().then(() => {
        startBackgroundMusic();
      });
    } else {
      startBackgroundMusic();
    }
  } else {
    soundToggle.textContent = '🔇 Sound: OFF';
    soundToggle.classList.remove('enabled');
    stopBackgroundMusic();
  }
});

function playBoingSound() {
  if (!soundEnabled || !audioContext) return;

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Simple bounce sound
  const frequency = 200 + Math.random() * 100;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.type = 'sine';

  // Quick attack and decay
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.05, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  oscillator.start(now);
  oscillator.stop(now + 0.1);
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
    uniform vec3 u_cameraPos;
    uniform vec3 u_cameraTarget;
    uniform float u_time;
    uniform float u_worldBoundary;
    
    // Multiple sphere support (up to 10 players)
    uniform int u_numSpheres;
    uniform vec3 u_sphereCenters[10];
    uniform vec3 u_sphereColors[10];

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

      // Test all spheres
      for (int i = 0; i < u_numSpheres && i < 10; i++) {
        float sphereT = intersectSphere(rayOrigin, rayDir, u_sphereCenters[i], 1.0);
        if (sphereT > 0.0 && sphereT < closestT) {
          closestT = sphereT;
          hit.t = sphereT;
          hit.objectId = i + 1; // sphere indices start at 1
          hit.point = rayOrigin + sphereT * rayDir;
          hit.normal = normalize(hit.point - u_sphereCenters[i]);
          hit.color = u_sphereColors[i];
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
  const cameraPosLocation = gl.getUniformLocation(program, 'u_cameraPos');
  const cameraTargetLocation = gl.getUniformLocation(program, 'u_cameraTarget');
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  const worldBoundaryLocation = gl.getUniformLocation(program, 'u_worldBoundary');
  
  // Multiple spheres support
  const numSpheresLocation = gl.getUniformLocation(program, 'u_numSpheres');
  const sphereCentersLocation = gl.getUniformLocation(program, 'u_sphereCenters');
  const sphereColorsLocation = gl.getUniformLocation(program, 'u_sphereColors');

  // Game Configuration
  const GAME_CONFIG = {
    moveSpeed: 0.20,
    worldBoundary: 50,
    rotateSpeed: 0.05,
    zoomSpeed: 0.2,
    bounceHeight: 1.0,
    bounceSpeed: 5.6,
    sphereRadius: 1.0,
    groundLevel: -2.0
  };

  // Utility Functions for Random Generation
  function generateRandomColor() {
    // Generate vibrant, saturated colors
    const hue = Math.random() * 360; // 0-360 degrees
    const saturation = 0.7 + Math.random() * 0.3; // 70-100% saturation
    const lightness = 0.4 + Math.random() * 0.3; // 40-70% lightness
    
    // Convert HSL to RGB
    const h = hue / 60;
    const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = lightness - c / 2;
    
    let r, g, b;
    if (h < 1) { r = c; g = x; b = 0; }
    else if (h < 2) { r = x; g = c; b = 0; }
    else if (h < 3) { r = 0; g = c; b = x; }
    else if (h < 4) { r = 0; g = x; b = c; }
    else if (h < 5) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return [r + m, g + m, b + m];
  }
  
  function generateRandomSpawnPosition() {
    // Generate random position within world boundary
    // Leave some margin from the edges for safety
    const margin = 5;
    const safeZone = GAME_CONFIG.worldBoundary - margin;
    
    const x = (Math.random() - 0.5) * 2 * safeZone; // -safeZone to +safeZone
    const z = (Math.random() - 0.5) * 2 * safeZone; // -safeZone to +safeZone
    const y = 0; // Always spawn at ground level
    
    return [x, y, z];
  }
  
  function generatePlayerId() {
    // Generate unique player ID
    return 'player-' + Math.random().toString(36).substr(2, 9);
  }

  // Network Communication System
  class NetworkManager {
    constructor() {
      this.ws = null;
      this.isConnected = false;
      this.lastSentPosition = null;
      this.positionUpdateThrottle = 50; // Send updates max every 50ms (20fps)
      this.lastPositionSent = 0;
      this.messageHandlers = new Map();
      
      // For testing: simulate server with local storage
      this.isSimulated = false;
    }
    
    connect(url = 'wss://thoughts.muchq.com/ws') {
      if (this.isSimulated) {
        // Simulate successful connection
        console.log('🔌 Simulating WebSocket connection to', url);
        this.isConnected = true;
        this.onConnected();
        return;
      }
      
      try {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          console.log('🔌 WebSocket connected to', url);
          this.isConnected = true;
          this.onConnected();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
        
        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.isConnected = false;
          this.onDisconnected();
        };
        
        this.ws.onerror = (error) => {
          console.error('🔌 WebSocket error:', error);
          this.isConnected = false;
        };
      } catch (error) {
        console.error('🔌 Failed to connect to WebSocket:', error);
        this.isConnected = false;
      }
    }
    
    onConnected() {
      // Send initial player spawn data
      this.sendPlayerJoin();
      
      // Start fake server if in simulation mode
      if (this.isSimulated) {
        fakeServer.start();
      }
    }
    
    onDisconnected() {
      // Handle disconnection
    }
    
    sendPlayerJoin() {
      const localPlayer = gameState.getLocalPlayer();
      if (!localPlayer) return;
      
      const message = {
        type: 'player_join',
        playerId: localPlayer.id,
        position: localPlayer.position,
        color: localPlayer.color,
        timestamp: Date.now()
      };
      
      this.sendMessage(message);
      console.log('📤 Sent player join:', message);
    }
    
    sendPositionUpdate(position) {
      const now = Date.now();
      
      // Throttle position updates
      if (now - this.lastPositionSent < this.positionUpdateThrottle) {
        return;
      }
      
      // Check if position actually changed significantly
      if (this.lastSentPosition) {
        const dx = position[0] - this.lastSentPosition[0];
        const dz = position[2] - this.lastSentPosition[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Only send if moved more than 0.1 units
        if (distance < 0.1) {
          return;
        }
      }
      
      const localPlayer = gameState.getLocalPlayer();
      if (!localPlayer) return;
      
      const message = {
        type: 'position_update',
        playerId: localPlayer.id,
        position: position,
        timestamp: now
      };
      
      this.sendMessage(message);
      this.lastSentPosition = [...position];
      this.lastPositionSent = now;
      
      console.log('📤 Sent position update:', message);
    }
    
    sendMessage(message) {
      if (this.isSimulated) {
        // Simulate sending to server (just log for now)
        console.log('📡 [SIMULATED] Sending to server:', message);
        return;
      }
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    }
    
    handleMessage(message) {
      console.log('📥 Received from server:', message);
      
      switch (message.type) {
        case 'player_join':
          this.handlePlayerJoin(message);
          break;
        case 'player_leave':
          this.handlePlayerLeave(message);
          break;
        case 'position_update':
          this.handlePositionUpdate(message);
          break;
        case 'game_state':
          this.handleGameState(message);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    }
    
    handlePlayerJoin(message) {
      if (message.playerId !== gameState.localPlayerId) {
        gameState.addPlayer(message.playerId, message.position, message.color);
        console.log(`👋 Player ${message.playerId} joined at [${message.position.join(', ')}]`);
      }
    }
    
    handlePlayerLeave(message) {
      if (message.playerId !== gameState.localPlayerId) {
        const player = gameState.players.get(message.playerId);
        if (player) {
          console.log(`👋 Player ${message.playerId} left the game`);
          gameState.removePlayer(message.playerId);
          console.log(`📊 ${gameState.players.size} players remaining`);
        }
      }
    }
    
    handlePositionUpdate(message) {
      if (message.playerId !== gameState.localPlayerId) {
        gameState.updatePlayer(message.playerId, message.position);
      }
    }
    
    handleGameState(message) {
      // Handle full game state updates
      console.log('🎮 Received game state update:', message);
      
      // Process the players array from the game_state message
      if (message.players && Array.isArray(message.players)) {
        message.players.forEach(player => {
          // Skip adding the local player (check against gameState.localPlayerId)
          if (player.playerId !== gameState.localPlayerId) {
            gameState.addPlayer(player.playerId, player.position, player.color);
            console.log(`🎮 Added player ${player.playerId} from game state at [${player.position.join(', ')}]`);
          }
        });
      }
    }
    
    disconnect() {
      if (this.ws) {
        this.ws.close();
      }
      this.isConnected = false;
    }
  }
  
  // Initialize network manager
  const networkManager = new NetworkManager();

  // Fake Server Simulation (for testing multiplayer without real server)
  class FakeServer {
    constructor() {
      this.players = new Map();
      this.isRunning = false;
      this.updateInterval = null;
      this.botPlayers = [];
      this.stateUpdateFrequency = 300; // Send state updates every 300ms for smoother movement
    }
    
    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      
      // Create some bot players for testing
      this.createBotPlayers(2); // Create 2 bot players
      
      // Start sending periodic state updates
      this.updateInterval = setInterval(() => {
        this.sendStateUpdate();
      }, this.stateUpdateFrequency);
      
      console.log('🤖 Fake server started with bot players');
    }
    
    stop() {
      if (!this.isRunning) return;
      this.isRunning = false;
      
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      console.log('🤖 Fake server stopped');
    }
    
    createBotPlayers(count) {
      for (let i = 0; i < count; i++) {
        const botId = `bot-${i + 1}`;
        const botPlayer = {
          id: botId,
          position: generateRandomSpawnPosition(),
          color: generateRandomColor(),
          velocity: [0, 0, 0], // Start stationary
          direction: Math.random() * Math.PI * 2, // Random direction
          speed: 0.02 + Math.random() * 0.03, // Adjusted for 300ms updates: 0.02-0.05 units per update
          directionChangeTimer: 0
        };
        
        this.players.set(botId, botPlayer);
        this.botPlayers.push(botPlayer);
        
        // Simulate bot joining
        setTimeout(() => {
          this.simulatePlayerJoin(botPlayer);
        }, 1000 + i * 500); // Stagger bot joins
      }
    }
    
    updateBotPositions() {
      this.botPlayers.forEach(bot => {
        // Increment direction change timer
        bot.directionChangeTimer++;
        
        // Change direction less frequently and more smoothly
        if (bot.directionChangeTimer > 10 + Math.random() * 17) { // Change direction every 3-8 seconds (adjusted for 300ms updates)
          bot.direction += (Math.random() - 0.5) * 0.3; // Smaller direction changes
          bot.directionChangeTimer = 0;
        }
        
        // Sometimes pause movement for more natural behavior
        const shouldMove = Math.random() > 0.1; // 90% chance to move each update
        
        if (shouldMove) {
          // Update velocity based on direction (much slower)
          bot.velocity[0] = Math.cos(bot.direction) * bot.speed;
          bot.velocity[2] = Math.sin(bot.direction) * bot.speed;
          
          // Update position
          bot.position[0] += bot.velocity[0];
          bot.position[2] += bot.velocity[2];
        }
        
        // Smoother boundary handling - turn around gradually when approaching edges
        const boundaryBuffer = 10;
        if (Math.abs(bot.position[0]) > GAME_CONFIG.worldBoundary - boundaryBuffer) {
          // Turn away from boundary gradually
          const turnDirection = bot.position[0] > 0 ? Math.PI : 0;
          bot.direction = bot.direction * 0.8 + turnDirection * 0.2;
          bot.directionChangeTimer = 0;
        }
        if (Math.abs(bot.position[2]) > GAME_CONFIG.worldBoundary - boundaryBuffer) {
          // Turn away from boundary gradually  
          const turnDirection = bot.position[2] > 0 ? -Math.PI/2 : Math.PI/2;
          bot.direction = bot.direction * 0.8 + turnDirection * 0.2;
          bot.directionChangeTimer = 0;
        }
      });
    }
    
    sendStateUpdate() {
      if (!this.isRunning) return;
      
      // Update bot positions
      this.updateBotPositions();
      
      // Occasionally disconnect and reconnect bots for testing
      if (Math.random() < 0.002) { // 0.2% chance per update (roughly every 2-3 minutes)
        this.simulateRandomDisconnection();
      }
      
      // Send position updates for each bot
      this.botPlayers.forEach(bot => {
        const message = {
          type: 'position_update',
          playerId: bot.id,
          position: [...bot.position],
          timestamp: Date.now()
        };
        
        // Simulate receiving the message
        setTimeout(() => {
          networkManager.handleMessage(message);
        }, 10 + Math.random() * 20); // Simulate 10-30ms network latency
      });
    }
    
    simulateRandomDisconnection() {
      if (this.botPlayers.length === 0) return;
      
      // Pick a random bot to disconnect
      const randomIndex = Math.floor(Math.random() * this.botPlayers.length);
      const botToRemove = this.botPlayers[randomIndex];
      
      console.log(`🤖 Simulating disconnection of bot ${botToRemove.id}`);
      this.simulatePlayerLeave(botToRemove.id);
      
      // After a random delay, add a new bot to maintain population
      setTimeout(() => {
        if (this.isRunning && this.botPlayers.length < 3) { // Keep 2-3 bots
          console.log('🤖 Adding replacement bot after disconnection');
          this.createBotPlayers(1);
        }
      }, 3000 + Math.random() * 5000); // Wait 3-8 seconds before adding replacement
    }
    
    simulatePlayerJoin(player) {
      const message = {
        type: 'player_join',
        playerId: player.id,
        position: [...player.position],
        color: [...player.color],
        timestamp: Date.now()
      };
      
      // Simulate receiving the join message
      setTimeout(() => {
        networkManager.handleMessage(message);
      }, 50 + Math.random() * 100); // Simulate 50-150ms network latency
    }
    
    simulatePlayerLeave(playerId) {
      const message = {
        type: 'player_leave',
        playerId: playerId,
        timestamp: Date.now()
      };
      
      // Simulate receiving the leave message
      setTimeout(() => {
        networkManager.handleMessage(message);
      }, 50 + Math.random() * 100);
      
      // Remove from fake server
      this.players.delete(playerId);
      this.botPlayers = this.botPlayers.filter(bot => bot.id !== playerId);
    }
  }
  
  // Initialize fake server
  const fakeServer = new FakeServer();
  
  // Global function for testing disconnections (available in browser console)
  window.testDisconnection = () => {
    console.log('🧪 Testing bot disconnection...');
    fakeServer.simulateRandomDisconnection();
  };

  // Player Management
  class Player {
    constructor(id, position = [0, 0, 0], color = [1.0, 0.5, 0.2]) {
      this.id = id;
      this.position = [...position];
      this.color = [...color];
      this.lastBounceTime = 0;
    }
    
    updatePosition(newPosition) {
      this.position = [...newPosition];
    }
    
    getBouncingY(time) {
      const cycle = (time * 0.001 * GAME_CONFIG.bounceSpeed) % (2 * Math.PI);
      const normalizedTime = cycle / (2 * Math.PI);
      const bounceY = 4 * GAME_CONFIG.bounceHeight * normalizedTime * (1 - normalizedTime);
      return (GAME_CONFIG.groundLevel + GAME_CONFIG.sphereRadius) + bounceY;
    }
  }

  // Game State Management
  class GameState {
    constructor() {
      this.players = new Map();
      this.localPlayerId = null;
      this.camera = {
        angle: 0,
        distance: 7,
        height: 4
      };
    }
    
    addPlayer(id, position, color) {
      const player = new Player(id, position, color);
      this.players.set(id, player);
      return player;
    }
    
    removePlayer(id) {
      this.players.delete(id);
    }
    
    updatePlayer(id, position) {
      const player = this.players.get(id);
      if (player) {
        player.updatePosition(position);
      }
    }
    
    getLocalPlayer() {
      return this.players.get(this.localPlayerId);
    }
    
    getAllPlayers() {
      return Array.from(this.players.values());
    }
  }

  // Initialize game state
  const gameState = new GameState();

  // Input handling
  const keys = {};
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function updateLocalPlayer() {
    const localPlayer = gameState.getLocalPlayer();
    if (!localPlayer) return;
    
    // Calculate camera-relative movement directions
    const forward = [Math.sin(gameState.camera.angle), 0, Math.cos(gameState.camera.angle)];
    const right = [Math.cos(gameState.camera.angle), 0, -Math.sin(gameState.camera.angle)];

    // Store current position for boundary checking and network updates
    const oldPosition = [...localPlayer.position];

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
      localPlayer.position[0] += (forward[0] * moveZ + right[0] * moveX) * GAME_CONFIG.moveSpeed;
      localPlayer.position[2] += (forward[2] * moveZ + right[2] * moveX) * GAME_CONFIG.moveSpeed;
    }

    // Boundary collision detection
    if (Math.abs(localPlayer.position[0]) > GAME_CONFIG.worldBoundary) {
      localPlayer.position[0] = oldPosition[0]; // Revert X movement
    }
    if (Math.abs(localPlayer.position[2]) > GAME_CONFIG.worldBoundary) {
      localPlayer.position[2] = oldPosition[2]; // Revert Z movement
    }

    // Check if position changed and send network update
    const positionChanged = (
      Math.abs(localPlayer.position[0] - oldPosition[0]) > 0.01 ||
      Math.abs(localPlayer.position[2] - oldPosition[2]) > 0.01
    );
    
    if (positionChanged && networkManager.isConnected) {
      networkManager.sendPositionUpdate(localPlayer.position);
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
      gameState.camera.angle += cameraRotate * GAME_CONFIG.rotateSpeed;
    }
    if (cameraZoom !== 0) {
      gameState.camera.distance = Math.max(2, Math.min(15, gameState.camera.distance + cameraZoom * GAME_CONFIG.zoomSpeed));
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
  const miniMapContent = document.getElementById('mini-map-content');
  
  // Track other player elements on minimap
  const otherPlayerElements = new Map();

  // Update mini-map
  function updateMiniMap() {
    const localPlayer = gameState.getLocalPlayer();
    if (!localPlayer) return;
    
    // Convert world coordinates to mini-map coordinates
    // Check if we're on mobile (width < 1024px)
    const isMobile = window.innerWidth < 1024;
    const mapSize = isMobile ? 65 : 130; // Mobile uses smaller boundary
    const mapMargin = isMobile ? 5 : 10;  // Mobile uses smaller margin
    const mapCenter = mapSize / 2 + mapMargin;

    // Helper function to convert world position to minimap position
    function worldToMiniMap(worldPos) {
      const mapX = mapCenter + (worldPos[0] / GAME_CONFIG.worldBoundary) * (mapSize / 2);
      const mapZ = mapCenter + (worldPos[2] / GAME_CONFIG.worldBoundary) * (mapSize / 2);
      return [mapX, mapZ];
    }

    // Update local player position
    const [localMapX, localMapZ] = worldToMiniMap(localPlayer.position);
    miniMapPlayer.style.left = `${localMapX}px`;
    miniMapPlayer.style.top = `${localMapZ}px`;

    // Update direction indicator to point forward (camera direction)
    const directionDegrees = -gameState.camera.angle * 180 / Math.PI; // Convert to degrees, pointing forward
    miniMapDirection.style.transform = `translate(-50%, -50%) rotate(${directionDegrees}deg)`;
    
    // Update other players
    const allPlayers = Array.from(gameState.players.values());
    const currentOtherPlayerIds = new Set();
    
    allPlayers.forEach(player => {
      if (player.id === gameState.localPlayerId) return; // Skip local player
      
      currentOtherPlayerIds.add(player.id);
      
      // Get or create element for this player
      let playerElement = otherPlayerElements.get(player.id);
      if (!playerElement) {
        playerElement = document.createElement('div');
        playerElement.className = 'mini-map-other-player';
        miniMapContent.appendChild(playerElement);
        otherPlayerElements.set(player.id, playerElement);
      }
      
      // Update position and color
      const [otherMapX, otherMapZ] = worldToMiniMap(player.position);
      playerElement.style.left = `${otherMapX}px`;
      playerElement.style.top = `${otherMapZ}px`;
      
      // Set player color
      const [r, g, b] = player.color;
      playerElement.style.backgroundColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
      playerElement.style.boxShadow = `0 0 6px rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.8)`;
    });
    
    // Remove elements for players who are no longer present
    otherPlayerElements.forEach((element, playerId) => {
      if (!currentOtherPlayerIds.has(playerId)) {
        element.remove();
        otherPlayerElements.delete(playerId);
      }
    });
  }

  // Initialize the local player with random spawn
  gameState.localPlayerId = generatePlayerId();
  const randomSpawnPosition = generateRandomSpawnPosition();
  const randomColor = generateRandomColor();
  
  console.log(`Spawning player ${gameState.localPlayerId} at position [${randomSpawnPosition.map(x => x.toFixed(2)).join(', ')}] with color [${randomColor.map(x => x.toFixed(2)).join(', ')}]`);
  
  gameState.addPlayer(gameState.localPlayerId, randomSpawnPosition, randomColor);
  
  // Connect to server (or simulate connection)
  networkManager.connect();
  
  // Handle page unload - notify server when player leaves
  window.addEventListener('beforeunload', () => {
    if (networkManager.isConnected) {
      const localPlayer = gameState.getLocalPlayer();
      if (localPlayer) {
        const message = {
          type: 'player_leave',
          playerId: localPlayer.id,
          timestamp: Date.now()
        };
        networkManager.sendMessage(message);
      }
      networkManager.disconnect();
    }
  });

  // Render loop
  function render(time) {
    updateLocalPlayer();
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

    const localPlayer = gameState.getLocalPlayer();
    if (!localPlayer) return;

    // Calculate camera position using polar coordinates around local player (fixed Y position)
    const fixedSphereY = -1.0; // Keep camera at a fixed height relative to sphere's center position
    const cameraPosition = [
      localPlayer.position[0] + Math.sin(gameState.camera.angle) * gameState.camera.distance,
      fixedSphereY + gameState.camera.height,
      localPlayer.position[2] + Math.cos(gameState.camera.angle) * gameState.camera.distance
    ];

    // Get bouncing Y position for local player
    const bobbingY = localPlayer.getBouncingY(time);

    // Detect ground impact for sound (when sphere is at its lowest point)
    const cycle = (time * 0.001 * GAME_CONFIG.bounceSpeed) % (2 * Math.PI);
    const normalizedTime = cycle / (2 * Math.PI);
    const bounceY = 4 * GAME_CONFIG.bounceHeight * normalizedTime * (1 - normalizedTime);
    const isAtGround = bounceY < 0.05; // Very close to ground
    const timeSinceLastBounce = time - localPlayer.lastBounceTime;

    if (isAtGround && timeSinceLastBounce > 200) { // Prevent multiple triggers, min 200ms between bounces
      playBoingSound();
      localPlayer.lastBounceTime = time;
    }

    // Prepare sphere data for all players
    const allPlayers = Array.from(gameState.players.values());
    const sphereCenters = [];
    const sphereColors = [];
    
    // Add all players' sphere data
    for (let i = 0; i < Math.min(allPlayers.length, 10); i++) {
      const player = allPlayers[i];
      const playerBobbingY = player.getBouncingY(time);
      
      // Add sphere center using direct position
      sphereCenters.push(player.position[0], playerBobbingY, player.position[2]);
      
      // Add sphere color
      sphereColors.push(player.color[0], player.color[1], player.color[2]);
    }
    
    // Pad arrays to size 10 if needed
    while (sphereCenters.length < 30) sphereCenters.push(0.0); // 10 spheres * 3 components
    while (sphereColors.length < 30) sphereColors.push(0.0); // 10 spheres * 3 components

    // Set uniforms for ray tracing
    const sphereZenith = (GAME_CONFIG.groundLevel + GAME_CONFIG.sphereRadius) + (GAME_CONFIG.bounceHeight / 2); // Midpoint of bounce
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform3f(cameraPosLocation, cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    gl.uniform3f(cameraTargetLocation, localPlayer.position[0], sphereZenith, localPlayer.position[2]);
    gl.uniform1f(timeLocation, time * 0.001);
    gl.uniform1f(worldBoundaryLocation, GAME_CONFIG.worldBoundary);
    
    // Set multiple sphere data
    gl.uniform1i(numSpheresLocation, Math.min(allPlayers.length, 10));
    gl.uniform3fv(sphereCentersLocation, sphereCenters);
    gl.uniform3fv(sphereColorsLocation, sphereColors);

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
