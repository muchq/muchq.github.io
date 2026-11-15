import { expect, test, type Page } from '@playwright/test'

// The nav bar: 60px and a 1px border.
const NAV_PX = 61

test('the chess shortcut stays visible on phone and desktop, with keyboard and reduced-motion support', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const knight = page.getByRole('link', { name: 'Play chess' })
    await expect(knight).toHaveAttribute('href', '/games?play=chess')
    const positions = []
    for (const t of [0, 4250, 8500, 12750, 17000]) {
      await showAt(page, t)
      const b = (await knight.boundingBox())!
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.y).toBeGreaterThan(NAV_PX)
      expect(b.x + b.width).toBeLessThanOrEqual(viewport.width)
      expect(b.y + b.height).toBeLessThanOrEqual(viewport.height)
      positions.push(b)
    }
    const xs = positions.map(position => position.x)
    const ys = positions.map(position => position.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(viewport.width * 0.04)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(viewport.height * 0.015)
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
  colors: string[]
  durations: number[]
  weights: string[]
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
      colors: [...heading.querySelectorAll('span')].map(letter => getComputedStyle(letter).color),
      durations: animations.map(animation => Number(animation.effect?.getTiming().duration)),
      weights: [...heading.querySelectorAll('span')].map(letter => getComputedStyle(letter).fontWeight),
      fontSize: Number.parseFloat(getComputedStyle(heading).fontSize),
      animationCount: animations.length,
      pointerEvents: getComputedStyle(heading).pointerEvents,
    }
  }, time)

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
  test(`Hello stays fixed while its muted color and type change at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    const heading = page.getByRole('heading', { name: 'Hello', level: 1 })
    await expect(heading).toBeVisible()
    await expect(heading.locator('span')).toHaveCount(5)

    const times = [0, 7_000, 17_000, 29_000, 43_000, 59_000, 77_000, 96_000]
    const frames = await Promise.all(times.map(time => greetingAt(page, time)))
    for (const frame of frames) {
      expect(frame.animationCount).toBe(10)
      expect(frame.pointerEvents).toBe('none')
      for (const box of frame.boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0)
        expect(box.top).toBeGreaterThanOrEqual(NAV_PX)
        expect(box.right).toBeLessThanOrEqual(viewport.width)
        expect(box.bottom).toBeLessThanOrEqual(viewport.height)
      }
    }

    const joined = frames[0]
    expect(joined.durations.filter(duration => duration === 96_000)).toHaveLength(5)
    expect(joined.durations.filter(duration => duration >= 28_000 && duration <= 40_000)).toHaveLength(5)
    const joinedCenters = joined.boxes.map(box => (box.left + box.right) / 2)
    expect(joinedCenters).toEqual([...joinedCenters].sort((a, b) => a - b))
    for (let index = 1; index < joinedCenters.length; index++) {
      expect(joinedCenters[index] - joinedCenters[index - 1]).toBeGreaterThan(joined.fontSize * 0.2)
    }
    expect(Math.max(...joined.boxes.map(box => box.top)) - Math.min(...joined.boxes.map(box => box.top))).toBeLessThanOrEqual(1)
    const joinedWidth = Math.max(...joined.boxes.map(box => box.right)) - Math.min(...joined.boxes.map(box => box.left))
    expect(joinedWidth).toBeGreaterThan(joined.fontSize * 1.5)
    expect(joinedWidth).toBeLessThan(joined.fontSize * 3)
    expect(Math.min(...joined.boxes.map(box => box.left))).toBeLessThan(viewport.width * 0.1)
    expect(Math.max(...joined.boxes.map(box => box.right))).toBeLessThan(viewport.width * 0.4)
    expect(Math.max(...joined.boxes.map(box => box.bottom))).toBeLessThan(viewport.height * 0.4)
    for (let letter = 0; letter < 5; letter++) {
      const center = (frame: GreetingFrame) => ({
        x: (frame.boxes[letter].left + frame.boxes[letter].right) / 2,
        y: (frame.boxes[letter].top + frame.boxes[letter].bottom) / 2,
      })
      const initial = center(frames[0])
      frames.slice(1).forEach(frame => {
        expect(center(frame).x).toBeCloseTo(initial.x, 1)
        expect(center(frame).y).toBeCloseTo(initial.y, 1)
      })
      expect(new Set(frames.map(frame => frame.colors[letter])).size).toBeGreaterThan(3)
      expect(new Set(frames.map(frame => frame.weights[letter])).size).toBeGreaterThan(1)
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
    expect(Math.min(...frame.boxes.map(box => box.left))).toBeLessThan(viewport.width * 0.1)
    expect(Math.max(...frame.boxes.map(box => box.right))).toBeLessThan(viewport.width * 0.4)
    expect(Math.max(...frame.boxes.map(box => box.bottom))).toBeLessThan(viewport.height * 0.4)
  }
})

async function landed(page: Page) {
  await page.goto('/')
  await page.locator('a[href="/proofs"]').waitFor()
}

const boxOf = async (page: Page, href: string) => (await page.locator(`a[href="${href}"]`).boundingBox())!
const courseHrefs = ['/proofs', '/groups', '/sets'] as const
const courseDurations = { '/proofs': 27_000, '/groups': 24_000, '/sets': 30_000 } as const

/** Pause everything and show frame t of every animation on the page. */
const showAt = (page: Page, t: number) =>
  page.evaluate(t => {
    document.getAnimations().forEach(a => {
      a.pause()
      a.currentTime = t
    })
  }, t)

for (const { width, height } of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
  test(`course links bob slowly within a subtle range at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    const positions = courseHrefs.map(() => [] as { x: number; y: number }[])
    for (const t of [0, 6_000, 12_000, 18_000, 24_000, 30_000]) {
      await showAt(page, t)
      for (const [index, href] of courseHrefs.entries()) {
        const box = await boxOf(page, href)
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.y).toBeGreaterThan(NAV_PX)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
        expect(box.y + box.height).toBeLessThanOrEqual(height)
        positions[index].push({ x: box.x, y: box.y })
      }
    }
    positions.forEach(frames => {
      const xs = frames.map(frame => frame.x)
      const ys = frames.map(frame => frame.y)
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1)
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1)
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(6)
      expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(8)
    })
    for (const href of courseHrefs) {
      const motion = await page.locator(`a[href="${href}"]`).evaluate(el => ({
        formulaAnimations: el.querySelector('math')!.getAnimations().length,
        wrapperDuration: Number(el.parentElement!.getAnimations()[0]?.effect?.getTiming().duration),
      }))
      expect(motion.formulaAnimations).toBe(0)
      expect(motion.wrapperDuration).toBe(courseDurations[href])
    }
  })
}

test('without motion the course links remain still and separated', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const { width, height } of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    const boxes = []
    for (const href of courseHrefs) {
      const count = await page.locator(`a[href="${href}"]`).evaluate(el =>
        el.parentElement!.getAnimations({ subtree: true }).length,
      )
      expect(count).toBe(0)
      boxes.push(await boxOf(page, href))
    }
    for (let first = 0; first < boxes.length; first++) {
      for (let second = first + 1; second < boxes.length; second++) {
        const a = boxes[first]
        const b = boxes[second]
        const apart = a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y
        expect(apart, `${courseHrefs[first]} overlaps ${courseHrefs[second]} at ${width}×${height}`).toBe(true)
      }
    }
  }
})

test('Sets uses the same base formula size as the other courses', async ({ page }) => {
  await page.goto('/')
  const sizes = await page.evaluate(() =>
    ['/sets', '/groups', '/proofs'].map(href =>
      getComputedStyle(document.querySelector(`a[href="${href}"] math`)!).fontSize,
    ),
  )
  expect(sizes[0]).toBe(sizes[1])
  expect(sizes[0]).toBe(sizes[2])
  expect(Number.parseFloat(sizes[0])).toBeGreaterThanOrEqual(16)
})

for (const href of ['/proofs', '/groups', '/sets']) {
  test(`hovering ${href} keeps all course animations running`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await landed(page)
    const b = await boxOf(page, href)
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    const animations = await page.locator('a[href="/sets"]').evaluate(el =>
      el.parentElement!.getAnimations({ subtree: true }).map(a => a.playState),
    )
    expect(animations.length).toBeGreaterThan(0)
    expect(animations.every(state => state === 'running')).toBe(true)
  })
}

test('keyboard focus pauses all course animations and blur resumes them', async ({ page }) => {
  await landed(page)
  const states = () => page.locator('a[href="/sets"]').evaluate(el =>
    el.parentElement!.getAnimations({ subtree: true }).map(a => a.playState),
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
    el.parentElement!.getAnimations({ subtree: true }).length,
  )
  expect(count).toBe(0)
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

test('clicking the bobbing proofs link goes to /proofs', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await landed(page)
  const b = await boxOf(page, '/proofs')
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await expect(page).toHaveURL(/\/proofs$/)
})
