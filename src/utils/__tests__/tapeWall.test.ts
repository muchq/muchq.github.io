import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TapeWall, type TapeView } from '../tapeWall'
import { TAPE_FADE_SECONDS, TAPE_FAINTEST, TapeRing, VERDICT_COLOURS, splatOpacity, type TapeSplat } from '../tapeSplats'
import { splat } from '@/test/fakeTape'

// The splats as the page draws them: one element per splat, projected
// through the same camera the ray tracer casts from, over the glass.

const NOW = 1_700_000_000

// The camera at the origin looking down -z, so wall 0 (z = -50) is dead
// ahead and wall 2 (z = +50) is behind it.
const view = (over: Partial<TapeView> = {}): TapeView => ({
  cameraPos: [0, 0, 0],
  cameraTarget: [0, 0, -10],
  cameraUp: [0, 1, 0],
  aspect: 1,
  width: 1000,
  height: 800,
  wall: { boundary: 50, base: -2, height: 16 },
  now: NOW,
  ...over,
})

describe('TapeWall', () => {
  let container: HTMLElement
  let tapeWall: TapeWall

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    tapeWall = new TapeWall(container)
  })
  afterEach(() => {
    container.remove()
  })

  const shown = () => [...container.children] as HTMLElement[]
  // jsdom writes a colour back in its own notation; compare through it
  // rather than pinning the notation.
  const asCss = (colour: string) => {
    const probe = document.createElement('div')
    probe.style.color = colour
    return probe.style.color
  }
  const seeded = (...splats: TapeSplat[]) => {
    const ring = new TapeRing()
    ring.seed(splats)
    return ring.splats
  }

  it('draws one element per splat, in the verdict colour, at the token', () => {
    tapeWall.draw(seeded(splat({ seq: 1, actual: 'GET /one', verdict: 'anomaly' }), splat({ seq: 2, actual: 'GET /two', bigram: { token: 'GET /two', p: 0.9 } })), view())
    expect(shown()).toHaveLength(2)
    expect(shown()[0].textContent).toContain('GET /one')
    expect(shown()[0].style.color).toBe(asCss(VERDICT_COLOURS.anomaly))
    expect(shown()[1].style.color).toBe(asCss(VERDICT_COLOURS.hit))
    // Long access-log tokens read the way the deja page shortens them,
    // with the whole of it still on the element.
    tapeWall.draw(seeded(splat({ seq: 3, actual: '1.2.3.4 GET /deep/path HTTP/1.1' })), view())
    expect(shown()[0].textContent).toContain('GET /deep/path')
    expect(shown()[0].title).toContain('1.2.3.4 GET /deep/path HTTP/1.1')
  })

  it('places a splat on the wall the hub picked, through the camera', () => {
    tapeWall.draw(seeded(splat({ seq: 1, wall: 0, u: 0.5, v: 0.125 })), view())
    const element = shown()[0]
    // Straight ahead on the -z wall: the middle of the screen, at the
    // height the camera looks at.
    expect(parseFloat(element.style.left)).toBeCloseTo(500, 3)
    expect(parseFloat(element.style.top)).toBeCloseTo(400, 3)
    // Half the wall to the right of the middle lands right of centre.
    tapeWall.draw(seeded(splat({ seq: 2, wall: 0, u: 0.75, v: 0.125 })), view())
    expect(parseFloat(shown()[0].style.left)).toBeGreaterThan(500)
  })

  it('hides a splat on a wall behind the camera', () => {
    tapeWall.draw(seeded(splat({ seq: 1, wall: 2, u: 0.5, v: 0.5 })), view())
    expect(shown()[0].style.opacity).toBe('0')
    // The control: the same splat on the wall the camera faces is drawn.
    tapeWall.draw(seeded(splat({ seq: 2, wall: 0, u: 0.5, v: 0.5 })), view())
    expect(parseFloat(shown()[0].style.opacity)).toBeGreaterThan(0)
  })

  it('fades a splat by its age, so a minutes-old ring is not a live wall', () => {
    const ring = new TapeRing()
    ring.seed([splat({ seq: 1, ts: NOW }), splat({ seq: 2, ts: NOW - TAPE_FADE_SECONDS / 2 }), splat({ seq: 3, ts: NOW - 60 * 60 })])
    tapeWall.draw(ring.splats, view())
    const [fresh, middling, old] = shown().map(e => parseFloat(e.style.opacity))
    expect(fresh).toBeCloseTo(1, 6)
    expect(middling).toBeCloseTo(splatOpacity(TAPE_FADE_SECONDS / 2), 6)
    expect(old).toBeCloseTo(TAPE_FAINTEST, 6)
    // Faded, still readable: text on a plate over bright glass.
    expect(TAPE_FAINTEST).toBeGreaterThan(0.2)
    // And it keeps fading as the clock moves, without a new splat.
    tapeWall.draw(ring.splats, view({ now: NOW + TAPE_FADE_SECONDS / 2 }))
    expect(parseFloat(shown()[0].style.opacity)).toBeCloseTo(middling, 6)
  })

  it('lands a live splat with a smack and settles it, while a seeded one is already still', () => {
    const ring = new TapeRing()
    ring.seed([splat({ seq: 1 })])
    ring.add(splat({ seq: 2 }))
    tapeWall.draw(ring.splats, view())
    const [settled, arriving] = shown()
    expect(settled.style.transform).toContain('scale(1)')
    expect(arriving.style.transform).not.toContain('scale(1)')
    // Only the scale animates. Opacity is the splat's age from the first
    // frame, or every splat restarts a transition every frame and one
    // passing behind the camera ghosts at the edge of the screen.
    expect(arriving.style.opacity).toBe(settled.style.opacity)
    expect(arriving.style.transition).toContain('transform')
    expect(arriving.style.transition).not.toContain('opacity')
    // The next frame is what the transition runs to.
    tapeWall.draw(ring.splats, view())
    expect(shown()[1].style.transform).toContain('scale(1)')
  })

  // The smack is once per event. A tab left in the background pauses the
  // frames while the socket keeps filling the ring, and a room cycled
  // away and back rebuilds every element: neither is thirty-two arrivals.
  it('smacks a live splat in once, and never one that landed while nobody was watching', () => {
    const ring = new TapeRing()
    ring.add(splat({ seq: 1, ts: NOW }))
    tapeWall.draw(ring.splats, view())
    expect(shown()[0].style.transform).not.toContain('scale(1)')
    tapeWall.draw(ring.splats, view())
    // Out of the room and back: it is already on the glass.
    tapeWall.draw([], view())
    tapeWall.draw(ring.splats, view())
    expect(shown()[0].style.transform).toContain('scale(1)')

    // Minutes old on its first frame: it was live on the wire, but
    // nothing about it is arriving now.
    ring.add(splat({ seq: 2, ts: NOW - 120 }))
    tapeWall.draw(ring.splats, view())
    expect(shown()[1].style.transform).toContain('scale(1)')
    // The control: one that landed just now still smacks.
    ring.add(splat({ seq: 3, ts: NOW }))
    tapeWall.draw(ring.splats, view())
    expect(shown()[2].style.transform).not.toContain('scale(1)')
  })

  it('skips the smack for a reader who asked for less motion', () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query.includes('reduced-motion') })) as unknown as typeof window.matchMedia
    vi.stubGlobal('matchMedia', matchMedia)
    const ring = new TapeRing()
    ring.add(splat({ seq: 1, ts: NOW }))
    tapeWall.draw(ring.splats, view())
    expect(shown()[0].style.transform).toContain('scale(1)')
    vi.unstubAllGlobals()
  })

  it('shows a predictor guess when there is one, and none when it led with the request', () => {
    const guess = () => shown()[0].querySelector('[data-part="guess"]')?.textContent
    tapeWall.draw(seeded(splat({ seq: 1, actual: 'GET /c', bigram: { token: 'GET /d', p: 0.4 } })), view())
    expect(guess()).toBe('GET /d')
    // The net's, when the bigram had none to offer.
    tapeWall.draw(seeded(splat({ seq: 2, actual: 'GET /c', bigram: undefined, net: { token: 'GET /e', p: 0.3 } })), view())
    expect(guess()).toBe('GET /e')
    // Nothing to show: no gap between the guess and the request.
    tapeWall.draw(seeded(splat({ seq: 3, actual: 'GET /c', bigram: { token: 'GET /c', p: 0.9 } })), view())
    expect(guess()).toBeUndefined()
    // Nor when neither predictor had anything.
    tapeWall.draw(seeded(splat({ seq: 4, actual: 'GET /c', bigram: undefined, net: undefined })), view())
    expect(guess()).toBeUndefined()
    expect(shown()[0].textContent).toContain('GET /c')
  })

  // Colour alone is not a reading of the verdict.
  it('names the verdict in words, including one this client never heard', () => {
    const verdict = () => shown()[0].querySelector('[data-part="verdict"]')?.textContent
    tapeWall.draw(seeded(splat({ seq: 1, verdict: 'anomaly' })), view())
    expect(verdict()).toBe('anomaly')
    tapeWall.draw(seeded(splat({ seq: 2, verdict: 'expected', actual: 'GET /c', bigram: { token: 'GET /c', p: 0.9 } })), view())
    expect(verdict()).toBe('hit')
    tapeWall.draw(seeded(splat({ seq: 3, verdict: 'expected', actual: 'GET /c', bigram: { token: 'GET /d', p: 0.4 } })), view())
    expect(verdict()).toBe('near')
    tapeWall.draw(seeded(splat({ seq: 4, verdict: 'quorum-drift' })), view())
    expect(verdict()).toBe('quorum-drift')
  })

  it('keeps ~32 token strings out of a screen reader and shrinks them at phone width', () => {
    expect(container.getAttribute('aria-hidden')).toBe('true')
    tapeWall.draw(seeded(splat({ seq: 1 })), view({ width: 900 }))
    expect(shown()[0].style.fontSize).toBe('10px')
    tapeWall.draw(seeded(splat({ seq: 1 })), view({ width: 1400 }))
    expect(shown()[0].style.fontSize).toBe('13px')
  })

  it('takes down what the ring no longer holds, and everything on clear', () => {
    const ring = new TapeRing()
    ring.seed([splat({ seq: 1 }), splat({ seq: 2 })])
    tapeWall.draw(ring.splats, view())
    const kept = shown()[0]
    tapeWall.draw(seeded(splat({ seq: 1 })), view())
    expect(shown()).toEqual([kept])
    tapeWall.draw([], view())
    expect(shown()).toEqual([])
    tapeWall.draw(seeded(splat({ seq: 1 })), view())
    tapeWall.clear()
    expect(shown()).toEqual([])
  })
})
