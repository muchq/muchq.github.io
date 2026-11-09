import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// /hg is a standalone static page, public/hg.html, outside the SPA. Cloudflare's
// assets layer serves /hg from hg.html before the SPA fallback; Vite's dev
// server only knows it as /hg.html.

test('serves /hg as hg.html: html_handling must not be "none"', () => {
  const { assets } = JSON.parse(readFileSync('wrangler.json', 'utf8'))
  expect(assets.html_handling ?? 'auto-trailing-slash').not.toBe('none')
})

test('the page runs its figures and asks not to be indexed', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', e => errors.push(e))
  await page.goto('/hg.html')
  await expect(page).toHaveTitle('Spreading the Blame')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(page.locator('#svgClock > *').first()).toBeAttached()
  expect(errors).toEqual([])
})

test('nothing on the homepage links to it', async ({ page }) => {
  await page.goto('/')
  await page.locator('a[href="/proofs"]').waitFor()
  await expect(page.locator('a[href^="/hg"]')).toHaveCount(0)
})
