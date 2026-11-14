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

for (const size of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 844, height: 390 }]) {
  test(`chess focus fits ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.goto('/playwright/felt-fit.html?fixture=chess&focus')
    const board = page.getByRole('group', { name: 'board' })
    await expect(board).toBeVisible()
    const box = await board.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(240)
    expect(Math.abs(box!.width - box!.height)).toBeLessThanOrEqual(1)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width)
    expect((await overlayMetrics(page)).scroll).toBeLessThanOrEqual(1)
  })
}

test('desktop right drag draws an arrow and right click toggles a square', async ({ page }) => {
  await open(page, 'chess')
  const from = await page.locator('[data-square="g6"]').boundingBox()
  const to = await page.locator('[data-square="f7"]').boundingBox()
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 5 })
  await page.mouse.up({ button: 'right' })
  await expect(page.getByTestId('annotation-arrow')).toHaveCount(1)
  await page.locator('[data-square="d4"]').click({ button: 'right' })
  await expect(page.locator('[data-square="d4"]')).toHaveAttribute('data-marked', 'true')
  await page.locator('[data-square="a1"]').click()
  await expect(page.getByTestId('annotation-arrow')).toHaveCount(0)
})

test.describe('mobile chess gestures', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

  const touchDrag = async (page: import('@playwright/test').Page, fromSquare: string, toSquare: string) => {
    const from = (await page.locator(`[data-square="${fromSquare}"]`).boundingBox())!
    const to = (await page.locator(`[data-square="${toSquare}"]`).boundingBox())!
    const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
    const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
    const client = await page.context().newCDPSession(page)
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }],
    })
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] })
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }

  test('a touch drag moves a piece to its destination', async ({ page }) => {
    await open(page, 'chess')
    await touchDrag(page, 'e7', 'e8')
    await expect(page.getByRole('group', { name: 'promote to' })).toBeVisible()
  })

  test('a touch drag queues a premove off turn', async ({ page }) => {
    await page.goto('/playwright/felt-fit.html?fixture=chess&offturn')
    await touchDrag(page, 'g6', 'f7')
    await expect(page.getByTestId('chess-status')).toContainText('Premove queued: g6 to f7.')
    await expect(page.getByRole('button', { name: 'Cancel premove' })).toBeVisible()
  })
})
