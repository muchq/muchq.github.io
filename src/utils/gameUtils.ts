// import { ShapeType } from '@/types/game' // Commented out since not used in this simplified version

export function generateRandomColor(): [number, number, number] {
  const hue = Math.random() * 360
  const saturation = 0.7 + Math.random() * 0.3
  const lightness = 0.4 + Math.random() * 0.3

  const h = hue / 60
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = c * (1 - Math.abs((h % 2) - 1))
  const m = lightness - c / 2

  let r: number = 0, g: number = 0, b: number = 0
  if (h < 1) { r = c; g = x; b = 0; }
  else if (h < 2) { r = x; g = c; b = 0; }
  else if (h < 3) { r = 0; g = c; b = x; }
  else if (h < 4) { r = 0; g = x; b = c; }
  else if (h < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [r + m, g + m, b + m]
}

export function generateRandomSpawnPosition(worldBoundary: number): [number, number, number] {
  const margin = 5
  const safeZone = worldBoundary - margin

  const x = (Math.random() - 0.5) * 2 * safeZone
  const z = (Math.random() - 0.5) * 2 * safeZone
  const y = 0

  return [x, y, z]
}

export function generatePlayerId(): string {
  return 'player-' + Math.random().toString(36).substr(2, 9)
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
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

export function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
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