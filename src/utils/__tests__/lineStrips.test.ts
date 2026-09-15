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
const wake = (count: number) => ({
  data: new Float32Array(count * 4).map((_, i) => (i % 4 === 3 ? Math.floor(i / 4) : i)),
  count,
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
    expect(gl.drawArrays).toHaveBeenNthCalledWith(1, gl.LINE_STRIP, 0, 5)
    expect(gl.drawArrays).toHaveBeenNthCalledWith(2, gl.LINE_STRIP, 0, 3)
    expect(gl.uniform1f).toHaveBeenCalledWith({ uniform: 'u_head' }, 4)
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
})
