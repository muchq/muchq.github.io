import { expect, test, type Page } from '@playwright/test'

// The two moving course links on the homepage: π₁(S¹) ≅ ℤ orbiting toward
// /proofs and the First Isomorphism Theorem spiraling toward /groups. Both
// cycles are scrubbed by hand over their joint period (72 s), so the checks
// cover every position either pill takes, the proofs pill's entrance
// included, not just the frame at load.

const PERIOD_MS = 72_000
const STEP_MS = 250
// The nav bar: 60px and a 1px border.
const NAV_PX = 61

interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

interface Sweep {
  /** Lowest bottom edge of the proofs pill, and highest top edge of the groups pill, over the whole sweep. */
  proofsLowest: number
  groupsHighest: number
  /** Overlapping steps where both pills are drawn at the middle of the overlap. */
  stacked: number
  /** Of those, the steps where the proofs pill is the one on top. */
  proofsOnTop: number
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
      let stacked = 0
      let proofsOnTop = 0
      let proofsLowest = -Infinity
      let groupsHighest = Infinity
      let offscreen: Box | null = null
      for (let t = 0; t < period; t += step) {
        anims.forEach(a => (a.currentTime = t))
        const p = box('/proofs')
        const g = box('/groups')
        proofsLowest = Math.max(proofsLowest, p.bottom)
        groupsHighest = Math.min(groupsHighest, g.top)
        if (hit(p, g)) {
          // Boxes, not pills: a crossing of rounded ends can leave the middle
          // of the overlap on just one of them, so look at what is drawn there.
          const x = (Math.max(p.left, g.left) + Math.min(p.right, g.right)) / 2
          const y = (Math.max(p.top, g.top) + Math.min(p.bottom, g.bottom)) / 2
          const stack = document.elementsFromPoint(x, y)
          const pi = stack.findIndex(el => el.closest('a[href="/proofs"]'))
          const gi = stack.findIndex(el => el.closest('a[href="/groups"]'))
          if (pi >= 0 && gi >= 0) {
            stacked++
            if (pi < gi) proofsOnTop++
          }
        }
        if (!offscreen && (p.left < 0 || p.top < nav || p.right > innerWidth || p.bottom > innerHeight)) offscreen = p
      }
      return { proofsLowest, groupsHighest, stacked, proofsOnTop, offscreen }
    },
    { period: PERIOD_MS, step: STEP_MS, nav: NAV_PX },
  )
}

/** Whatever the pointer is over, wait out the proofs pill's entrance. */
async function landed(page: Page) {
  await page.goto('/')
  await page.locator('a[href="/proofs"]').waitFor()
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
        .map(a => a.finished),
    ),
  )
}

const boxOf = async (page: Page, href: string) => (await page.locator(`a[href="${href}"]`).boundingBox())!
const moved = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

// 3:4 or taller: the proofs pill orbits above the spiral and never meets it.
const tall = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 500, height: 667 },
  { width: 768, height: 1024 },
  { width: 1024, height: 1366 },
] as const

// Anything wider, near-square portrait windows included: both circle the
// page's center, so they cross now and then, the proofs pill underneath.
const wide = [
  { width: 500, height: 600 },
  { width: 600, height: 640 },
  { width: 800, height: 820 },
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
] as const

for (const { width, height } of tall) {
  test(`proofs link orbits on screen and clear of the groups link at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const s = await sweep(page)
    expect(s.offscreen, `pill left the screen at ${JSON.stringify(s.offscreen)}`).toBeNull()
    // Bands, not frames: the two can't meet whatever their phases.
    expect(s.proofsLowest).toBeLessThan(s.groupsHighest)
  })
}

for (const { width, height } of wide) {
  test(`proofs link orbits on screen, under the groups link, at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const s = await sweep(page)
    expect(s.offscreen, `pill left the screen at ${JSON.stringify(s.offscreen)}`).toBeNull()
    expect(s.stacked, 'never crossed, so the stacking check saw nothing').toBeGreaterThan(0)
    expect(s.proofsOnTop, 'proofs pill covered the groups pill').toBe(0)
  })
}

test('without motion the proofs link rests clear of the groups link', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const { width, height } of [...tall, ...wide]) {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await page.locator('a[href="/proofs"]').waitFor()
    const moving = await page.evaluate(
      // The orbit frame and everything in it, the formula included.
      () => document.querySelector('a[href="/proofs"]')!.parentElement!.parentElement!.getAnimations({ subtree: true }).length > 0,
    )
    expect(moving, `${width}×${height}`).toBe(false)
    const p = await boxOf(page, '/proofs')
    const g = await boxOf(page, '/groups')
    const apart = p.x + p.width < g.x || g.x + g.width < p.x || p.y + p.height < g.y || g.y + g.height < p.y
    expect(apart, `${width}×${height}`).toBe(true)
  }
})

test('both course formulas use the same scale curve as 1/π', async ({ page }) => {
  await page.goto('/')
  await page.locator('a[href="/proofs"]').waitFor()
  const scalesAt = (t: number) =>
    page.evaluate(t => {
      document.getAnimations().forEach(a => {
        a.pause()
        a.currentTime = t
      })
      const scale = (selector: string) => Number.parseFloat(getComputedStyle(document.querySelector(selector)!).scale)
      return [scale('p math'), scale('a[href="/groups"] math'), scale('a[href="/proofs"] math')]
    }, t)

  expect(await scalesAt(0)).toEqual([1, 1, 1])
  expect(await scalesAt(10_000)).toEqual([5.5, 5.5, 5.5])
  expect(await scalesAt(20_000)).toEqual([1, 1, 1])
})

test('the proofs link spins out from a speck at the center, landing full size', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.locator('a[href="/proofs"]').waitFor()
  const at = (t: number) =>
    page.evaluate(t => {
      document.getAnimations().forEach(a => {
        a.pause()
        a.currentTime = t
      })
      const link = document.querySelector<HTMLElement>('a[href="/proofs"]')!
      const r = link.getBoundingClientRect()
      return {
        shown: r.width,
        laidOut: link.offsetWidth,
        fromCenter: Math.hypot((r.left + r.right) / 2 - innerWidth / 2, (r.top + r.bottom) / 2 - innerHeight / 2),
        turn: getComputedStyle(link.parentElement!).rotate,
        armScale: getComputedStyle(link.parentElement!).scale,
        counterAnimations: link.getAnimations().length,
      }
    }, t)
  const start = await at(0)
  expect(start.shown).toBeLessThan(start.laidOut * 0.1)
  expect(start.fromCenter).toBeLessThan(15)
  expect(start.turn).toBe('720deg')
  expect(start.counterAnimations).toBe(0)
  for (const t of [300, 700, 1100]) {
    const mid = await at(t)
    expect(mid.turn, `not turning at ${t} ms`).not.toBe('none')
    // Nothing on the link turns back against its spinning ancestors.
    expect(mid.counterAnimations).toBe(0)
  }
  const done = await at(2400)
  expect(done.armScale).toBe('none')
  expect(done.fromCenter).toBeCloseTo(190, -1)
  expect(done.turn).toBe('none')
})

for (const href of ['/proofs', '/groups']) {
  test(`hovering ${href} stops both course links`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await landed(page)
    const b = await boxOf(page, href)
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    const before = [await boxOf(page, '/proofs'), await boxOf(page, '/groups')]
    await page.waitForTimeout(500)
    const after = [await boxOf(page, '/proofs'), await boxOf(page, '/groups')]
    expect(moved(before[0], after[0]), '/proofs moved').toBeLessThan(1)
    expect(moved(before[1], after[1]), '/groups moved').toBeLessThan(1)
  })
}

test('with the pointer elsewhere both course links keep moving', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await landed(page)
  await page.mouse.move(5, 795)
  const before = [await boxOf(page, '/proofs'), await boxOf(page, '/groups')]
  await page.waitForTimeout(500)
  const after = [await boxOf(page, '/proofs'), await boxOf(page, '/groups')]
  expect(moved(before[0], after[0]), '/proofs stood still').toBeGreaterThan(5)
  expect(moved(before[1], after[1]), '/groups stood still').toBeGreaterThan(5)
})

test('neither course link has a disc behind its formula', async ({ page }) => {
  await page.goto('/')
  for (const href of ['/proofs', '/groups']) {
    const backgrounds = await page.locator(`a[href="${href}"]`).evaluate(el => {
      const math = el.querySelector('math')!
      return [getComputedStyle(el).backgroundColor, getComputedStyle(math).backgroundColor]
    })
    expect(backgrounds, href).toEqual(['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)'])
  }
})

test('clicking the stopped proofs link goes to /proofs', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await landed(page)
  const b = await boxOf(page, '/proofs')
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await expect(page).toHaveURL(/\/proofs$/)
})
