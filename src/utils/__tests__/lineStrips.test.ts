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
const vp = viewProjection([0, 3, 10], [0, 0, 0], 1.5)
// A ribbon of `points` places: two vertices each, x, y, z, index, edge.
const wake = (points: number) => ({
  data: new Float32Array(points * 2 * 5).map((_, i) => (i % 5 === 3 ? Math.floor(i / 10) : i % 5 === 4 ? (i % 10 < 5 ? -1 : 1) : i)),
  vertices: points * 2,
  points,
  color: [1, 0.5, 0.2] as [number, number, number],
})

describe('LineStrips', () => {
  it('uploads one trajectory per attractor, once', () => {
    const gl = fakeGl()
    const lines = LineStrips.create(gl, specs)!
    expect(gl.bufferData).toHaveBeenCalledTimes(specs.length)
    lines.draw(vp, 1.0, [0.5, 0.8, 1, 0.2])
    lines.draw(vp, 2.0, [0.5, 0.8, 1, 0.2])
    expect(gl.bufferData).toHaveBeenCalledTimes(specs.length)
  })

  it('draws every attractor as a line strip of its own point count', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)!.draw(vp, 0, [0, 0, 0, 0])
    expect(gl.drawArrays).toHaveBeenCalledTimes(specs.length)
    specs.forEach((s, i) => expect(gl.drawArrays).toHaveBeenNthCalledWith(i + 1, gl.LINE_STRIP, 0, s.points))
  })

  it('uploads a wake every frame and runs its glow from the newest point', () => {
    const gl = fakeGl()
    const lines = LineStrips.create(gl, [])!
    lines.draw(vp, 0, [0, 0, 0, 0], [wake(5), wake(3)])
    expect(gl.bufferData).toHaveBeenCalledTimes(2)
    expect(gl.bufferData).toHaveBeenNthCalledWith(1, gl.ARRAY_BUFFER, expect.any(Float32Array), gl.DYNAMIC_DRAW)
    // A ribbon, two vertices per place, glowing from the newest place.
    expect(gl.drawArrays).toHaveBeenNthCalledWith(1, gl.TRIANGLE_STRIP, 0, 10)
    expect(gl.drawArrays).toHaveBeenNthCalledWith(2, gl.TRIANGLE_STRIP, 0, 6)
    expect(gl.uniform1f).toHaveBeenCalledWith({ uniform: 'u_head' }, 4)
    expect(gl.uniform1f).toHaveBeenCalledWith({ uniform: 'u_count' }, 5)
    expect(gl.uniform1f).toHaveBeenCalledWith({ uniform: 'u_head' }, 2)
    lines.draw(vp, 1, [0, 0, 0, 0], [wake(5)])
    expect(gl.bufferData).toHaveBeenCalledTimes(3)
  })

  it('blends over the world without writing depth, and restores depth writes after', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)!.draw(vp, 0, [0, 0, 0, 0])
    expect(gl.enable).toHaveBeenCalledWith(gl.BLEND)
    expect(gl.depthMask).toHaveBeenNthCalledWith(1, false)
    expect(gl.depthMask).toHaveBeenLastCalledWith(true)
    expect(gl.disable).toHaveBeenCalledWith(gl.BLEND)
  })

  it('draws nothing, and touches nothing, when there is nothing to draw', () => {
    const gl = fakeGl()
    LineStrips.create(gl, [])!.draw(vp, 0, [0, 0, 0, 0], [])
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
    LineStrips.create(gl, specs)!.draw(vp, 0, [0, 0, 0, 0], [wake(4)])
    expect(gl.blendFunc).toHaveBeenNthCalledWith(1, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    expect(gl.blendFunc).toHaveBeenLastCalledWith(gl.SRC_ALPHA, gl.ONE)
  })

  it('keeps the glass off the wake, which is in the room with you', () => {
    const gl = fakeGl()
    LineStrips.create(gl, specs)!.draw(vp, 0, [0.5, 0.8, 1, 0.35], [wake(4)])
    const tints = gl.uniform4f.mock.calls.filter(call => call[0]?.uniform === 'u_glass')
    expect(tints[0].slice(1)).toEqual([0.5, 0.8, 1, 0.35])
    expect(tints.at(-1)!.slice(1)).toEqual([0, 0, 0, 0])
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
  })
})
