import { describe, it, expect } from 'vitest'
import { AttractorRenderer } from '../attractorRenderer'
import { attractorsOutside } from '../attractors'
import { viewProjection } from '../projection'
import { fakeGl } from '@/test/fakeGl'

// The attractor pass: one buffer per attractor, uploaded once; every
// frame draws each as a line strip, blended, depth-tested but never
// writing depth, so the ray-traced floor and players occlude it and it
// occludes nothing.

describe('AttractorRenderer', () => {
  const specs = attractorsOutside(50)

  it('uploads one trajectory per attractor, once', () => {
    const gl = fakeGl()
    const renderer = AttractorRenderer.create(gl, specs)!
    expect(gl.bufferData).toHaveBeenCalledTimes(specs.length)
    const vp = viewProjection([0, 3, 10], [0, 0, 0], 1.5)
    renderer.draw(vp, 1.0, [0.5, 0.8, 1, 0.2])
    renderer.draw(vp, 2.0, [0.5, 0.8, 1, 0.2])
    expect(gl.bufferData).toHaveBeenCalledTimes(specs.length)
  })

  it('draws every attractor as a line strip of its own point count', () => {
    const gl = fakeGl()
    const renderer = AttractorRenderer.create(gl, specs)!
    renderer.draw(viewProjection([0, 3, 10], [0, 0, 0], 1.5), 0, [0, 0, 0, 0])
    expect(gl.drawArrays).toHaveBeenCalledTimes(specs.length)
    specs.forEach((s, i) => {
      expect(gl.drawArrays).toHaveBeenNthCalledWith(i + 1, gl.LINE_STRIP, 0, s.points)
    })
  })

  it('blends over the world without writing depth, and restores depth writes after', () => {
    const gl = fakeGl()
    const renderer = AttractorRenderer.create(gl, specs)!
    renderer.draw(viewProjection([0, 3, 10], [0, 0, 0], 1.5), 0, [0, 0, 0, 0])
    expect(gl.enable).toHaveBeenCalledWith(gl.BLEND)
    expect(gl.depthMask).toHaveBeenNthCalledWith(1, false)
    expect(gl.depthMask).toHaveBeenLastCalledWith(true)
    expect(gl.disable).toHaveBeenCalledWith(gl.BLEND)
  })

  it('is nothing when there is nothing to draw', () => {
    const gl = fakeGl()
    expect(AttractorRenderer.create(gl, [])).toBeNull()
    expect(gl.createProgram).not.toHaveBeenCalled()
  })

  it('is nothing when its shaders do not compile', () => {
    const gl = fakeGl({ compiles: false })
    expect(AttractorRenderer.create(gl, specs)).toBeNull()
  })
})
