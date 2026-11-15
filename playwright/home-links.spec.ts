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
  families: string[]
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
      families: [...heading.querySelectorAll('span')].map(letter => getComputedStyle(letter).fontFamily),
      weights: [...heading.querySelectorAll('span')].map(letter => getComputedStyle(letter).fontWeight),
      fontSize: Number.parseFloat(getComputedStyle(heading).fontSize),
      animationCount: animations.length,
      pointerEvents: getComputedStyle(heading).pointerEvents,
    }
  }, time)

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
  test(`Hello stays fixed while its muted color and font family change at ${viewport.width}×${viewport.height}`, async ({ page }) => {
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
    expect(joined.weights.every(weight => weight === '200')).toBe(true)
    expect(joined.durations.filter(duration => duration >= 72_000 && duration <= 108_000)).toHaveLength(5)
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
      expect(new Set(frames.map(frame => frame.families[letter])).size).toBeGreaterThan(2)
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

const boxOf = async (page: Page, href: string) => {
  const box = await page.locator(`a[href="${href}"]`).evaluate(el => {
    const rect = el.getBoundingClientRect()
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
  })
  return box
}
const courseHrefs = ['/proofs', '/groups', '/sets'] as const

/** Pause everything and show frame t of every animation on the page. */
const showAt = (page: Page, t: number) =>
  page.evaluate(t => {
    document.getAnimations().forEach(a => {
      a.pause()
      a.currentTime = t
    })
  }, t)

for (const { width, height } of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
  test(`course links fade mostly invisible with alternating visibility at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await page.locator('a[href="/sets"]').waitFor()
    const sample = await page.evaluate(({ times, hrefs }) => {
      const measure = (time: number) => {
        for (const href of hrefs) {
          const wrapper = document.querySelector(`a[href="${href}"]`)!.parentElement!
          wrapper.getAnimations().forEach(animation => {
            animation.pause()
            animation.currentTime = time
          })
        }
        return hrefs.map(href => {
          const link = document.querySelector(`a[href="${href}"]`)!
          const wrapper = link.parentElement!
          const rect = link.getBoundingClientRect()
          return {
            href,
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            opacity: Number.parseFloat(getComputedStyle(wrapper).opacity),
            formulaAnimations: link.querySelector('math')!.getAnimations().length,
            wrapperDuration: Number(wrapper.getAnimations()[0]?.effect?.getTiming().duration),
          }
        })
      }
      return {
        frames: times.map(measure),
        peaks: [0, 6_000, 12_000].map(measure),
      }
    }, { times: [0, 3_000, 6_000, 9_000, 12_000, 15_000, 18_000], hrefs: [...courseHrefs] })

    const opacities = courseHrefs.map(() => [] as number[])
    for (const frame of sample.frames) {
      frame.forEach((entry, index) => {
        expect(entry.left).toBeGreaterThanOrEqual(0)
        expect(entry.top).toBeGreaterThan(NAV_PX)
        expect(entry.right).toBeLessThanOrEqual(width)
        expect(entry.bottom).toBeLessThanOrEqual(height)
        opacities[index].push(entry.opacity)
      })
    }
    opacities.forEach(frames => {
      expect(Math.min(...frames)).toBeLessThan(0.2)
      expect(Math.max(...frames)).toBeGreaterThan(0.7)
      expect(frames.filter(opacity => opacity < 0.2).length).toBeGreaterThan(frames.filter(opacity => opacity > 0.7).length)
    })
    for (const peak of sample.peaks) {
      expect(peak.filter(entry => entry.opacity > 0.5)).toHaveLength(1)
    }
    sample.frames[0].forEach(entry => {
      expect(entry.formulaAnimations).toBe(0)
      expect(entry.wrapperDuration).toBe(18_000)
    })
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

test('clicking the fading proofs link goes to /proofs', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await landed(page)
  const b = await boxOf(page, '/proofs')
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await expect(page).toHaveURL(/\/proofs$/)
})

test('homepage suppresses iOS overscroll while keeping links clickable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const shell = await page.evaluate(() => {
    const home = document.querySelector('.homePage, [class*="homePage"]') as HTMLElement | null
    // CSS modules hash the class; find the fixed full-viewport shell under main's parent.
    const root = document.querySelector('#root')?.firstElementChild as HTMLElement | null
    const target = home ?? root
    if (!target) return null
    const style = getComputedStyle(target)
    return {
      overscroll: style.overscrollBehavior,
      touchAction: style.touchAction,
      htmlOverscroll: getComputedStyle(document.documentElement).overscrollBehavior,
    }
  })
  expect(shell).not.toBeNull()
  expect(shell!.touchAction).toBe('none')
  expect(shell!.overscroll).toMatch(/none/)
  expect(shell!.htmlOverscroll).toMatch(/none/)
})

test('homepage links still work after a finger-style Julia drag', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const destinations = [
    { href: '/proofs', path: /\/proofs$/ },
    { href: '/groups', path: /\/groups$/ },
    { href: '/sets', path: /\/sets$/ },
    { href: '/games?play=chess', path: /\/games\?play=chess$/ },
  ] as const

  const dragJulia = () =>
    page.evaluate(() => {
      const fire = (type: string, x: number, y: number) => {
        document.dispatchEvent(new PointerEvent(type, {
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          pointerType: 'touch',
        }))
      }
      fire('pointerdown', 40, 280)
      for (const x of [70, 110, 150, 190, 230]) fire('pointermove', x, 300)
      fire('pointerup', 230, 300)
    })

  for (const destination of destinations) {
    await page.goto('/')
    await page.locator(`a[href="${destination.href}"]`).waitFor()
    await dragJulia()
    // Course pills keep animating opacity; click through the hit target directly
    // instead of waiting for Playwright's "stable" visibility check.
    const box = await boxOf(page, destination.href)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.up()
    await expect(page).toHaveURL(destination.path)
  }

  await page.goto('/')
  await dragJulia()
  await page.locator('a.nav-logo').click()
  await expect(page).toHaveURL(/\/$/)
})
