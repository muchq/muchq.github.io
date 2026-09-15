import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useThoughtsGame } from '../useThoughtsGame'
import { fakeGl } from '@/test/fakeGl'
import { ROOM_HOTKEY } from '@/utils/roomHotkey'
import type { HubWorldLink } from '@/utils/hubWorldLink'
import type { WorldLink } from '@/utils/worldSync'

// The renderer's wiring over a fake context: what one frame does, what a
// room switch changes, and what cleanup lets go of. The units under it
// have their own tests; this is the glue nothing else drives.

const worldLink = (): WorldLink => ({
  isConnected: false,
  sendPositionUpdate: vi.fn(),
  sendShapeUpdate: vi.fn(),
  sendLeave: vi.fn(),
  disconnect: vi.fn(),
  reconnect: vi.fn(),
})
// A link that hands the renderer an offline world, so nothing dials out.
const offlineLink = () => ({ attach: () => worldLink() }) as unknown as HubWorldLink

const press = (key: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))

describe('useThoughtsGame', () => {
  let gl: ReturnType<typeof fakeGl>
  let frames: FrameRequestCallback[]
  let canvas: HTMLCanvasElement
  let cleanup: (() => void) | null

  const frame = (t = 16) => {
    const cb = frames.shift()
    if (!cb) throw new Error('no frame scheduled')
    cb(t)
  }
  const start = (opts: Parameters<typeof fakeGl>[0] = {}) => {
    gl = fakeGl(opts)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => gl as never)
    const { result } = renderHook(() => useThoughtsGame())
    cleanup = result.current.initializeGame(canvas, undefined, undefined, undefined, offlineLink())
  }
  const quadVao = () => gl.createVertexArray.mock.results[0].value
  const lastQuadDraw = () => {
    const draws = gl.drawArrays.mock.calls
    for (let i = draws.length - 1; i >= 0; i--) if (draws[i][0] === gl.TRIANGLE_STRIP) return gl.drawArrays.mock.invocationCallOrder[i]
    return -1
  }
  const lastQuadBind = () => {
    const binds = gl.bindVertexArray.mock.calls
    let order = -1
    binds.forEach((call, i) => { if (call[0] === quadVao()) order = gl.bindVertexArray.mock.invocationCallOrder[i] })
    return order
  }

  beforeEach(() => {
    frames = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.push(cb); return frames.length })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    canvas = document.createElement('canvas')
    document.body.appendChild(canvas)
    cleanup = null
  })
  afterEach(() => {
    cleanup?.()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('draws the grid on the first frame with the sky allowed at the far end of depth', () => {
    start()
    frame()
    expect(gl.depthFunc).toHaveBeenCalledWith(gl.LEQUAL)
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLE_STRIP, 0, 4)
    // The grid hangs nothing outside, so no line strip is drawn.
    expect(gl.drawArrays).toHaveBeenCalledTimes(1)
  })

  it('switches rooms on the hotkey and rebinds the quad before drawing it', () => {
    start()
    frame()
    press(ROOM_HOTKEY)
    frame(32)
    // The glasshouse's program is a second one, and its attractors drew.
    expect(gl.linkProgram).toHaveBeenCalledTimes(1 + 1 + 1)
    expect(gl.drawArrays.mock.calls.filter(c => c[0] === gl.LINE_STRIP).length).toBeGreaterThan(0)
    // The line pass leaves its own arrays bound; the quad's must come back
    // before the next quad draw or the world goes black.
    frame(48)
    expect(lastQuadBind()).toBeGreaterThan(-1)
    expect(lastQuadBind()).toBeLessThan(lastQuadDraw())
    expect(lastQuadBind()).toBeGreaterThan(gl.bindVertexArray.mock.invocationCallOrder[0])
  })

  it('tilts the camera only once the room curves the world', () => {
    start()
    frame()
    const upCalls = () => gl.uniform3f.mock.calls.filter(c => c[0]?.uniform === 'u_cameraUp').map(c => c.slice(1))
    expect(upCalls().at(-1)).toEqual([0, 1, 0])
    press(ROOM_HOTKEY)
    frame(32)
    expect(upCalls().at(-1)).toEqual([0, 1, 0])
    press(ROOM_HOTKEY)
    frame(48)
    const [x, y, z] = upCalls().at(-1)!
    expect(Math.hypot(x, y, z)).toBeCloseTo(1)
    expect([x, y, z]).not.toEqual([0, 1, 0])
  })

  it('steps past the glasshouse when it will not build, and never tries it again', () => {
    start({ compiles: src => !src.includes('fresnel') })
    frame()
    const grid = gl.useProgram.mock.calls[0][0]
    press(ROOM_HOTKEY)
    frame(32)
    // The vertex shader, the grid, one try at the glasshouse, the sphere.
    expect(gl.compileShader).toHaveBeenCalledTimes(1 + 1 + 1 + 1)
    expect(gl.useProgram).not.toHaveBeenLastCalledWith(grid)
    press(ROOM_HOTKEY)
    frame(48)
    expect(gl.useProgram).toHaveBeenLastCalledWith(grid)
    expect(gl.compileShader).toHaveBeenCalledTimes(4)
  })

  it('stops listening for the hotkey and frees the rooms on cleanup', () => {
    start()
    frame()
    cleanup!()
    cleanup = null
    const compiles = gl.compileShader.mock.calls.length
    press(ROOM_HOTKEY)
    expect(gl.compileShader).toHaveBeenCalledTimes(compiles)
    expect(gl.deleteProgram).toHaveBeenCalled()
  })
})
