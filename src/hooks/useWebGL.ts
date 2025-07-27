import { useCallback } from 'react'

const vertexShaderSource = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const fragmentShaderSource = `#version 300 es
  precision highp float;

  in vec2 v_uv;
  out vec4 fragColor;

  uniform vec2 u_resolution;
  uniform vec2 u_juliaC;
  uniform float u_time;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    uv *= 2.0;

    vec2 z = uv;
    vec2 c = u_juliaC + vec2(sin(u_time * 0.1) * 0.1, cos(u_time * 0.15) * 0.1);

    float iterations = 0.0;
    const float maxIterations = 500.0;

    for(float i = 0.0; i < maxIterations; i++) {
      if(dot(z, z) > 4.0) break;

      // z = z^2 + c
      float temp = z.x * z.x - z.y * z.y + c.x;
      z.y = 2.0 * z.x * z.y + c.y;
      z.x = temp;

      iterations = i;
    }

    if(iterations >= maxIterations - 1.0) {
      // Retro grid pattern for convergent areas (inside Julia set)
      vec2 gridUV = uv * 8.0;
      vec2 gridLines = abs(fract(gridUV) - 0.5);
      float grid = min(gridLines.x, gridLines.y);

      float lineWidth = 0.05;
      float gridMask = 1.0 - smoothstep(0.0, lineWidth, grid);

      float colorPhase = length(uv) * 2.0 + u_time * 0.3;
      float hue1 = sin(colorPhase) * 0.5 + 0.5;
      float hue2 = sin(colorPhase + 2.0) * 0.5 + 0.5;

      float retroHue = mix(0.8, 0.0, hue1) + mix(0.0, 0.3, hue2);
      retroHue = fract(retroHue);

      float retroSat = 0.8 + sin(u_time * 0.2 + length(uv)) * 0.15;
      float retroBright = 0.6 + cos(u_time * 0.15 + uv.x * 2.0) * 0.2;

      vec3 retroColor = hsv2rgb(vec3(retroHue, retroSat, retroBright));

      vec3 bgColor = vec3(0.05, 0.02, 0.08);

      // Star field
      vec2 starCoord = uv * 10.0;
      vec2 starCell = floor(starCoord);
      vec2 starFract = fract(starCoord);

      float starRandom = fract(sin(dot(starCell, vec2(12.9898, 78.233))) * 43758.5453);

      float starThreshold = 0.10;
      float starBrightness = 0.0;

      if (starRandom > starThreshold) {
        float starX = fract(starRandom * 17.0);
        float starY = fract(starRandom * 31.0);

        vec2 starPos = vec2(starX, starY);
        float starDist = length(starFract - starPos);

        float starSize = 0.0125 + fract(starRandom * 7.0) * 0.0125;
        starBrightness = 1.0 - smoothstep(0.0, starSize, starDist);
        starBrightness *= (0.8 + fract(starRandom * 13.0) * 0.35);

        float twinklePhase = starRandom * 62.83;
        float twinkleSpeed = 1.5 + fract(starRandom * 41.0) * 1.8;
        float twinkle = 0.75 + 0.25 * sin(u_time * twinkleSpeed + twinklePhase);
        starBrightness *= twinkle;
      }

      vec3 starColor = vec3(1.0, 1.0, 0.9) * starBrightness;
      bgColor += starColor * 1.15;

      vec3 finalColor = mix(bgColor, retroColor, gridMask * 0.8);

      fragColor = vec4(finalColor, 1.0);
    } else {
      float t = iterations / maxIterations;

      float hue = t * 1.2 + sin(u_time * 0.05) * 0.15;
      float saturation = 0.6 + t * 0.3;
      float brightness = 0.75 + t * 0.2;

      vec3 color = hsv2rgb(vec3(hue, saturation, brightness));
      fragColor = vec4(color, 0.8);
    }
  }
`

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }

  return program
}

export const useWebGL = () => {
  const initializeWebGL = useCallback((gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    
    if (!vertexShader || !fragmentShader) {
      console.error('Failed to create shaders')
      return () => {}
    }

    const program = createProgram(gl, vertexShader, fragmentShader)
    if (!program) {
      console.error('Failed to create program')
      return () => {}
    }

    // Set up fullscreen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ])

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    // Get uniform locations
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const juliaCLocation = gl.getUniformLocation(program, 'u_juliaC')
    const timeLocation = gl.getUniformLocation(program, 'u_time')

    // Mouse tracking with default interesting values
    let mouseX = -0.4
    let mouseY = 0.6

    const handleMouseMove = (e: MouseEvent) => {
      const normalizedX = e.clientX / window.innerWidth
      const normalizedY = -((e.clientY / window.innerHeight) * 2.0 - 1.0)

      const scaledX = normalizedX * 0.75
      const scaledY = normalizedY * 0.75

      const angle = Math.atan2(scaledY, scaledX)
      const radius = Math.sqrt(scaledX * scaledX + scaledY * scaledY)
      const biasedRadius = Math.min(radius * 0.8 + 0.2, 0.7)

      mouseX = Math.cos(angle) * biasedRadius
      mouseY = Math.sin(angle) * biasedRadius
    }

    document.addEventListener('mousemove', handleMouseMove)

    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()

    // Animation loop
    let animationId: number
    const render = (time: number) => {
      gl.useProgram(program)
      gl.bindVertexArray(vao)

      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.uniform2f(juliaCLocation, mouseX, mouseY)
      gl.uniform1f(timeLocation, time * 0.001)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animationId = requestAnimationFrame(render)
    }

    animationId = requestAnimationFrame(render)

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', resizeCanvas)
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      gl.deleteBuffer(positionBuffer)
      gl.deleteVertexArray(vao)
    }
  }, [])

  return { initializeWebGL }
}