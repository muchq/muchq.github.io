import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SMEAR_SECONDS, TapeWall, type TapeView } from '../tapeWall'
import { TAPE_FADE_SECONDS, TAPE_FAINTEST, TapeRing, VERDICT_COLOURS, splatOpacity, splatPoint, type TapeSplat } from '../tapeSplats'
import { COMET_FLIGHT_SECONDS, cometAt } from '../tapeComet'
import { projectToNdc, type Vec3 } from '../projection'
import { splat } from '@/test/fakeTape'

// The splats as the page draws them: a live event flies in as a comet
// and smears on impact, everything else is residue already on the glass,
// all of it projected through the same camera the ray tracer casts from.

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

  const shown = () => [...container.querySelectorAll<HTMLElement>('.tape-splat')]
  const comets = () => [...container.querySelectorAll<HTMLElement>('[data-comet]')]
  const smears = () => shown().filter(e => e.dataset.role === 'smear')
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
  const flying = (over: Partial<TapeSplat> = {}) => {
    const ring = new TapeRing()
    ring.add(splat({ ts: NOW, ...over }))
    return ring
  }
  // A live event, flown in: the frame it arrives on and the frame it
  // lands on, since a comet is only a smear once it has hit.
  const land = (ring: TapeRing, over: Partial<TapeView> = {}) => {
    tapeWall.draw(ring.splats, view({ ...over, now: NOW }))
    tapeWall.draw(ring.splats, view({ ...over, now: NOW + COMET_FLIGHT_SECONDS }))
  }
  // Where a world point lands on this view's screen.
  const onScreen = (point: Vec3, at = view()) => {
    const p = projectToNdc(point, at.cameraPos, at.cameraTarget, at.aspect, at.cameraUp)!
    return { left: (p.x + 1) * 0.5 * at.width, top: (1 - p.y) * 0.5 * at.height }
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

  // The flight itself is tapeComet's; what the wall owes is that the
  // head is drawn where that function puts it, and that the thing ends
  // on the hub's point rather than near it.
  it('flies a live event in as a comet and lands it where the hub put it', () => {
    const event = splat({ seq: 1, wall: 0, u: 0.5, v: 0.125, ts: NOW })
    const ring = new TapeRing()
    ring.add(event)
    tapeWall.draw(ring.splats, view())
    expect(comets().length).toBeGreaterThan(0)
    // Nothing is on the glass yet: the data arrives with the comet.
    expect(parseFloat(smears()[0].style.opacity)).toBe(0)

    const half = view({ now: NOW + COMET_FLIGHT_SECONDS / 2 })
    tapeWall.draw(ring.splats, half)
    const head = comets().find(e => e.dataset.comet === 'head')!
    const expected = onScreen(cometAt(event, half.wall, 0.5), half)
    expect(parseFloat(head.style.left)).toBeCloseTo(expected.left, 3)
    expect(parseFloat(head.style.top)).toBeCloseTo(expected.top, 3)
    // Out there, not on the glass.
    expect(parseFloat(head.style.left)).not.toBeCloseTo(500, 1)

    const landed = view({ now: NOW + COMET_FLIGHT_SECONDS })
    tapeWall.draw(ring.splats, landed)
    expect(comets()).toEqual([])
    const smear = smears()[0]
    expect(onScreen(splatPoint(event, landed.wall), landed)).toEqual({ left: 500, top: 400 })
    expect(parseFloat(smear.style.left)).toBeCloseTo(500, 3)
    expect(parseFloat(smear.style.top)).toBeCloseTo(400, 3)
    expect(parseFloat(smear.style.opacity)).toBeCloseTo(splatOpacity(COMET_FLIGHT_SECONDS), 6)
  })

  // A joiner is handed up to 32 at once. Thirty-two comets is a
  // stampede, so what was already on the glass stays on the glass.
  it('never flies a seeded splat, however fresh the hub says it is', () => {
    const ring = new TapeRing()
    ring.seed(Array.from({ length: 32 }, (_, i) => splat({ seq: i + 1, ts: NOW })))
    tapeWall.draw(ring.splats, view())
    expect(shown()).toHaveLength(32)
    expect(comets()).toEqual([])
    expect(smears()).toEqual([])
    expect(shown().every(e => e.dataset.role === 'residue')).toBe(true)
    // The control: one live event in the same ring does fly.
    ring.add(splat({ seq: 99, ts: NOW }))
    tapeWall.draw(ring.splats, view())
    expect(comets().length).toBeGreaterThan(0)
    expect(smears()).toHaveLength(1)
  })

  it('retires the last smear as soon as the next comet sails in', () => {
    const ring = flying({ seq: 1 })
    land(ring)
    expect(smears().map(e => e.dataset.seq)).toEqual(['1'])
    // The next event launches; the glass belongs to it from that frame,
    // not from the frame it lands on.
    ring.add(splat({ seq: 2, ts: NOW + COMET_FLIGHT_SECONDS }))
    tapeWall.draw(ring.splats, view({ now: NOW + COMET_FLIGHT_SECONDS }))
    // The wall reads as one live impact: the older event is residue on
    // the glass, still there and no longer shouting.
    expect(smears().map(e => e.dataset.seq)).toEqual(['2'])
    expect(shown().map(e => e.dataset.role)).toEqual(['residue', 'smear'])
  })

  it('fades a smear back to residue after a few seconds on its own', () => {
    const ring = flying({ seq: 1 })
    const impact = NOW + COMET_FLIGHT_SECONDS
    land(ring)
    // The control: still the live impact a moment before it times out.
    tapeWall.draw(ring.splats, view({ now: impact + SMEAR_SECONDS - 0.1 }))
    expect(smears()).toHaveLength(1)
    tapeWall.draw(ring.splats, view({ now: impact + SMEAR_SECONDS }))
    expect(smears()).toEqual([])
    expect(shown().map(e => e.dataset.role)).toEqual(['residue'])
    expect(shown()[0].textContent).toContain('GET /c')
  })

  it('skips the flight entirely for a reader who asked for less motion', () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query.includes('reduced-motion') })) as unknown as typeof window.matchMedia
    vi.stubGlobal('matchMedia', matchMedia)
    const ring = flying({ seq: 1, wall: 0, u: 0.5, v: 0.125 })
    tapeWall.draw(ring.splats, view())
    // Not a shorter flight: no comet at all, and the data is on the
    // glass on the first frame rather than a second and a half later.
    expect(comets()).toEqual([])
    const smear = smears()[0]
    expect(parseFloat(smear.style.opacity)).toBeCloseTo(1, 6)
    expect(parseFloat(smear.style.left)).toBeCloseTo(500, 3)
    expect(smear.style.transform).toBe('translate(-50%, -50%)')
    vi.unstubAllGlobals()
  })

  // The comet is once per event. A tab left in the background pauses the
  // frames while the socket keeps filling the ring, and a room cycled
  // away and back rebuilds every element: neither is thirty-two arrivals.
  it('flies an event once, and never one that landed while nobody was watching', () => {
    const ring = flying({ seq: 1 })
    tapeWall.draw(ring.splats, view())
    expect(comets().length).toBeGreaterThan(0)
    // Out of the room and back: it is already on the glass.
    tapeWall.draw([], view())
    tapeWall.draw(ring.splats, view())
    expect(comets()).toEqual([])
    expect(shown().map(e => e.dataset.role)).toEqual(['residue'])

    // Minutes old on its first frame: it was live on the wire, but
    // nothing about it is arriving now.
    ring.add(splat({ seq: 2, ts: NOW - 120 }))
    tapeWall.draw(ring.splats, view())
    expect(comets()).toEqual([])
    expect(smears()).toEqual([])
    // The control: one that landed just now still flies.
    ring.add(splat({ seq: 3, ts: NOW }))
    tapeWall.draw(ring.splats, view())
    expect(comets().length).toBeGreaterThan(0)
  })

  // A room with no glass has nothing to splat against; the hook hands
  // the wall an empty list for one, mid-flight or not.
  it('draws nothing at all for a room without glass', () => {
    const ring = flying({ seq: 1 })
    tapeWall.draw(ring.splats, view())
    expect(container.children.length).toBeGreaterThan(0)
    tapeWall.draw([], view({ now: NOW + COMET_FLIGHT_SECONDS / 2 }))
    expect(container.children).toHaveLength(0)
  })

  it('smears the whole event on the glass: the context, the token and both predictors', () => {
    const ring = flying({ seq: 1, context: ['GET /a', 'GET /b'], actual: 'GET /c', bigram: { token: 'GET /d', p: 0.42 }, net: { token: 'GET /e', p: 0.31 } })
    land(ring)
    const smear = smears()[0]
    const parts = (name: string) => [...smear.querySelectorAll(`[data-part="${name}"]`)].map(e => e.textContent)
    expect(parts('context')).toEqual(['GET /a', 'GET /b'])
    expect(parts('token')).toEqual(['GET /c'])
    expect(smear.querySelector('[data-predictor="bigram"]')?.textContent).toContain('GET /d')
    expect(smear.querySelector('[data-predictor="net"]')?.textContent).toContain('GET /e')
    // Residue is the quiet version of the same event: the token and the
    // verdict, without the readout.
    tapeWall.draw(ring.splats, view({ now: NOW + COMET_FLIGHT_SECONDS + SMEAR_SECONDS }))
    expect(shown()[0].querySelectorAll('[data-part="context"]')).toHaveLength(0)
    expect(shown()[0].querySelector('[data-part="token"]')?.textContent).toBe('GET /c')
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

  // Colour alone is not a reading of the verdict, on the residue or on
  // the smear.
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
    land(flying({ seq: 5, verdict: 'quorum-drift' }))
    expect(smears()[0].querySelector('[data-part="verdict"]')?.textContent).toBe('quorum-drift')
    expect(smears()[0].style.color).toBe(asCss(VERDICT_COLOURS.neutral))
  })

  it('keeps ~32 token strings out of a screen reader and shrinks them at phone width', () => {
    expect(container.getAttribute('aria-hidden')).toBe('true')
    tapeWall.draw(seeded(splat({ seq: 1 })), view({ width: 900 }))
    expect(shown()[0].style.fontSize).toBe('10px')
    tapeWall.draw(seeded(splat({ seq: 1 })), view({ width: 1400 }))
    expect(shown()[0].style.fontSize).toBe('13px')
    // The smear is the loud one, and shrinks on the same breakpoint.
    const ring = flying({ seq: 2 })
    land(ring, { width: 900 })
    const phone = parseFloat(smears()[0].style.fontSize)
    tapeWall.draw(ring.splats, view({ width: 1400, now: NOW + COMET_FLIGHT_SECONDS }))
    const desktop = parseFloat(smears()[0].style.fontSize)
    expect(phone).toBeLessThan(desktop)
    expect(desktop).toBeGreaterThan(13)
    // A dark plate under the text of both, over bright glass.
    expect(smears()[0].style.background).toContain('rgba(0, 0, 0')
    expect(shown()[0].style.background).toContain('rgba(0, 0, 0')
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
    expect(container.children).toHaveLength(0)
    // Mid-flight too: the hook clears the wall on teardown, and the
    // container outlives it.
    const flight = flying({ seq: 9 })
    tapeWall.draw(flight.splats, view())
    expect(comets().length).toBeGreaterThan(0)
    tapeWall.clear()
    expect(container.children).toHaveLength(0)
  })
})
