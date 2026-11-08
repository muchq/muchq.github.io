import { expect, test, type Page } from '@playwright/test'

// The two moving course links on the homepage: π₁(S¹) ≅ ℤ orbiting toward
// /proofs and the First Isomorphism Theorem spiraling toward /groups. Both
// cycles are scrubbed by hand over their joint period (72 s), so the checks
// cover every position either pill takes, not just the frame at load.

const PERIOD_MS = 72_000
const STEP_MS = 250
const NAV_PX = 60

interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

interface Sweep {
  atLoad: boolean
  overlapShare: number
  offscreen: Box | null
}

async function sweep(page: Page): Promise<Sweep> {
  await page.goto('/')
  await page.locator('a[href="/proofs"]').waitFor()
  return page.evaluate(
    ({ period, step, nav }) => {
      const box = (href: string) => {
        const r = document.querySelector(`a[href="${href}"]`)!.getBoundingClientRect()
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
      }
      const hit = (a: Box, b: Box) => !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top)
      const anims = document.getAnimations()
      anims.forEach(a => a.pause())
      let atLoad = false
      let hits = 0
      let n = 0
      let offscreen: Box | null = null
      for (let t = 0; t < period; t += step, n++) {
        anims.forEach(a => (a.currentTime = t))
        const p = box('/proofs')
        const g = box('/groups')
        if (hit(p, g)) {
          hits++
          if (t === 0) atLoad = true
        }
        if (!offscreen && (p.left < 0 || p.top < nav || p.right > innerWidth || p.bottom > innerHeight)) offscreen = p
      }
      return { atLoad, overlapShare: hits / n, offscreen }
    },
    { period: PERIOD_MS, step: STEP_MS, nav: NAV_PX },
  )
}

const portrait = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 1366 },
] as const

const landscape = [
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
] as const

for (const { width, height } of portrait) {
  test(`proofs link orbits on screen and clear of the groups link at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const s = await sweep(page)
    expect(s.offscreen, `pill left the screen at ${JSON.stringify(s.offscreen)}`).toBeNull()
    expect(s.overlapShare).toBe(0)
  })
}

for (const { width, height } of landscape) {
  // Here both circle the same center, so they cross now and then; only the
  // first frame has to be clean, so neither covers the other at load.
  test(`proofs link orbits on screen and starts clear at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const s = await sweep(page)
    expect(s.offscreen, `pill left the screen at ${JSON.stringify(s.offscreen)}`).toBeNull()
    expect(s.atLoad).toBe(false)
  })
}

test('without motion the proofs link rests clear of the groups link', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const { width, height } of [...portrait, ...landscape]) {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await page.locator('a[href="/proofs"]').waitFor()
    const moving = await page.evaluate(() => {
      const link = document.querySelector('a[href="/proofs"]')!
      return [link, link.parentElement!, link.parentElement!.parentElement!].some(el => el.getAnimations().length > 0)
    })
    expect(moving, `${width}×${height}`).toBe(false)
    const p = (await page.locator('a[href="/proofs"]').boundingBox())!
    const g = (await page.locator('a[href="/groups"]').boundingBox())!
    const apart = p.x + p.width < g.x || g.x + g.width < p.x || p.y + p.height < g.y || g.y + g.height < p.y
    expect(apart, `${width}×${height}`).toBe(true)
  }
})

test('hovering the proofs link stops it, and it goes to /proofs', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const link = page.locator('a[href="/proofs"]')
  await link.waitFor()
  const b = (await link.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  const before = (await link.boundingBox())!
  await page.waitForTimeout(500)
  const after = (await link.boundingBox())!
  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeLessThan(1)
  await page.mouse.down()
  await page.mouse.up()
  await expect(page).toHaveURL(/\/proofs$/)
})
