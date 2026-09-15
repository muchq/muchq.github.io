import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useThoughtsGame } from '../useThoughtsGame'
import { fakeGl } from '@/test/fakeGl'
import { ROOM_HOTKEY } from '@/utils/roomHotkey'
import { roomById } from '@/utils/roomGeometry'
import { GAME_CONFIG, Player } from '@/utils/gameClasses'
import { CALM_SOUND, CHIPTUNE_SOUND, type SoundProfile } from '@/utils/audioSystem'
import { SPHERE_ROOM } from '@/utils/sphereWorld'
import type { HubWorldLink } from '@/utils/hubWorldLink'
import type { WorldLink } from '@/utils/worldSync'

const setProfile = vi.fn()
vi.mock('@/utils/audioSystem', async importOriginal => {
  const real = await importOriginal<typeof import('@/utils/audioSystem')>()
  class AudioSystem extends real.AudioSystem {
    setProfile(profile: SoundProfile) {
      setProfile(profile)
      super.setProfile(profile)
    }
  }
  return { ...real, AudioSystem }
})

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
    // A deterministic spawn: the local player stands at the origin.
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
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

  // The camera stands 7 behind the avatar at angle 0, at height 5 above
  // the floor, aiming at the bounce zenith plus the room's lift; the
  // wiring puts every one of those through the room's world.
  const vec = (name: string) => gl.uniform3f.mock.calls.filter(c => c[0]?.uniform === name).map(c => c.slice(1) as [number, number, number])
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const zenithHeight = GAME_CONFIG.sphereRadius + GAME_CONFIG.bounceHeight / 2

  it('keeps the plane camera level and aimed at the avatar', () => {
    start()
    frame()
    expect(vec('u_cameraUp').at(-1)).toEqual([0, 1, 0])
    expect(vec('u_cameraTarget').at(-1)).toEqual([0, GAME_CONFIG.groundLevel + zenithHeight, 0])
    expect(vec('u_cameraPos').at(-1)).toEqual([0, 3, 7])
  })

  it('tilts the camera to the sphere room, lifted, from its own plane point', () => {
    start()
    frame()
    press(ROOM_HOTKEY)
    frame(32)
    expect(vec('u_cameraUp').at(-1)).toEqual([0, 1, 0])
    press(ROOM_HOTKEY)
    frame(48)
    const world = roomById('sphere')!.world
    const up = vec('u_cameraUp').at(-1)!
    const pos = vec('u_cameraPos').at(-1)!
    world.up(0, 7).forEach((v, i) => expect(up[i]).toBeCloseTo(v))
    world.place(0, 7, 5).forEach((v, i) => expect(pos[i]).toBeCloseTo(v))
    // Up points at the centre of the sphere.
    expect(dot(up, pos)).toBeLessThan(0)
    world.place(0, 0, zenithHeight + world.lookLift).forEach((v, i) => expect(vec('u_cameraTarget').at(-1)![i]).toBeCloseTo(v))
  })

  it('stands the avatar on the sphere wall, up toward the centre', () => {
    start()
    frame()
    press(ROOM_HOTKEY)
    press(ROOM_HOTKEY)
    frame(48)
    const centres = gl.uniform3fv.mock.calls.filter(c => c[0]?.uniform === 'u_objectCenters').at(-1)![1] as number[]
    const ups = gl.uniform3fv.mock.calls.filter(c => c[0]?.uniform === 'u_objectUps').at(-1)![1] as number[]
    const centre = centres.slice(0, 3)
    const up = ups.slice(0, 3)
    const height = new Player('p').getBouncingY(48) - GAME_CONFIG.groundLevel
    expect(Math.hypot(...centre)).toBeCloseTo(SPHERE_ROOM.radius - height, 3)
    expect(Math.hypot(...up)).toBeCloseTo(1)
    expect(dot(up, centre)).toBeLessThan(0)
  })

  it('stands the avatar upright on the grid', () => {
    start()
    frame()
    const ups = gl.uniform3fv.mock.calls.filter(c => c[0]?.uniform === 'u_objectUps').at(-1)![1] as number[]
    expect(ups.slice(0, 3)).toEqual([0, 1, 0])
  })

  it('scores each room as it is entered', () => {
    setProfile.mockClear()
    start()
    expect(setProfile).toHaveBeenLastCalledWith(CALM_SOUND)
    press(ROOM_HOTKEY)
    press(ROOM_HOTKEY)
    expect(setProfile).toHaveBeenLastCalledWith(CHIPTUNE_SOUND)
    press(ROOM_HOTKEY)
    expect(setProfile).toHaveBeenLastCalledWith(CALM_SOUND)
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
