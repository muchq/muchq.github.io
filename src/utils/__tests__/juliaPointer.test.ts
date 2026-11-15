import { describe, expect, it, vi } from 'vitest'
import { bindJuliaPointer, juliaCFromClient } from '../juliaPointer'

describe('juliaCFromClient', () => {
  it('preserves the previous desktop mapping goldens on a 1000×800 viewport', () => {
    const upperLeft = juliaCFromClient(0, 0, 1000, 800)
    expect(upperLeft.x).toBeCloseTo(0, 10)
    expect(upperLeft.y).toBeCloseTo(0.7, 10)

    const center = juliaCFromClient(500, 400, 1000, 800)
    expect(center.x).toBeCloseTo(0.5, 10)
    expect(center.y).toBeCloseTo(0, 10)

    const midLeft = juliaCFromClient(0, 400, 1000, 800)
    expect(midLeft.x).toBeCloseTo(0.2, 10)
    expect(midLeft.y).toBeCloseTo(0, 10)

    const lowerRight = juliaCFromClient(1000, 800, 1000, 800)
    expect(lowerRight.x).toBeCloseTo(0.4949747468305832, 10)
    expect(lowerRight.y).toBeCloseTo(-0.4949747468305832, 10)
  })

  it('survives a zero-size viewport without producing NaN', () => {
    const point = juliaCFromClient(0, 0, 0, 0)
    expect(Number.isFinite(point.x)).toBe(true)
    expect(Number.isFinite(point.y)).toBe(true)
    expect(Math.hypot(point.x, point.y)).toBeLessThanOrEqual(0.7)
  })
})

describe('bindJuliaPointer', () => {
  it('updates from pointermove the same way desktop hover always has', () => {
    const onMove = vi.fn()
    const target = new EventTarget()
    const stop = bindJuliaPointer(onMove, target)

    target.dispatchEvent(new PointerEvent('pointermove', { clientX: 250, clientY: 100 }))
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove).toHaveBeenCalledWith(juliaCFromClient(250, 100, window.innerWidth, window.innerHeight))

    stop()
  })

  it('updates continuously from pointermove while a finger drags', () => {
    const onMove = vi.fn()
    const target = new EventTarget()
    const stop = bindJuliaPointer(onMove, target)

    target.dispatchEvent(new PointerEvent('pointermove', { clientX: 120, clientY: 220, pointerType: 'touch' }))
    target.dispatchEvent(new PointerEvent('pointermove', { clientX: 360, clientY: 480, pointerType: 'touch' }))

    expect(onMove).toHaveBeenCalledTimes(2)
    expect(onMove).toHaveBeenNthCalledWith(1, juliaCFromClient(120, 220, window.innerWidth, window.innerHeight))
    expect(onMove).toHaveBeenNthCalledWith(2, juliaCFromClient(360, 480, window.innerWidth, window.innerHeight))

    stop()
  })

  it('updates from the initial pointerdown as well as the drag', () => {
    const onMove = vi.fn()
    const target = new EventTarget()
    const stop = bindJuliaPointer(onMove, target)

    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 40, clientY: 60, pointerType: 'touch' }))
    expect(onMove).toHaveBeenCalledWith(juliaCFromClient(40, 60, window.innerWidth, window.innerHeight))

    stop()
  })

  it('stops listening after cleanup', () => {
    const onMove = vi.fn()
    const target = new EventTarget()
    const stop = bindJuliaPointer(onMove, target)

    stop()
    target.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }))
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 10 }))
    expect(onMove).not.toHaveBeenCalled()
  })
})
