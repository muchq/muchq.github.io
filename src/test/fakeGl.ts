import { vi } from 'vitest'

// The slice of WebGL2 the world renderer touches, recording calls. jsdom
// has no WebGL, so this is how the GL-side plumbing (program cache,
// attractor buffers) is driven in tests; the shaders themselves are only
// checked as strings here and compiled for real in a browser.
export const fakeGl = (
  opts: { compiles?: boolean | ((source: string) => boolean); links?: boolean; handles?: boolean } = {}
) => {
  const compiles = opts.compiles ?? true
  const links = opts.links ?? true
  // handles: false makes every create* return null, as a lost context does.
  const handles = opts.handles ?? true
  let nextId = 1
  const handle = () => (handles ? { id: nextId++ } : null)
  // Source per shader handle, so a predicate can fail one shader and not another.
  const sources = new Map<unknown, string>()
  const gl = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    DYNAMIC_DRAW: 0x88e8,
    LEQUAL: 0x0203,
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x0100,
    FLOAT: 0x1406,
    LINE_STRIP: 0x0003,
    TRIANGLE_STRIP: 0x0005,
    BLEND: 0x0be2,
    DEPTH_TEST: 0x0b71,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    createShader: vi.fn(() => handle()),
    shaderSource: vi.fn((shader: unknown, source: string) => void sources.set(shader, source)),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn((shader: unknown) =>
      typeof compiles === 'function' ? compiles(sources.get(shader) ?? '') : compiles
    ),
    getShaderInfoLog: vi.fn(() => 'fake compile log'),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => handle()),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => links),
    getProgramInfoLog: vi.fn(() => 'fake link log'),
    deleteProgram: vi.fn(),
    getUniformLocation: vi.fn((_p: unknown, name: string) => ({ uniform: name })),
    createBuffer: vi.fn(() => handle()),
    deleteBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    createVertexArray: vi.fn(() => handle()),
    deleteVertexArray: vi.fn(),
    bindVertexArray: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttrib1f: vi.fn(),
    useProgram: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    uniform4f: vi.fn(),
    uniform3fv: vi.fn(),
    uniform1iv: vi.fn(),
    drawArrays: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    depthMask: vi.fn(),
    depthFunc: vi.fn(),
    viewport: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
  }
  return gl as unknown as WebGL2RenderingContext & typeof gl
}
