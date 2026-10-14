import { expect, test } from '@playwright/test'
import type { Fixture } from './felt-fit'

// Largest square in the overlay leftover for every felt table; chess
// under the same overlay stays centered and unscrollable.

const FELT_MIN_PX = 30 * 16

const desktops = [
  { width: 1700, height: 1300 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
] as const

const feltFixtures: Fixture[] = ['spades-2', 'spades-4', 'castle', 'rummy']

async function open(page: import('@playwright/test').Page, fixture: Fixture) {
  await page.goto(`/playwright/felt-fit.html?fixture=${fixture}`)
  await page.waitForSelector(`[data-table-overlay][data-fixture="${fixture}"]`)
}

async function overlayMetrics(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const overlay = document.querySelector('[data-table-overlay]')
    if (!(overlay instanceof HTMLElement)) throw new Error('overlay missing')
    const child = overlay.firstElementChild
    if (!(child instanceof HTMLElement)) throw new Error('table missing')
    const o = overlay.getBoundingClientRect()
    const t = child.getBoundingClientRect()
    const ring = document.querySelector('[data-felt="ring"]')
    const r = ring instanceof HTMLElement ? ring.getBoundingClientRect() : null
    return {
      scroll: overlay.scrollHeight - overlay.clientHeight,
      centered: Math.abs((t.left + t.right) / 2 - (o.left + o.right) / 2) <= 2,
      ring: r ? ([r.width, r.height] as [number, number]) : null,
      square: r ? Math.abs(r.width - r.height) <= 1 : null,
    }
  })
}

for (const fixture of feltFixtures) {
  for (const { width, height } of desktops) {
    test(`${fixture} fits square at ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await open(page, fixture)
      const m = await overlayMetrics(page)
      expect(m.scroll, `overlay scrolled by ${m.scroll}px`).toBeLessThanOrEqual(1)
      expect(m.centered, 'table not centered in overlay').toBe(true)
      expect(m.ring, 'ring missing').not.toBeNull()
      expect(m.square, `ring ${m.ring![0]}×${m.ring![1]}`).toBe(true)
      expect(m.ring![0]).toBeGreaterThanOrEqual(FELT_MIN_PX)
    })
  }

  test(`${fixture} fits short landscape without scrolling`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 680 })
    await open(page, fixture)
    const m = await overlayMetrics(page)
    expect(m.scroll, `overlay scrolled by ${m.scroll}px`).toBeLessThanOrEqual(1)
    expect(m.centered, 'table not centered in overlay').toBe(true)
    expect(m.ring, 'ring missing').not.toBeNull()
  })
}

test('chess fits and stays centered under the overlay', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page, 'chess')
  const m = await overlayMetrics(page)
  expect(m.scroll, `overlay scrolled by ${m.scroll}px`).toBeLessThanOrEqual(1)
  expect(m.centered, 'chess table not centered in overlay').toBe(true)
  expect(m.ring).toBeNull()
})
