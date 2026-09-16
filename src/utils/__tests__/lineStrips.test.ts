import { describe, it, expect } from 'vitest'
import { LineStrips } from '../lineStrips'
import { attractorsOutside } from '../attractors'
import { viewProjection } from '../projection'
import { fakeGl } from '@/test/fakeGl'

// The line pass: static strips (attractors) uploaded once, dynamic ones
// (avatar wakes) uploaded every frame, all blended over the ray-traced
// frame, depth-tested against it and writing no depth, so players
// occlude them and they occlude nothing.

const specs = attractorsOutside(50)
const eye: [number, number, number] = [0, 3, 10]
const vp = viewProjection(eye, [0, 0, 0], 1.5)
// A ribbon of `points` places: two vertices each, x, y, z, index, edge.
const wake = (points: number) => ({
  data: new Float32Array(points * 2 * 5).map((_, i) => (i % 5 === 3 ? Math.floor(i / 10) : i % 5 === 4 ? (i % 10 < 5 ? -1 : 1) : i)),
  vertices: points * 2,
  points,
  color: [1, 0.5, 0.2] as [number, number, number],
})

describe('LineStrips', () => {
  const uploads = (gl: ReturnType<typeof fakeGl>, usage: number) =>
    gl.bufferData.mock.calls.filter(call => call[2] === usage).length

  it('uploads one trajectory per attractor, once', () => {
    const gl = fakeGl()
    const lines = LineStrips.create(gl, specs)!
    expect(uploads(gl, gl.STATIC_DRAW)).toBe(specs.length)
    lines.draw(vp, eye, 1.0, [0.5, 0.8, 1, 0.2])
    lines.draw(vp, eye, 2.0, [0.5, 0.8, 1, 0.2])
    // The curve itself never moves in its own ball, so it is sent once
    // however many frames are drawn over it.
    expect(uploads(gl, gl.STATIC_DRAW)).toBe(specs.length)
  })

  it('draws every attractor as a line strip of its own point count', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)!.draw(vp, eye, 0, [0, 0, 0, 0])
    const wires = gl.drawArrays.mock.calls.filter(call => call[0] === gl.LINE_STRIP)
    expect(wires).toHaveLength(specs.length)
    specs.forEach((s, i) => expect(wires[i]).toEqual([gl.LINE_STRIP, 0, s.points]))
  })

  // The lit stretch of a curve is drawn again as a ribbon, so the head
  // reads as a comet rather than a bright pixel. It is rebuilt every
  // frame because it has to face the camera, and a curve that asks for
  // no comet keeps its bare wire.
  it('flies a comet along every curve that asks for one', () => {
    const gl = fakeGl()
    const lines = LineStrips.create(gl, specs)!
    lines.draw(vp, eye, 1.0, [0, 0, 0, 0])
    const wanted = specs.filter(s => s.style.comet > 0)
    expect(wanted.length).toBeGreaterThan(0)
    expect(wanted.length).toBeLessThan(specs.length)
    const ribbons = gl.drawArrays.mock.calls.filter(call => call[0] === gl.TRIANGLE_STRIP)
    expect(ribbons).toHaveLength(wanted.length)
    // Two vertices a point, and no longer than the lit stretch it covers.
    for (const [, , vertices] of ribbons) {
      expect(vertices % 2).toBe(0)
      expect(vertices).toBeGreaterThan(2)
    }
    expect(uploads(gl, gl.DYNAMIC_DRAW)).toBe(wanted.length)
    // It moves with the head: a later frame sends different points.
    const first = gl.bufferData.mock.calls.filter(c => c[2] === gl.DYNAMIC_DRAW).map(c => Array.from(c[1] as Float32Array))
    lines.draw(vp, eye, 2.0, [0, 0, 0, 0])
    const second = gl.bufferData.mock.calls.filter(c => c[2] === gl.DYNAMIC_DRAW).map(c => Array.from(c[1] as Float32Array)).slice(wanted.length)
    expect(second[0]).not.toEqual(first[0])
  })

  // The head comes round once a loop, and these curves are finite
  // samples of a chaotic system rather than closed loops: a comet that
  // ran off the start and round to the end would draw a ribbon clean
  // across the room between two unrelated places.
  it('never draws a comet across the gap between a curve\'s two ends', () => {
    const gl = fakeGl()
    const lines = LineStrips.create(gl, specs)!
    const spec = specs.find(s => s.style.comet > 0)!
    // Just after this curve's head has come round to the start again.
    const justWrapped = (spec.points + 8) / spec.speed
    for (const t of [justWrapped, justWrapped + 0.01, 1, 5]) {
      gl.bufferData.mockClear()
      lines.draw(vp, eye, t, [0, 0, 0, 0])
      for (const call of gl.bufferData.mock.calls.filter(c => c[2] === gl.DYNAMIC_DRAW)) {
        const data = call[1] as Float32Array
        let longest = 0
        // Two vertices a point; step point to point down one edge.
        for (let i = 10; i < data.length; i += 10) {
          longest = Math.max(longest, Math.hypot(data[i] - data[i - 10], data[i + 1] - data[i - 9], data[i + 2] - data[i - 8]))
        }
        expect(longest, `t=${t}`).toBeLessThan(spec.scale / 4)
      }
    }
  })

  it('draws a comet in the world, where the wire is drawn by its model', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)!.draw(vp, eye, 1.0, [0, 0, 0, 0])
    const models = gl.uniformMatrix4fv.mock.calls.filter(call => call[0]?.uniform === 'u_model')
    // Every wire has its own, then the ribbons share the identity one:
    // their points were already carried into the world to face the eye.
    expect(models).toHaveLength(specs.length + 1)
    expect(Array.from(models.at(-1)![2] as Float32Array)).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
    const spec = specs.find(s => s.style.comet > 0)!
    const sent = gl.bufferData.mock.calls.find(c => c[2] === gl.DYNAMIC_DRAW)![1] as Float32Array
    // Somewhere out by its own curve, not back at the origin.
    const distance = Math.hypot(sent[0] - spec.center[0], sent[1] - spec.center[1], sent[2] - spec.center[2])
    expect(distance).toBeLessThan(spec.scale * 1.2)
  })

  it('uploads a wake every frame and runs its glow from the newest point', () => {
    const gl = fakeGl()
    const lines = LineStrips.create(gl, [])!
    lines.draw(vp, eye, 0, [0, 0, 0, 0], [wake(5), wake(3)])
    expect(gl.bufferData).toHaveBeenCalledTimes(2)
    expect(gl.bufferData).toHaveBeenNthCalledWith(1, gl.ARRAY_BUFFER, expect.any(Float32Array), gl.DYNAMIC_DRAW)
    // A ribbon, two vertices per place, glowing from the newest place.
    expect(gl.drawArrays).toHaveBeenNthCalledWith(1, gl.TRIANGLE_STRIP, 0, 10)
    expect(gl.drawArrays).toHaveBeenNthCalledWith(2, gl.TRIANGLE_STRIP, 0, 6)
    expect(gl.uniform1f).toHaveBeenCalledWith({ uniform: 'u_head' }, 4)
    expect(gl.uniform1f).toHaveBeenCalledWith({ uniform: 'u_count' }, 5)
    expect(gl.uniform1f).toHaveBeenCalledWith({ uniform: 'u_head' }, 2)
    lines.draw(vp, eye, 1, [0, 0, 0, 0], [wake(5)])
    expect(gl.bufferData).toHaveBeenCalledTimes(3)
  })

  it('blends over the world without writing depth, and restores depth writes after', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)!.draw(vp, eye, 0, [0, 0, 0, 0])
    expect(gl.enable).toHaveBeenCalledWith(gl.BLEND)
    expect(gl.depthMask).toHaveBeenNthCalledWith(1, false)
    expect(gl.depthMask).toHaveBeenLastCalledWith(true)
    expect(gl.disable).toHaveBeenCalledWith(gl.BLEND)
  })

  it('draws nothing, and touches nothing, when there is nothing to draw', () => {
    const gl = fakeGl()
    LineStrips.create(gl, [])!.draw(vp, eye, 0, [0, 0, 0, 0], [])
    expect(gl.drawArrays).not.toHaveBeenCalled()
    expect(gl.useProgram).not.toHaveBeenCalled()
  })

  it('is nothing when its shaders do not compile or the context hands out no buffers', () => {
    expect(LineStrips.create(fakeGl({ compiles: false }), specs)).toBeNull()
    expect(LineStrips.create(fakeGl({ handles: false }), specs)).toBeNull()
  })

  it('frees its program, buffers and arrays on dispose', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)!.dispose()
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1)
    // One per attractor plus the wake's.
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(specs.length + 1)
    expect(gl.deleteVertexArray).toHaveBeenCalledTimes(specs.length + 1)
  })
  // A wake is light the avatar left behind: it adds to the room, so two
  // wakes crossing are brighter than one. The attractors are seen
  // through glass and blend over it as they always did.
  it('adds a wake to the frame and blends an attractor over it', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)!.draw(vp, eye, 0, [0, 0, 0, 0], [wake(4)])
    expect(gl.blendFunc).toHaveBeenNthCalledWith(1, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    expect(gl.blendFunc).toHaveBeenLastCalledWith(gl.SRC_ALPHA, gl.ONE)
  })

  // The texture is a uniform, so each curve carries its own: beads and
  // shimmer and how far its head reaches. A wake takes none of it.
  it('hands every attractor its own texture, and the wake a plain one', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)!.draw(vp, eye, 2, [0, 0, 0, 0], [wake(4)])
    const styles = gl.uniform4f.mock.calls.filter(call => call[0]?.uniform === 'u_style')
    // One per wire, then one per comet, then the wakes'.
    const wires = styles.slice(0, specs.length)
    specs.forEach((spec, i) => {
      expect(wires[i].slice(1)).toEqual([spec.style.bead, spec.style.tail, spec.style.twinkle, spec.style.core])
    })
    // A comet keeps its curve's beads and colour, but its glow spans the
    // whole ribbon, because the ribbon is only the lit part.
    const comets = styles.slice(specs.length, -1)
    expect(comets).toHaveLength(specs.filter(s => s.style.comet > 0).length)
    for (const comet of comets) expect(comet[2]).toBe(1)
    const wakeStyle = styles.at(-1)!.slice(1)
    expect(wakeStyle[0]).toBe(0)
    expect(wakeStyle[2]).toBe(0)
    // The shimmer needs the clock the frame is drawn at.
    expect(gl.uniform1f).toHaveBeenCalledWith({ uniform: 'u_time' }, 2)
  })

  // A wake is in the room with you and takes no tint; a comet is out
  // beyond the pane with the wire it runs along, so it wears the same
  // tint that wire does rather than punching through it.
  it('keeps the glass off the wake and on the comet', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)!.draw(vp, eye, 1, [0.5, 0.8, 1, 0.35], [wake(4)])
    const tints = gl.uniform4f.mock.calls.filter(call => call[0]?.uniform === 'u_glass')
    expect(tints[0].slice(1)).toEqual([0.5, 0.8, 1, 0.35])
    expect(tints.at(-1)!.slice(1)).toEqual([0, 0, 0, 0])
    // Only once it is done with the comets: every ribbon drawn before
    // the tint is cleared is one of theirs.
    const clearedAt = gl.uniform4f.mock.invocationCallOrder[gl.uniform4f.mock.calls.length - 1]
    const ribbons = gl.drawArrays.mock.calls
      .map((call, i) => ({ mode: call[0], at: gl.drawArrays.mock.invocationCallOrder[i] }))
      .filter(draw => draw.mode === gl.TRIANGLE_STRIP)
    const wanted = specs.filter(s => s.style.comet > 0).length
    expect(ribbons.filter(draw => draw.at < clearedAt)).toHaveLength(wanted)
    expect(ribbons.filter(draw => draw.at > clearedAt)).toHaveLength(1)
  })

  it('gives a ribbon a side to read its softness from, and a wire none', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)
    // Attribute 2 is the ribbon's edge: enabled on the one array that
    // carries it, and left at its default zero — dead centre — on the
    // attractors, where a wire has no sides.
    const enabled = gl.enableVertexAttribArray.mock.calls.map(call => call[0])
    expect(enabled.filter(location => location === 2)).toHaveLength(1)
    const ribbonStride = gl.vertexAttribPointer.mock.calls.filter(call => call[0] === 2)
    expect(ribbonStride).toHaveLength(1)
    expect(ribbonStride[0][4]).toBe(20)
    // After the three floats of position and the one of index.
    expect(ribbonStride[0][5]).toBe(16)
    // What a disabled attribute reads belongs to the context, not the
    // array, so the wires are told what side they are on every frame.
    LineStrips.create(gl, specs)!.draw(vp, eye, 0, [0, 0, 0, 0])
    expect(gl.vertexAttrib1f).toHaveBeenCalledWith(2, 0)
  })
})
