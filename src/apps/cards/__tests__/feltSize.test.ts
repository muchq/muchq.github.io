import { describe, expect, it } from 'vitest'
import { FELT_MAX_WIDTH_PX, FELT_MIN_PX, FELT_OVERLAY_CHROME_PX, feltSizePx } from '../feltSize'

// #447: a width-sized square on a tall desktop scrolled the scoreboard
// off; the felt must be min(width, remaining height). felt.module.css
// applies the same policy with ringSlot + cqw/cqh (jsdom cannot lay that out).

describe('feltSizePx', () => {
  it('shrinks below the width cap when the scoreboard leaves less height', () => {
    // 1700×1300 with ~400px of header + scoreboard: width alone is 832.
    const size = feltSizePx(1700, 1300, 400)
    expect(size).toBeLessThan(FELT_MAX_WIDTH_PX)
    expect(size).toBe(1300 - FELT_OVERLAY_CHROME_PX - 400)
  })

  it('uses the width cap when height left is generous', () => {
    expect(feltSizePx(1700, 1300, 100)).toBe(FELT_MAX_WIDTH_PX)
  })

  it('on 1440×900 keeps header, felt and scoreboard in the overlay', () => {
    const chrome = 200
    const size = feltSizePx(1440, 900, chrome)
    expect(size + chrome).toBeLessThanOrEqual(900 - FELT_OVERLAY_CHROME_PX)
    expect(size).toBeGreaterThanOrEqual(FELT_MIN_PX)
  })

  it('never drops below the readable minimum', () => {
    expect(feltSizePx(400, 400, 200)).toBe(FELT_MIN_PX)
  })
})
