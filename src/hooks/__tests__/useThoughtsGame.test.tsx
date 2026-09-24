import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useThoughtsGame } from '../useThoughtsGame'
import { fakeGl } from '@/test/fakeGl'
import { COMMAND_HOTKEY, MUSIC_HOTKEY, ROOM_HOTKEY } from '@/utils/hotkeys'
import { CommandRegistry } from '@/utils/commandRegistry'
import { tripleTap } from '@/test/touch'

import { GAME_CONFIG, GameState, Player } from '@/utils/gameClasses'
import { splat } from '@/test/fakeTape'
import { BREAK_SOUND, CALM_SOUND, CHIPTUNE_SOUND, TECHNO_SOUND, type SoundProfile } from '@/utils/audioSystem'
import { GLASSHOUSE_GEOMETRY, PLANE_GEOMETRY, SPHERE_RADIUS, sphereGeometry } from '@/utils/surface'
import { paletteCss, roomById } from '@/utils/roomGeometry'
import type { HubWorldLink } from '@/utils/hubWorldLink'
import type { WorldLink } from '@/utils/worldSync'

const setProfile = vi.fn()
const cutToProfile = vi.fn()
vi.mock('@/utils/audioSystem', async importOriginal => {
  const real = await importOriginal<typeof import('@/utils/audioSystem')>()
  class AudioSystem extends real.AudioSystem {
    setProfile(profile: SoundProfile) {
      setProfile(profile)
      super.setProfile(profile)
    }
    cutToProfile(profile: SoundProfile) {
      cutToProfile(profile)
      super.cutToProfile(profile)
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
  sendSetGeometry: vi.fn(),
  sendLeave: vi.fn(),
  disconnect: vi.fn(),
})
// A link that hands the renderer an offline world,
// and keeps the GameState it was handed: the tape on the glass lives
// there, and only the renderer's own world has one.
let attached: GameState | null = null
const offlineLink = () =>
  ({
    attach: (gameState: GameState) => {
      attached = gameState
      return worldLink()
    },
  }) as unknown as HubWorldLink

const press = (key: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))

describe('useThoughtsGame', () => {
  let gl: ReturnType<typeof fakeGl>
  let frames: FrameRequestCallback[]
  let canvas: HTMLCanvasElement
  let cleanup: (() => void) | null
  let commands: CommandRegistry

  const frame = (t = 16) => {
    const cb = frames.shift()
    if (!cb) throw new Error('no frame scheduled')
    cb(t)
  }
  const start = (opts: Parameters<typeof fakeGl>[0] = {}) => {
    gl = fakeGl(opts)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => gl as never)
    const { result } = renderHook(() => useThoughtsGame())
    cleanup = result.current.initializeGame(canvas, offlineLink(), commands)
  }
  // The same, on a link the test keeps hold of: the hook hangs its
  // geometry callback on it, which is how the hub answers back.
  const startWith = (link: WorldLink) => {
    gl = fakeGl()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => gl as never)
    const { result } = renderHook(() => useThoughtsGame())
    cleanup = result.current.initializeGame(canvas, { attach: () => link } as unknown as HubWorldLink, commands)
  }
  const avatar = () =>
    (gl.uniform3fv.mock.calls.filter(c => c[0]?.uniform === 'u_objectCenters').at(-1)![1] as number[]).slice(0, 3)
  const apart = (a: number[], b: number[]) =>
    Math.acos(Math.min(1, dot(a, b) / (Math.hypot(...a) * Math.hypot(...b)))) * SPHERE_RADIUS

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
    attached = null
    commands = new CommandRegistry()
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

  // Undocumented like g: y walks the glasshouse's tunes and nowhere
  // else, and always hard-cuts rather than fading.
  it('cycles glasshouse music on y and ignores it in other rooms', () => {
    start()
    frame()
    cutToProfile.mockClear()
    press(MUSIC_HOTKEY)
    expect(cutToProfile).not.toHaveBeenCalled()
    press(ROOM_HOTKEY)
    frame(32)
    expect(setProfile).toHaveBeenLastCalledWith(TECHNO_SOUND)
    cutToProfile.mockClear()
    press(MUSIC_HOTKEY)
    expect(cutToProfile).toHaveBeenCalledTimes(1)
    expect(cutToProfile).toHaveBeenLastCalledWith(BREAK_SOUND)
    press(MUSIC_HOTKEY)
    expect(cutToProfile).toHaveBeenLastCalledWith(TECHNO_SOUND)
    press(ROOM_HOTKEY)
    frame(48)
    cutToProfile.mockClear()
    press(MUSIC_HOTKEY)
    expect(cutToProfile).not.toHaveBeenCalled()
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

  it('stands the sphere camera on the wall behind the avatar, aimed inward and lifted', () => {
    start()
    frame()
    press(ROOM_HOTKEY)
    frame(32)
    expect(vec('u_cameraUp').at(-1)).toEqual([0, 1, 0])
    press(ROOM_HOTKEY)
    frame(48)
    const lift = 2.5
    const up = vec('u_cameraUp').at(-1)!
    const pos = vec('u_cameraPos').at(-1)!
    const target = vec('u_cameraTarget').at(-1)!
    // It stands its distance along the wall and rises 5 off it, so it is
    // never behind the floor whatever part of the sphere it stands on.
    expect(Math.hypot(...pos)).toBeCloseTo(SPHERE_RADIUS - 5, 6)
    expect(Math.hypot(...up)).toBeCloseTo(1, 9)
    expect(dot(up, pos)).toBeLessThan(0)
    expect(Math.hypot(...target)).toBeCloseTo(SPHERE_RADIUS - (zenithHeight + lift), 6)
    // Behind, not on top of: the camera is a walk away from the avatar.
    const centres = gl.uniform3fv.mock.calls.filter(c => c[0]?.uniform === 'u_objectCenters').at(-1)![1] as number[]
    const angle = Math.acos(dot(pos, centres.slice(0, 3)) / (Math.hypot(...pos) * Math.hypot(...centres.slice(0, 3))))
    expect(angle).toBeCloseTo(7 / SPHERE_RADIUS, 2)
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
    expect(Math.hypot(...centre)).toBeCloseTo(SPHERE_RADIUS - height, 3)
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

  // The sphere is somewhere to walk, not a patch: a step is the same
  // arc wherever you take it, and there is no edge to stop at — the
  // avatar keeps going well past where the plane's ±50 wall stood.
  it('walks the sphere with nothing to stop it', () => {
    start()
    frame()
    press(ROOM_HOTKEY)
    press(ROOM_HOTKEY)
    frame(48)
    const from = avatar()
    press('w')
    for (let i = 0; i < 300; i++) frame(64 + i)
    const to = avatar()
    expect(apart(from, to)).toBeCloseTo(300 * GAME_CONFIG.moveSpeed, 0)
    expect(apart(from, to)).toBeGreaterThan(GAME_CONFIG.worldBoundary)
    // Still standing on the wall, bobbing the height it always bobs.
    expect(Math.hypot(...to)).toBeGreaterThan(SPHERE_RADIUS - 3)
    expect(Math.hypot(...to)).toBeLessThan(SPHERE_RADIUS)
  })

  it('still stops at the edge of the plane', () => {
    start()
    frame()
    const from = avatar()
    expect(from[0]).toBeCloseTo(0, 6)
    press('d')
    for (let i = 0; i < 400; i++) frame(32 + i)
    expect(avatar()[0]).toBeCloseTo(GAME_CONFIG.worldBoundary, 6)
  })

  // The room's shape belongs to the room: the key asks the hub, and the
  // world changes when the hub says so, for everyone at once. The
  // glasshouse is one of those shapes — the hub polls deja for a room
  // standing in one, so a private glasshouse would be a wall that never
  // fills.
  it('asks the hub for the glasshouse and for the sphere, and redraws when it answers', () => {
    const link = { ...worldLink(), isConnected: true }
    startWith(link)
    frame()
    setProfile.mockClear()
    const strips = () => gl.drawArrays.mock.calls.filter(c => c[0] === gl.LINE_STRIP).length
    press(ROOM_HOTKEY)
    expect(link.sendSetGeometry).toHaveBeenLastCalledWith(GLASSHOUSE_GEOMETRY)
    // Not yet: the hub decides, and the answer reaches everyone in it.
    frame(32)
    expect(setProfile).not.toHaveBeenLastCalledWith(TECHNO_SOUND)
    expect(strips()).toBe(0)
    link.onGeometryChange!(GLASSHOUSE_GEOMETRY)
    frame(48)
    expect(setProfile).toHaveBeenLastCalledWith(TECHNO_SOUND)
    // Drawn now: the glasshouse hangs its attractors.
    expect(strips()).toBeGreaterThan(0)
    press(ROOM_HOTKEY)
    expect(link.sendSetGeometry).toHaveBeenLastCalledWith(sphereGeometry(SPHERE_RADIUS))
    expect(setProfile).not.toHaveBeenLastCalledWith(CHIPTUNE_SOUND)
    link.onGeometryChange!(sphereGeometry(SPHERE_RADIUS))
    expect(setProfile).toHaveBeenLastCalledWith(CHIPTUNE_SOUND)
  })

  // A glasshouse that compared equal to the plane would be dropped here,
  // and the one room with anything on its walls would never be drawn.
  it('follows a stranger into the glasshouse, and back out to the plane', () => {
    const link = { ...worldLink(), isConnected: true }
    startWith(link)
    frame()
    link.onGeometryChange!(GLASSHOUSE_GEOMETRY)
    expect(setProfile).toHaveBeenLastCalledWith(TECHNO_SOUND)
    frame(32)
    expect(link.sendSetGeometry).not.toHaveBeenCalled()
    // And out again: the plane is the grid, not the glasshouse it was.
    link.onGeometryChange!(PLANE_GEOMETRY)
    expect(setProfile).toHaveBeenLastCalledWith(CALM_SOUND)
  })

  it('follows a reshape this client never asked for, and rounds the map for a globe', () => {
    const map = document.createElement('div')
    map.id = 'mini-map'
    document.body.appendChild(map)
    const link = { ...worldLink(), isConnected: true }
    startWith(link)
    frame()
    link.onGeometryChange!(sphereGeometry(SPHERE_RADIUS))
    expect(setProfile).toHaveBeenLastCalledWith(CHIPTUNE_SOUND)
    expect(map.dataset.map).toBe('globe')
    frame(32)
    expect(Math.hypot(...avatar())).toBeGreaterThan(SPHERE_RADIUS - 3)
    link.onGeometryChange!(PLANE_GEOMETRY)
    expect(setProfile).toHaveBeenLastCalledWith(CALM_SOUND)
    expect(map.dataset.map).toBe('square')
    expect(link.sendSetGeometry).not.toHaveBeenCalled()
    map.remove()
  })

  // A room is a look, not a size: the hub takes any radius from 2 to
  // 1000, and whatever it names is the world the client stands on and
  // draws — drawing a plane instead would have every move refused.
  it('stands on a sphere no room was written for, and draws it at that size', () => {
    const link = { ...worldLink(), isConnected: true }
    startWith(link)
    frame()
    link.onGeometryChange!(sphereGeometry(7))
    frame(32)
    expect(setProfile).toHaveBeenLastCalledWith(CHIPTUNE_SOUND)
    const radius = gl.uniform1f.mock.calls.filter(c => c[0]?.uniform === 'u_surfaceRadius').at(-1)![1]
    expect(radius).toBe(7)
    const height = new Player('p').getBouncingY(32) - GAME_CONFIG.groundLevel
    expect(Math.hypot(...avatar())).toBeCloseTo(7 - height, 3)
    // And the plane says so too, rather than leaving the last radius up.
    link.onGeometryChange!(PLANE_GEOMETRY)
    frame(48)
    expect(gl.uniform1f.mock.calls.filter(c => c[0]?.uniform === 'u_surfaceRadius').at(-1)![1]).toBe(0)
  })

  // The world's commands, as the menu lists them.
  const labels = () => commands.list().map(c => c.label)
  const runCommand = (label: string) => {
    const command = commands.list().find(c => c.label === label)
    if (!command) throw new Error(`no command ${label} in ${labels().join(', ')}`)
    command.run()
  }

  it('offers the shapes the avatar is not wearing, and wearing one tells the hub', () => {
    const link = { ...worldLink(), isConnected: true }
    startWith(link)
    expect(labels().filter(l => l.startsWith('Avatar'))).toEqual(['Avatar: Cube', 'Avatar: Pyramid'])
    runCommand('Avatar: Pyramid')
    expect(link.sendShapeUpdate).toHaveBeenLastCalledWith(2)
    expect(labels().filter(l => l.startsWith('Avatar'))).toEqual(['Avatar: Sphere', 'Avatar: Cube'])
  })

  // Space opens the command menu now; the shape is one of its entries.
  it('space no longer changes the shape', () => {
    const link = { ...worldLink(), isConnected: true }
    startWith(link)
    press(COMMAND_HOTKEY)
    expect(link.sendShapeUpdate).not.toHaveBeenCalled()
    expect(labels()).toContain('Avatar: Cube')
  })

  it('offers the other rooms by name, says the room changes for everyone, and asks the hub', () => {
    const link = { ...worldLink(), isConnected: true }
    startWith(link)
    frame()
    const rooms = commands.list().filter(c => c.label.startsWith('Room'))
    expect(rooms.map(c => c.label)).toEqual(['Room: Glasshouse', 'Room: Sphere'])
    expect(rooms.every(c => c.detail === 'Changes the room for everyone in it')).toBe(true)
    runCommand('Room: Sphere')
    expect(link.sendSetGeometry).toHaveBeenLastCalledWith(sphereGeometry(SPHERE_RADIUS))
    // The hub decides; until it answers this is still the grid.
    expect(labels()).toContain('Room: Sphere')
    link.onGeometryChange!(sphereGeometry(SPHERE_RADIUS))
    expect(labels().filter(l => l.startsWith('Room'))).toEqual(['Room: Grid', 'Room: Glasshouse'])
  })

  it('off the wire, a room from the menu is drawn at once', () => {
    start()
    frame()
    runCommand('Room: Glasshouse')
    expect(setProfile).toHaveBeenLastCalledWith(TECHNO_SOUND)
    expect(labels().filter(l => l.startsWith('Room'))).toEqual(['Room: Grid', 'Room: Sphere'])
  })

  it('names the tunes a room is not playing, and offers none in a room with one', () => {
    start()
    frame()
    expect(labels().filter(l => l.startsWith('Music'))).toEqual([])
    press(ROOM_HOTKEY)
    expect(labels().filter(l => l.startsWith('Music'))).toEqual(['Music: Break'])
    runCommand('Music: Break')
    expect(cutToProfile).toHaveBeenLastCalledWith(BREAK_SOUND)
    expect(labels().filter(l => l.startsWith('Music'))).toEqual(['Music: Techno'])
    // The y key and the menu walk the same tunes.
    press(MUSIC_HOTKEY)
    expect(labels().filter(l => l.startsWith('Music'))).toEqual(['Music: Break'])
    press(ROOM_HOTKEY)
    expect(labels().filter(l => l.startsWith('Music'))).toEqual([])
  })

  it('offers the sound, the way it will flip', () => {
    start()
    expect(labels()).toContain('Turn sound on')
    runCommand('Turn sound on')
    expect(labels()).toContain('Turn sound off')
    expect(labels()).not.toContain('Turn sound on')
  })

  it('without WebGL, lets go of everything it set up', () => {
    const toggle = document.createElement('button')
    toggle.id = 'sound-toggle'
    document.body.appendChild(toggle)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
    const link = worldLink()
    const { result } = renderHook(() => useThoughtsGame())
    const stop = result.current.initializeGame(canvas, { attach: () => link } as unknown as HubWorldLink, commands)
    toggle.click()
    expect(labels()).toContain('Turn sound off')
    stop()
    expect(labels()).toEqual([])
    toggle.click()
    expect(labels()).toEqual([])
    expect(link.disconnect).toHaveBeenCalled()
  })

  // The phone's triple-tap is the command menu's now, the page's to bind.
  it('a triple-tap on the world does not change the room', () => {
    vi.useFakeTimers()
    try {
      start()
      frame()
      tripleTap(canvas.parentElement!)
      expect(labels().filter(l => l.startsWith('Room'))).toEqual(['Room: Glasshouse', 'Room: Sphere'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('withdraws its commands on cleanup', () => {
    start()
    frame()
    expect(labels().length).toBeGreaterThan(0)
    cleanup!()
    cleanup = null
    expect(labels()).toEqual([])
  })

  // The command menu takes focus while a key may be held: the release
  // lands in its filter, and must still stop the avatar.
  it('a key let go in a text field still stops the avatar', () => {
    start()
    frame()
    const from = avatar()
    press('d')
    frame(32)
    const field = document.createElement('input')
    document.body.appendChild(field)
    field.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', bubbles: true }))
    const stopped = avatar()
    expect(stopped[0]).toBeGreaterThan(from[0])
    for (let i = 0; i < 10; i++) frame(48 + i)
    expect(avatar()[0]).toBeCloseTo(stopped[0], 6)
  })

  // Typing is not walking: a key pressed in a text field moves nothing.
  it('a key pressed in a text field does not walk', () => {
    start()
    frame()
    const from = avatar()
    const field = document.createElement('input')
    document.body.appendChild(field)
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }))
    for (let i = 0; i < 10; i++) frame(32 + i)
    expect(avatar()[0]).toBeCloseTo(from[0], 6)
  })

  // deja's tape lands on the glass and nowhere else: the glasshouse is
  // the only room with walls to splat against.
  it('splats the tape on the glasshouse glass, and draws none in a room without it', () => {
    const container = document.createElement('div')
    container.id = 'tape-wall-container'
    document.body.appendChild(container)
    start()
    frame()
    const now = Date.now() / 1000
    attached!.tape.seed([splat({ seq: 1, wall: 0, u: 0.5, v: 0.2, ts: now, actual: 'GET /splat' })])
    // The grid has no glass, whatever the ring holds.
    frame(32)
    expect(container.children).toHaveLength(0)
    press(ROOM_HOTKEY)
    frame(48)
    expect(container.children).toHaveLength(1)
    const element = container.children[0] as HTMLElement
    expect(element.textContent).toContain('GET /splat')
    // Just landed, so drawn at full strength: a ts read as milliseconds
    // would put this at the faintest the wall goes.
    expect(parseFloat(element.style.opacity)).toBeCloseTo(1, 2)
    // And the sphere takes it down again.
    press(ROOM_HOTKEY)
    frame(64)
    expect(container.children).toHaveLength(0)
    container.remove()
  })

  it('flies a live event in as a comet, and takes the whole wall down on cleanup', () => {
    const container = document.createElement('div')
    container.id = 'tape-wall-container'
    document.body.appendChild(container)
    start()
    frame()
    attached!.tape.add(splat({ seq: 1, wall: 0, u: 0.5, v: 0.2, ts: Date.now() / 1000 }))
    press(ROOM_HOTKEY)
    frame(32)
    // An event that landed while we were watching arrives out of deep
    // space; a seeded one, in the test above, is already on the glass.
    expect(container.querySelectorAll('.tape-splat')).toHaveLength(1)
    expect(container.querySelectorAll('[data-comet]').length).toBeGreaterThan(0)
    // The head burns in this room's own glass colour: the renderer hands
    // it to the wall with the geometry, so the DOM layer never reads the
    // room catalogue itself.
    const head = container.querySelector<HTMLElement>('[data-comet="head"]')!
    expect(head.style.background).toBe(paletteCss(roomById('glasshouse')!.palette.boundary))
    cleanup!()
    cleanup = null
    expect(container.children).toHaveLength(0)
    container.remove()
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
