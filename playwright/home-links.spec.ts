import { expect, test, type Page } from '@playwright/test'

// The two moving course links on the homepage: π₁(S¹) ≅ ℤ orbiting toward
// /proofs and the First Isomorphism Theorem spiraling toward /groups. Both
// orbital cycles are scrubbed by hand over 72 s, with independently timed
// sideways drifts. Checks include the proofs pill's entrance, not just load.

const PERIOD_MS = 72_000
const STEP_MS = 250
// The nav bar: 60px and a 1px border.
const NAV_PX = 61

test('the chess shortcut stays visible on phone and desktop, with keyboard and reduced-motion support', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const knight = page.getByRole('link', { name: 'Play chess' })
    await expect(knight).toHaveAttribute('href', '/games?play=chess')
    for (const t of [0, 4250, 8500, 12750, 17000]) {
      await showAt(page, t)
      const b = (await knight.boundingBox())!
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.y).toBeGreaterThan(NAV_PX)
      expect(b.x + b.width).toBeLessThanOrEqual(viewport.width)
      expect(b.y + b.height).toBeLessThanOrEqual(viewport.height)
    }
  }
  await page.goto('/')
  const knight = page.getByRole('link', { name: 'Play chess' })
  await knight.focus()
  expect(await knight.evaluate(el => el.parentElement!.getAnimations().every(a => a.playState === 'paused'))).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await knight.evaluate(el => el.parentElement!.getAnimations().length)).toBe(0)
})

interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

interface GreetingFrame {
  boxes: Box[]
  fontSize: number
  animationCount: number
  pointerEvents: string
}

const greetingAt = (page: Page, time: number): Promise<GreetingFrame> =>
  page.locator('h1[aria-label="Hello"]').evaluate((heading, time) => {
    const animations = heading.getAnimations({ subtree: true })
    animations.forEach(animation => {
      animation.pause()
      animation.currentTime = time
    })
    const boxes = [...heading.querySelectorAll('span')].map(letter => {
      const box = letter.getBoundingClientRect()
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
    })
    return {
      boxes,
      fontSize: Number.parseFloat(getComputedStyle(heading).fontSize),
      animationCount: animations.length,
      pointerEvents: getComputedStyle(heading).pointerEvents,
    }
  }, time)

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
  test(`Hello scatters, assembles, and stays on screen at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    const heading = page.getByRole('heading', { name: 'Hello', level: 1 })
    await expect(heading).toBeVisible()
    await expect(heading.locator('span')).toHaveCount(5)

    const times = [0, 5_120, 10_240, 14_080, 15_000, 20_000, 20_480, 24_320, 28_160, 32_000]
    const frames = await Promise.all(times.map(time => greetingAt(page, time)))
    for (const frame of frames) {
      expect(frame.animationCount).toBe(5)
      expect(frame.pointerEvents).toBe('none')
      for (const box of frame.boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0)
        expect(box.top).toBeGreaterThanOrEqual(NAV_PX)
        expect(box.right).toBeLessThanOrEqual(viewport.width)
        expect(box.bottom).toBeLessThanOrEqual(viewport.height)
      }
    }

    const initial = frames[0]
    expect(Math.max(...initial.boxes.map(box => box.top)) - Math.min(...initial.boxes.map(box => box.top))).toBeGreaterThan(initial.fontSize * 2)
    const joined = frames[4]
    const held = frames[5]
    const joinedCenters = joined.boxes.map(box => (box.left + box.right) / 2)
    expect(joinedCenters).toEqual([...joinedCenters].sort((a, b) => a - b))
    for (let index = 1; index < joinedCenters.length; index++) {
      expect(joinedCenters[index] - joinedCenters[index - 1]).toBeGreaterThan(joined.fontSize * 0.2)
    }
    expect(Math.max(...joined.boxes.map(box => box.top)) - Math.min(...joined.boxes.map(box => box.top))).toBeLessThanOrEqual(1)
    const joinedWidth = Math.max(...joined.boxes.map(box => box.right)) - Math.min(...joined.boxes.map(box => box.left))
    expect(joinedWidth).toBeGreaterThan(joined.fontSize * 1.5)
    expect(joinedWidth).toBeLessThan(joined.fontSize * 3)
    joined.boxes.forEach((box, index) => {
      expect(held.boxes[index].left).toBeCloseTo(box.left, 1)
      expect(held.boxes[index].top).toBeCloseTo(box.top, 1)
    })
    const dispersed = frames[7]
    expect(Math.max(...dispersed.boxes.map(box => box.top)) - Math.min(...dispersed.boxes.map(box => box.top))).toBeGreaterThan(dispersed.fontSize * 2)
    for (let letter = 0; letter < 5; letter++) {
      const positions = [frames[0], frames[1], frames[2], frames[7], frames[8]]
        .map(frame => `${frame.boxes[letter].left.toFixed(1)},${frame.boxes[letter].top.toFixed(1)}`)
      expect(new Set(positions).size).toBe(positions.length)
    }
  })
}

test('reduced motion leaves one assembled Hello', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    const frame = await greetingAt(page, 16_000)
    expect(frame.animationCount).toBe(0)
    expect(frame.pointerEvents).toBe('none')
    expect(frame.boxes).toHaveLength(5)
    for (const box of frame.boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.top).toBeGreaterThanOrEqual(NAV_PX)
      expect(box.right).toBeLessThanOrEqual(viewport.width)
      expect(box.bottom).toBeLessThanOrEqual(viewport.height)
    }
    const centers = frame.boxes.map(box => (box.left + box.right) / 2)
    expect(centers).toEqual([...centers].sort((a, b) => a - b))
    for (let index = 1; index < centers.length; index++) {
      expect(centers[index] - centers[index - 1]).toBeGreaterThan(frame.fontSize * 0.2)
    }
    expect(Math.max(...frame.boxes.map(box => box.top)) - Math.min(...frame.boxes.map(box => box.top))).toBeLessThanOrEqual(1)
  }
})

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

/** Pause everything and show frame t of every animation on the page. */
const showAt = (page: Page, t: number) =>
  page.evaluate(t => {
    document.getAnimations().forEach(a => {
      a.pause()
      a.currentTime = t
    })
  }, t)

test('course formulas animate independently of each other and 1/π', async ({ page }) => {
  await page.goto('/')
  const seen = [new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>()]
  for (const t of [0, 2_500, 5_000, 10_000, 15_000, 19_750]) {
    await showAt(page, t)
    const looks = await page.evaluate(() =>
      ['p math', 'a[href="/groups"] math', 'a[href="/proofs"] math', 'a[href="/sets"] math'].map(selector => {
        const s = getComputedStyle(document.querySelector(selector)!)
        return JSON.stringify({ transform: s.transform, scale: s.scale, color: s.color })
      }),
    )
    expect(new Set(looks).size).toBe(4)
    looks.forEach((look, i) => seen[i].add(look))
  }
  seen.forEach(frames => expect(frames.size).toBe(6))
})

for (const { width, height } of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`course links drift independently within their sideways range at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    const seen = [new Set<number>(), new Set<number>()]
    for (const t of [0, 5_000, 10_000, 15_000, 20_000]) {
      await showAt(page, t)
      const offsets = await page.evaluate(() =>
        ['/groups', '/proofs'].map(href => Number.parseFloat(getComputedStyle(
          document.querySelector(`a[href="${href}"]`)!.parentElement!.parentElement!,
        ).translate) || 0),
      )
      offsets.forEach((offset, i) => {
        expect(offset).toBeGreaterThanOrEqual(0)
        expect(offset).toBeLessThanOrEqual(Math.min(width * 0.1, 65))
        seen[i].add(offset)
      })
    }
    seen.forEach(offsets => expect(offsets.size).toBe(5))
    expect([...seen[0]]).not.toEqual([...seen[1]])
  })
}

test('Sets uses the same base formula size as the other courses', async ({ page }) => {
  await page.goto('/')
  const sizes = await page.evaluate(() =>
    ['/sets', '/groups', '/proofs'].map(href =>
      getComputedStyle(document.querySelector(`a[href="${href}"] math`)!).fontSize,
    ),
  )
  expect(sizes[0]).toBe(sizes[1])
  expect(sizes[0]).toBe(sizes[2])
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
      // The orbit's 0×0 frame, which drifts sideways with 1/π.
      const c = link.parentElement!.parentElement!.getBoundingClientRect()
      return {
        shown: r.width,
        laidOut: link.offsetWidth,
        fromCenter: Math.hypot((r.left + r.right) / 2 - c.left, (r.top + r.bottom) / 2 - c.top),
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

for (const href of ['/proofs', '/groups', '/sets']) {
  test(`hovering ${href} keeps all course animations running`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await landed(page)
    const b = await boxOf(page, href)
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    const animations = await page.locator('a[href="/sets"]').evaluate(el =>
      el.parentElement!.parentElement!.getAnimations({ subtree: true }).map(a => a.playState),
    )
    expect(animations.length).toBeGreaterThan(0)
    expect(animations.every(state => state === 'running')).toBe(true)
  })
}

test('keyboard focus pauses all course animations and blur resumes them', async ({ page }) => {
  await landed(page)
  const states = () => page.locator('a[href="/sets"]').evaluate(el =>
    el.parentElement!.parentElement!.getAnimations({ subtree: true }).map(a => a.playState),
  )
  await page.locator('a[href="/sets"]').focus()
  const paused = await states()
  expect(paused.length).toBeGreaterThan(0)
  expect(paused.every(state => state === 'paused')).toBe(true)
  await page.locator('a[href="/sets"]').evaluate(el => (el as HTMLElement).blur())
  expect((await states()).every(state => state === 'running')).toBe(true)
})

test('reduced motion disables all course animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const count = await page.locator('a[href="/sets"]').evaluate(el =>
    el.parentElement!.parentElement!.getAnimations({ subtree: true }).length,
  )
  expect(count).toBe(0)
})

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

test('clicking the moving proofs link goes to /proofs', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await landed(page)
  const b = await boxOf(page, '/proofs')
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await expect(page).toHaveURL(/\/proofs$/)
})
