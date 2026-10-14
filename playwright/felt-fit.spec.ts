import { expect, test } from '@playwright/test'

// Largest square in the overlay leftover: header, felt and scoreboard
// fit without scrolling on common desktops; the ring stays square.

const desktops = [
  { width: 1700, height: 1300 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
] as const

async function measure(page: import('@playwright/test').Page) {
  await page.goto('/playwright/felt-fit.html')
  await page.waitForSelector('[data-felt="ring"]')
  return page.evaluate(() => {
    const overlay = document.querySelector('[data-table-overlay]')
    const ring = document.querySelector('[data-felt="ring"]')
    if (!(overlay instanceof HTMLElement) || !(ring instanceof HTMLElement)) {
      throw new Error('felt harness missing overlay or ring')
    }
    const r = ring.getBoundingClientRect()
    return {
      scroll: overlay.scrollHeight - overlay.clientHeight,
      ring: [r.width, r.height] as [number, number],
      square: Math.abs(r.width - r.height) <= 1,
    }
  })
}

for (const { width, height } of desktops) {
  test(`felt fits square at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const m = await measure(page)
    expect(m.scroll, `overlay scrolled by ${m.scroll}px`).toBeLessThanOrEqual(1)
    expect(m.square, `ring ${m.ring[0]}×${m.ring[1]}`).toBe(true)
    expect(m.ring[0]).toBeGreaterThan(200)
  })
}

// Short landscape drops to an oval sized by the chair rows; it must
// still fit the overlay without scrolling.
test('felt fits short landscape without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 680 })
  const m = await measure(page)
  expect(m.scroll, `overlay scrolled by ${m.scroll}px`).toBeLessThanOrEqual(1)
  expect(m.ring[0]).toBeGreaterThan(200)
})
