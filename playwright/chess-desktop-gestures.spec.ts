import { expect, test } from '@playwright/test'

async function open(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/playwright/felt-fit.html?fixture=chess')
  await page.waitForSelector('[data-table-overlay][data-fixture="chess"]')
}

async function center(page: import('@playwright/test').Page, square: string) {
  const box = (await page.locator(`[data-square="${square}"]`).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

test('desktop mouse drag moves a piece to its destination', async ({ page }) => {
  await open(page)
  const from = await center(page, 'e7')
  const to = await center(page, 'e8')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await expect(page.getByTestId('drag-ghost')).toBeVisible()
  await page.mouse.up()
  await expect(page.getByRole('group', { name: 'promote to' })).toBeVisible()
})

test('desktop press that releases on a neighbour still selects the piece', async ({ page }) => {
  await open(page)
  const g6 = await center(page, 'g6')
  // Stay inside the 6px drag slop but cross into g7 (not a legal landing
  // square) so a browser that omits click on element change still selects.
  await page.mouse.move(g6.x, g6.box.y + 1)
  await page.mouse.down()
  await page.mouse.move(g6.x, g6.box.y - 2)
  await page.mouse.up()
  await expect(page.locator('[data-square="g6"]')).toHaveAttribute('aria-pressed', 'true')
  await page.locator('[data-square="f7"]').click()
  await expect(page.locator('[data-square="g6"]')).toHaveAttribute('aria-pressed', 'false')
})

test('desktop first click selects after focus was outside the board', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Resign' }).focus()
  await expect(page.getByRole('button', { name: 'Resign' })).toBeFocused()
  await page.locator('[data-square="g6"]').click()
  await expect(page.locator('[data-square="g6"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-square="f7"]')).toHaveAccessibleDescription('a move')
})

test('desktop first click after returning from another page selects the piece', async ({ page, context }) => {
  await open(page)
  const other = await context.newPage()
  await other.goto('about:blank')
  await other.bringToFront()
  await page.bringToFront()
  const g6 = await center(page, 'g6')
  // First contact with the board after the window was elsewhere: one
  // press must select, not be eaten as a mere focus restore.
  await page.mouse.click(g6.x, g6.y)
  await expect(page.locator('[data-square="g6"]')).toHaveAttribute('aria-pressed', 'true')
  await other.close()
})

test('desktop first drag after focus was elsewhere still moves', async ({ page }) => {
  await open(page)
  await page.locator('h1').click()
  const from = await center(page, 'e7')
  const to = await center(page, 'e8')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 10 })
  await page.mouse.up()
  await expect(page.getByRole('group', { name: 'promote to' })).toBeVisible()
})
