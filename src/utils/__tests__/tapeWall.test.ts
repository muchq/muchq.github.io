import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { COMET_DOT_PX, COMET_MAX_PX, SMEAR_FLOOR_SECONDS, SMEAR_SECONDS, TapeWall, type TapeView } from '../tapeWall'
import { TAPE_FADE_SECONDS, TapeRing, VERDICT_COLOURS, splatOpacity, splatPoint, type TapeSplat } from '../tapeSplats'
import { COMET_FLIGHT_SECONDS, cometAt } from '../tapeComet'
import { projectToNdc, type Vec3 } from '../projection'
import { splat } from '@/test/fakeTape'

// The splats as the page draws them: a live event flies in as a comet
// and smears on impact, everything else is residue already on the glass,
// all of it projected through the same camera the ray tracer casts from.

const NOW = 1_700_000_000
const GLASS = 'rgb(77, 230, 255)'

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
  edge: GLASS,
  now: NOW,
  ...over,
  // Most tests move one clock and mean both; the two only come apart
  // where the point is that they can.
  clock: over.clock ?? over.now ?? NOW,
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
  // The plate is the inner node: it carries the look and the smear's own
  // transform, so the outer can be moved every frame without restarting
  // that transition.
  const plate = (element: HTMLElement) => element.firstElementChild as HTMLElement
  const comets = () => [...container.querySelectorAll<HTMLElement>('[data-comet]')]
  const head = () => comets().find(e => e.dataset.comet === 'head')!
  const smears = () => shown().filter(e => e.dataset.role === 'smear')
  // Where a node was put, read back off the transform that put it there.
  const at = (element: HTMLElement) => {
    const found = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(element.style.transform)
    return found ? { left: parseFloat(found[1]), top: parseFloat(found[2]) } : null
  }
  const dotSize = (element: HTMLElement) => {
    const found = /scale\(([\d.]+)\)/.exec(element.style.transform)
    return (found ? parseFloat(found[1]) : 1) * COMET_DOT_PX
  }
  // What a dot actually puts on the screen, read off the element: the
  // glow reaches its blur plus its spread past every edge of the box,
  // and rides the same transform the box does.
  const paintedSize = (element: HTMLElement) => {
    const glow = /^\S+ \S+ ([\d.]+)px ([\d.]+)px/.exec(element.style.boxShadow)
    const reach = glow ? parseFloat(glow[1]) + parseFloat(glow[2]) : 0
    return dotSize(element) + 2 * reach * (dotSize(element) / COMET_DOT_PX)
  }
  // jsdom writes a colour back in its own notation; compare through it
  // rather than pinning the notation.
  const asCss = (colour: string) => {
    const probe = document.createElement('div')
    probe.style.color = colour
    return probe.style.color
  }
  // The plate's own 2x2, read back off the transform that set it. Its
  // columns are the wall's two directions as the camera sees them, so
  // everything about how a splat sits on the glass is in these four
  // numbers: scale, shear, foreshortening, and whether the text faces
  // the reader or is mirrored.
  const basisOf = (element: HTMLElement) => {
    const m = /matrix\(([-\d.e+, ]+)\)/.exec(element.style.transform)
    if (!m) return null
    const [a, b, c, d] = m[1].split(',').map(n => parseFloat(n))
    return { a, b, c, d, det: a * d - b * c, em: Math.hypot(c, d) }
  }

  const seeded = (...splats: TapeSplat[]) => {
    const ring = new TapeRing(() => NOW)
    ring.seed(splats)
    return ring.splats
  }
  // A ring on the test's own clock: the wall asks when this client
  // received a splat, never when the hub says it scored it.
  const ring = (arrivedAt = NOW) => new TapeRing(() => arrivedAt)
  const flying = (over: Partial<TapeSplat> = {}) => {
    const held = ring()
    held.add(splat({ ts: NOW, ...over }))
    return held
  }
  // A live event, flown in: the frame it arrives on and the frame it
  // lands on, since a comet is only a smear once it has hit.
  const land = (held: TapeRing, over: Partial<TapeView> = {}) => {
    tapeWall.draw(held.splats, view({ ...over, now: NOW }))
    tapeWall.draw(held.splats, view({ ...over, now: NOW + COMET_FLIGHT_SECONDS }))
  }
  // Where a world point lands on this view's screen.
  const onScreen = (point: Vec3, of = view()) => {
    const p = projectToNdc(point, of.cameraPos, of.cameraTarget, of.aspect, of.cameraUp)!
    return { left: (p.x + 1) * 0.5 * of.width, top: (1 - p.y) * 0.5 * of.height }
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
    // Straight ahead on the -z wall: the middle of the screen, at the
    // height the camera looks at.
    expect(at(shown()[0])!.left).toBeCloseTo(500, 3)
    expect(at(shown()[0])!.top).toBeCloseTo(400, 3)
    // Half the wall to the right of the middle lands right of centre.
    tapeWall.draw(seeded(splat({ seq: 2, wall: 0, u: 0.75, v: 0.125 })), view())
    expect(at(shown()[0])!.left).toBeGreaterThan(500)
  })

  // Position is written every frame; the smear's stretch is not. They
  // live on different nodes so the transition on one cannot restart from
  // the other, and opacity is never transitioned at all — it is rewritten
  // from the clock every frame, and a transition on it leaves a splat
  // that passed behind the camera fading in place at the edge of screen.
  it('transitions the plate alone, and only its transform', () => {
    const held = flying({ seq: 1 })
    held.seed([splat({ seq: 2 })])
    land(held)
    const live = plate(smears()[0])
    const still = plate(shown().find(e => e.dataset.role === 'residue')!)
    for (const node of [live, still]) {
      expect(node.style.transitionProperty).toBe('transform')
      expect(node.style.transition).not.toContain('opacity')
      expect(node.style.transition).not.toContain('all')
    }
    expect(smears()[0].style.transition).toBe('')
  })

  it('hides a splat on a wall behind the camera', () => {
    tapeWall.draw(seeded(splat({ seq: 1, wall: 2, u: 0.5, v: 0.5 })), view())
    expect(shown()[0].style.opacity).toBe('0')
    // The control: the same splat on the wall the camera faces is drawn.
    tapeWall.draw(seeded(splat({ seq: 2, wall: 0, u: 0.5, v: 0.5 })), view())
    expect(parseFloat(shown()[0].style.opacity)).toBeGreaterThan(0)
  })

  it('fades a splat by its age, so a minutes-old ring is not a live wall', () => {
    const held = ring()
    held.seed([splat({ seq: 1, ts: NOW }), splat({ seq: 2, ts: NOW - TAPE_FADE_SECONDS / 2 }), splat({ seq: 3, ts: NOW - 60 * 60 })])
    tapeWall.draw(held.splats, view())
    const [fresh, middling, old] = shown().map(e => parseFloat(e.style.opacity))
    expect(fresh).toBeCloseTo(1, 6)
    expect(middling).toBeCloseTo(splatOpacity(TAPE_FADE_SECONDS / 2), 6)
    // All the way off, not down to a floor: thirty-two splats that can
    // never leave is the ghost-filled room this replaced.
    expect(old).toBe(0)
    // And it keeps fading as the clock moves, without a new splat.
    tapeWall.draw(held.splats, view({ now: NOW + TAPE_FADE_SECONDS / 2 }))
    expect(parseFloat(shown()[0].style.opacity)).toBeCloseTo(middling, 6)
  })

  // The flight itself is tapeComet's; what the wall owes is that the
  // head is drawn where that function puts it, and that the thing ends
  // on the hub's point rather than near it.
  it('flies a live event in as a comet and lands it where the hub put it', () => {
    const event = splat({ seq: 1, wall: 0, u: 0.5, v: 0.125, ts: NOW })
    const held = ring()
    held.add(event)
    tapeWall.draw(held.splats, view())
    expect(comets().length).toBeGreaterThan(0)
    // Nothing is on the glass yet: the data arrives with the comet.
    expect(shown()[0].dataset.role).toBe('pending')
    expect(shown()[0].style.opacity).toBe('0')
    expect(smears()).toEqual([])

    const half = view({ now: NOW + COMET_FLIGHT_SECONDS / 2 })
    tapeWall.draw(held.splats, half)
    const expected = onScreen(cometAt(event, half.wall, 0.5), half)
    expect(at(head())!.left).toBeCloseTo(expected.left, 3)
    expect(at(head())!.top).toBeCloseTo(expected.top, 3)
    // Out there, not on the glass.
    expect(at(head())!.left).not.toBeCloseTo(500, 1)

    const landed = view({ now: NOW + COMET_FLIGHT_SECONDS })
    tapeWall.draw(held.splats, landed)
    expect(comets()).toEqual([])
    expect(onScreen(splatPoint(event, landed.wall), landed)).toEqual({ left: 500, top: 400 })
    expect(at(smears()[0])!.left).toBeCloseTo(500, 3)
    expect(at(smears()[0])!.top).toBeCloseTo(400, 3)
    expect(parseFloat(smears()[0].style.opacity)).toBeCloseTo(splatOpacity(COMET_FLIGHT_SECONDS), 6)
  })

  // A dot of fixed world size grows as it closes, and a head a metre
  // from the camera would otherwise be a white disc wider than the
  // screen: a full-screen flash on every impact you stand next to.
  it('grows the head as it closes, and never past the cap', () => {
    const event = splat({ seq: 1, wall: 0, u: 0.5, v: 0.125, ts: NOW })
    const held = ring()
    held.add(event)
    tapeWall.draw(held.splats, view())
    const far = dotSize(head())
    tapeWall.draw(held.splats, view({ now: NOW + COMET_FLIGHT_SECONDS * 0.9 }))
    expect(dotSize(head())).toBeGreaterThan(far)
    // Standing on the impact point, through the last of the flight.
    // Always built through `view`, never spread from one already built:
    // the clock a spread would carry over is the one it was built with,
    // and a comet drawn at t = 0 four times proves nothing.
    const near: Partial<TapeView> = { cameraPos: [0, 0, -48], cameraTarget: [0, 0, -50] }
    for (const step of [0.9, 0.96, 0.99, 0.999]) {
      tapeWall.draw(held.splats, view({ ...near, now: NOW + COMET_FLIGHT_SECONDS * step }))
      // The cap is on the flash, not on the hole in the middle of it.
      for (const dot of comets()) expect(paintedSize(dot)).toBeLessThanOrEqual(COMET_MAX_PX)
    }
    // The trail thins and fades behind the head.
    tapeWall.draw(held.splats, view({ now: NOW + COMET_FLIGHT_SECONDS * 0.8 }))
    const tail = comets().slice(1)
    expect(tail.length).toBeGreaterThan(1)
    for (let i = 1; i < tail.length; i++) {
      expect(parseFloat(tail[i].style.opacity)).toBeLessThan(parseFloat(tail[i - 1].style.opacity))
      expect(dotSize(tail[i])).toBeLessThan(dotSize(tail[i - 1]))
    }
    // The room's own colour reaches the head through the view, not
    // through an import of the room catalogue.
    expect(head().style.background).toBe(asCss(GLASS))
  })

  // deja's ts is the hub's clock. A client running ahead of it would
  // read every live event as history: no comet, no smear, feature dead,
  // and every seq remembered so it can never recover.
  it('flies by when this client got the splat, not by the hub clock', () => {
    const skewed = ring(NOW)
    skewed.add(splat({ seq: 1, ts: NOW - 30 }))
    tapeWall.draw(skewed.splats, view())
    expect(comets().length).toBeGreaterThan(0)
    // The control: one this client received minutes ago — a tab in the
    // background, frames paused while the socket filled the ring — is
    // history however fresh the hub's own reading of it looks.
    const stale = ring(NOW - 120)
    stale.add(splat({ seq: 2, ts: NOW }))
    tapeWall.draw(stale.splats, view())
    expect(comets()).toEqual([])
    expect(smears()).toEqual([])
  })

  // A joiner is handed up to 32 at once. Thirty-two comets is a
  // stampede, so what was already on the glass stays on the glass.
  it('never flies a seeded splat, however fresh the hub says it is', () => {
    const held = ring()
    held.seed(Array.from({ length: 32 }, (_, i) => splat({ seq: i + 1, ts: NOW })))
    tapeWall.draw(held.splats, view())
    expect(shown()).toHaveLength(32)
    expect(comets()).toEqual([])
    expect(smears()).toEqual([])
    expect(shown().every(e => e.dataset.role === 'residue')).toBe(true)
    // The control: one live event in the same ring does fly.
    held.add(splat({ seq: 99, ts: NOW }))
    tapeWall.draw(held.splats, view())
    expect(comets().length).toBeGreaterThan(0)
    expect(shown().filter(e => e.dataset.role === 'pending').map(e => e.dataset.seq)).toEqual(['99'])
  })

  // Two events between two frames is two comets, one after the other.
  // Dropping the older one would throw its readout away unseen.
  it('queues arrivals that share a frame and flies them in turn', () => {
    const held = ring()
    held.add(splat({ seq: 1, ts: NOW }))
    held.add(splat({ seq: 2, ts: NOW }))
    land(held)
    expect(smears().map(e => e.dataset.seq)).toEqual(['1'])
    // The queued one is not on the glass yet — it has not hit.
    const queued = shown().find(e => e.dataset.seq === '2')!
    expect(queued.dataset.role).toBe('pending')
    expect(queued.style.opacity).toBe('0')
    const second = NOW + COMET_FLIGHT_SECONDS + SMEAR_FLOOR_SECONDS
    tapeWall.draw(held.splats, view({ now: second }))
    expect(comets().length).toBeGreaterThan(0)
    tapeWall.draw(held.splats, view({ now: second + COMET_FLIGHT_SECONDS }))
    expect(smears().map(e => e.dataset.seq)).toEqual(['2'])
  })

  it('retires the last smear when the next comet sails in, but not before it has been read', () => {
    const held = flying({ seq: 1 })
    land(held)
    expect(smears().map(e => e.dataset.seq)).toEqual(['1'])
    const impact = NOW + COMET_FLIGHT_SECONDS
    held.add(splat({ seq: 2, ts: impact }))
    // Arriving during the floor: the wall is still reading the last one,
    // so the new comet has not launched and the old smear stands.
    tapeWall.draw(held.splats, view({ now: impact + SMEAR_FLOOR_SECONDS - 0.1 }))
    expect(smears().map(e => e.dataset.seq)).toEqual(['1'])
    expect(comets()).toEqual([])
    // The floor is up: the comet launches and the glass is its.
    tapeWall.draw(held.splats, view({ now: impact + SMEAR_FLOOR_SECONDS }))
    expect(comets().length).toBeGreaterThan(0)
    expect(shown().map(e => e.dataset.role)).toEqual(['residue', 'pending'])
    tapeWall.draw(held.splats, view({ now: impact + SMEAR_FLOOR_SECONDS + COMET_FLIGHT_SECONDS }))
    expect(smears().map(e => e.dataset.seq)).toEqual(['2'])
    expect(shown().map(e => e.dataset.role)).toEqual(['residue', 'smear'])
  })

  it('fades a smear back to residue after a few seconds on its own', () => {
    const held = flying({ seq: 1 })
    const impact = NOW + COMET_FLIGHT_SECONDS
    land(held)
    // The control: still the live impact a moment before it times out.
    tapeWall.draw(held.splats, view({ now: impact + SMEAR_SECONDS - 0.1 }))
    expect(smears()).toHaveLength(1)
    tapeWall.draw(held.splats, view({ now: impact + SMEAR_SECONDS }))
    expect(smears()).toEqual([])
    expect(shown().map(e => e.dataset.role)).toEqual(['residue'])
    expect(shown()[0].textContent).toContain('GET /c')
    expect(SMEAR_FLOOR_SECONDS).toBeLessThan(SMEAR_SECONDS)
  })

  it('skips the flight entirely for a reader who asked for less motion', () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query.includes('reduced-motion') })) as unknown as typeof window.matchMedia
    vi.stubGlobal('matchMedia', matchMedia)
    const held = flying({ seq: 1, wall: 0, u: 0.5, v: 0.125 })
    tapeWall.draw(held.splats, view())
    // Not a shorter flight: no comet at all, and the data is on the
    // glass on the first frame rather than a second and a half later.
    expect(comets()).toEqual([])
    expect(parseFloat(smears()[0].style.opacity)).toBeCloseTo(1, 6)
    expect(at(smears()[0])!.left).toBeCloseTo(500, 3)
    expect(plate(smears()[0]).style.transform).toBe('none')
    vi.unstubAllGlobals()
  })

  // The comet is once per event. A tab left in the background pauses the
  // frames while the socket keeps filling the ring, and a room cycled
  // away and back rebuilds every element: neither is thirty-two arrivals.
  it('flies an event once, and never one that landed while nobody was watching', () => {
    const held = flying({ seq: 1 })
    tapeWall.draw(held.splats, view())
    expect(comets().length).toBeGreaterThan(0)
    // Out of the room and back: it is already on the glass.
    tapeWall.draw([], view())
    tapeWall.draw(held.splats, view())
    expect(comets()).toEqual([])
    expect(shown().map(e => e.dataset.role)).toEqual(['residue'])
    // The control: one that landed just now still flies.
    held.add(splat({ seq: 3, ts: NOW }))
    tapeWall.draw(held.splats, view())
    expect(comets().length).toBeGreaterThan(0)
  })

  // A room with no glass has nothing to splat against; the hook hands
  // the wall an empty list for one, mid-flight or not.
  it('draws nothing at all for a room without glass', () => {
    const held = flying({ seq: 1 })
    tapeWall.draw(held.splats, view())
    expect(container.children.length).toBeGreaterThan(0)
    tapeWall.draw([], view({ now: NOW + COMET_FLIGHT_SECONDS / 2 }))
    expect(container.children).toHaveLength(0)
  })

  it('smears the whole event on the glass: the context, the token and both predictors', () => {
    const held = flying({ seq: 1, context: ['GET /a', 'GET /b'], actual: 'GET /c', bigram: { token: 'GET /d', p: 0.42 }, net: { token: 'GET /e', p: 0.31 } })
    land(held)
    const smear = smears()[0]
    const parts = (name: string) => [...smear.querySelectorAll(`[data-part="${name}"]`)].map(e => e.textContent)
    expect(parts('context')).toEqual(['GET /a', 'GET /b'])
    expect(parts('token')).toEqual(['GET /c'])
    expect(smear.querySelector('[data-predictor="bigram"]')?.textContent).toContain('GET /d')
    expect(smear.querySelector('[data-predictor="net"]')?.textContent).toContain('GET /e')
    // Residue is the quiet version of the same event: the token and the
    // verdict, without the readout.
    tapeWall.draw(held.splats, view({ now: NOW + COMET_FLIGHT_SECONDS + SMEAR_SECONDS }))
    expect(shown()[0].querySelectorAll('[data-part="context"]')).toHaveLength(0)
    expect(shown()[0].querySelector('[data-part="token"]')?.textContent).toBe('GET /c')
  })

  // The wire bounds nothing about the lane, and a plate as wide as the
  // context pushes the token and the verdict off a phone screen.
  it('keeps a long context lane from running off the screen', () => {
    const lane = Array.from({ length: 12 }, (_, i) => `GET /path/number/${i}`)
    land(flying({ seq: 1, context: lane }))
    const smear = smears()[0]
    const chips = [...smear.querySelectorAll('[data-part="context"]')].map(e => e.textContent)
    expect(chips.length).toBeLessThan(lane.length)
    // The last few, not the first few: the lane that led here.
    expect(chips.at(-1)).toBe('GET /path/number/11')
    expect(plate(smear).style.maxWidth).not.toBe('')
    expect(plate(smear).style.overflow).toBe('hidden')
  })

  it('shows a predictor guess when there is one, and none when it led with the request', () => {
    const guess = () => shown()[0].querySelector<HTMLElement>('[data-part="guess"]')
    tapeWall.draw(seeded(splat({ seq: 1, actual: 'GET /c', bigram: { token: 'GET /d', p: 0.4 } })), view())
    expect(guess()?.textContent).toBe('GET /d')
    // Pale text, not the glass's own neon: the plate is lit from behind
    // and neon on neon is not contrast.
    expect(guess()!.style.color).toBe(asCss('#e9eeff'))
    expect(guess()!.style.color).not.toBe(asCss(GLASS))
    // The net's, when the bigram had none to offer.
    tapeWall.draw(seeded(splat({ seq: 2, actual: 'GET /c', bigram: undefined, net: { token: 'GET /e', p: 0.3 } })), view())
    expect(guess()?.textContent).toBe('GET /e')
    // Nothing to show: no gap between the guess and the request.
    tapeWall.draw(seeded(splat({ seq: 3, actual: 'GET /c', bigram: { token: 'GET /c', p: 0.9 } })), view())
    expect(guess()).toBeNull()
    // Nor when neither predictor had anything.
    tapeWall.draw(seeded(splat({ seq: 4, actual: 'GET /c', bigram: undefined, net: undefined })), view())
    expect(guess()).toBeNull()
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

  it('keeps ~32 token strings out of a screen reader, on a plate over the glass', () => {
    expect(container.getAttribute('aria-hidden')).toBe('true')
    const held = flying({ seq: 2 })
    land(held)
    // A dark plate under the text of both, over bright glass. The size
    // is no longer a breakpoint: it comes from the wall, so a splat is
    // small because it is far away and not because the screen is.
    expect(plate(smears()[0]).style.background).toContain('rgba(0, 0, 0')
    tapeWall.draw(seeded(splat({ seq: 1 })), view())
    expect(plate(shown()[0]).style.background).toContain('rgba(0, 0, 0')
  })

  // The data hit the glass and ran, but it has to be readable while it
  // does: a hard stretch is half a second of illegible headline.
  it('lands the smear stretched, and not so far that it cannot be read', () => {
    const held = flying({ seq: 1 })
    tapeWall.draw(held.splats, view())
    const stretch = /scaleX\(([\d.]+)\)/.exec(plate(shown()[0]).style.transform)
    expect(stretch).not.toBeNull()
    expect(parseFloat(stretch![1])).toBeGreaterThan(1)
    expect(parseFloat(stretch![1])).toBeLessThanOrEqual(1.5)
    tapeWall.draw(held.splats, view({ now: NOW + COMET_FLIGHT_SECONDS }))
    expect(plate(smears()[0]).style.transform).toBe('none')
  })

  it('takes down what the ring no longer holds, and everything on clear', () => {
    const held = ring()
    held.seed([splat({ seq: 1 }), splat({ seq: 2 })])
    tapeWall.draw(held.splats, view())
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

  // Reduced motion is not a shorter flight, and the comet is not the
  // only thing that moves. The plate's one transition is the smear, so a
  // queued arrival parked at the running transform plays that smear the
  // moment the glass comes free: the first event of a batch sat still
  // and every one behind it animated.
  it('leaves every plate settled under reduced motion, queued ones included', () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query.includes('reduced-motion') })) as unknown as typeof window.matchMedia
    vi.stubGlobal('matchMedia', matchMedia)
    const held = ring()
    for (const seq of [1, 2, 3]) held.add(splat({ seq }))
    const plates = () => shown().map(element => plate(element).style.transform)
    for (const step of [0, 0.5, SMEAR_FLOOR_SECONDS, SMEAR_FLOOR_SECONDS * 2 + 0.1, SMEAR_FLOOR_SECONDS * 3 + 0.2]) {
      tapeWall.draw(held.splats, view({ now: NOW + step }))
      expect(plates()).toEqual(['none', 'none', 'none'])
      expect(comets()).toEqual([])
    }
    vi.unstubAllGlobals()
  })

  // The plate has a max width and hides what overruns it, and a flex row
  // with no shrink policy hands the whole row to whatever comes first.
  // So a long enough path pushed the verdict past the edge and it was
  // the verdict that got cut, not the path. jsdom lays nothing out, so
  // what is checked is the policy itself.
  it('elides a long token rather than pushing the verdict off the plate', () => {
    const held = ring()
    held.add(splat({ seq: 1, actual: `GET /${'deep/'.repeat(120)}`, verdict: 'anomaly', bigram: { token: `GET /${'wide/'.repeat(120)}`, p: 0.1 } }))
    land(held)
    const policy = (role: string) => {
      const element = shown().find(e => e.dataset.role === role)!
      const part = (name: string) => element.querySelector<HTMLElement>(`[data-part="${name}"]`)!
      return {
        token: [part('token').style.minWidth, part('token').style.overflow, part('token').style.textOverflow],
        verdict: part('verdict').style.flex,
      }
    }
    expect(policy('smear')).toEqual({ token: ['0px', 'hidden', 'ellipsis'], verdict: '0 0 auto' })
    // And again once it is residue, which is a flex row of its own.
    tapeWall.draw(held.splats, view({ now: NOW + COMET_FLIGHT_SECONDS + SMEAR_SECONDS }))
    expect(policy('residue')).toEqual({ token: ['0px', 'hidden', 'ellipsis'], verdict: '0 0 auto' })
  })

  // Every deadline here was a wall-clock reading once. A correction
  // backwards mid-flight froze the comet in the air and wedged every
  // arrival queued behind it; one forwards skipped the flight outright.
  // Only the fade against deja's `ts` belongs on that clock.
  it('flies on the frame clock, not on the one an NTP correction moves', () => {
    const held = ring(0)
    held.add(splat({ seq: 1 }))
    held.add(splat({ seq: 2 }))
    tapeWall.draw(held.splats, view({ now: NOW, clock: 0 }))
    const early = dotSize(head())
    // The system clock jumps an hour backwards. The frame clock cannot.
    tapeWall.draw(held.splats, view({ now: NOW - 3600, clock: COMET_FLIGHT_SECONDS * 0.9 }))
    expect(dotSize(head())).toBeGreaterThan(early)
    // It lands and holds the glass for its floor, still on that clock.
    const landed = COMET_FLIGHT_SECONDS + SMEAR_FLOOR_SECONDS
    tapeWall.draw(held.splats, view({ now: NOW - 3600, clock: landed - 0.1 }))
    expect(smears().map(e => e.dataset.seq)).toEqual(['1'])
    // And the one queued behind it gets its turn on schedule.
    tapeWall.draw(held.splats, view({ now: NOW - 3600, clock: landed }))
    expect(shown().find(e => e.dataset.seq === '2')!.dataset.role).toBe('pending')
    expect(comets().length).toBeGreaterThan(0)
  })


  // A backgrounded tab stops the frames and not the socket. An event
  // that reached the ring while it was hidden is already read as
  // history; one that was queued before it went quiet was not, and flew
  // a minute late, because freshness was read on the way into the queue
  // and never again.
  it('drops what was queued across a gap in the frames', () => {
    const held = ring(0)
    for (const seq of [1, 2, 3]) held.add(splat({ seq }))
    tapeWall.draw(held.splats, view({ clock: 0 }))
    expect(comets().length).toBeGreaterThan(0)
    // Away for a minute, then back.
    tapeWall.draw(held.splats, view({ clock: 60 }))
    expect(comets()).toEqual([])
    expect(shown().map(e => e.dataset.role)).toEqual(['residue', 'residue', 'residue'])
    // The control is the test above: a lane that keeps drawing still
    // gives every queued arrival its turn.
  })


  // The data is painted on the glass, not held up on a placard facing
  // the camera. Its two axes are the pane's own axes projected, so a
  // wall seen square on is upright, one seen from the side is sheared
  // and foreshortened, and a far one is small because it is far.
  it('lies the plate in the pane rather than facing it at the camera', () => {
    const on = splat({ seq: 1, wall: 0, u: 0.5, v: 0.25 })
    // Dead ahead and level: upright and unsheared, reading left to
    // right and up the glass.
    tapeWall.draw(seeded(on), view())
    const square = basisOf(shown()[0])!
    expect(square.b).toBeCloseTo(0, 9)
    expect(square.c).toBeCloseTo(0, 9)
    expect(square.a).toBeGreaterThan(0)
    expect(square.d).toBeGreaterThan(0)

    // Tip the camera and the plate tips with the room. A placard held
    // facing the camera would stay square to the screen forever; this
    // is the whole difference.
    tapeWall.draw(seeded(on), view({ cameraUp: [0.6, 0.8, 0] }))
    const rolled = basisOf(shown()[0])!
    expect(Math.abs(rolled.b)).toBeGreaterThan(Math.abs(square.a) * 0.4)
    expect(Math.abs(rolled.c)).toBeGreaterThan(Math.abs(square.d) * 0.4)

    // Look down on it from above and the pane's up foreshortens while
    // its left-to-right, still square to the view, does not.
    tapeWall.draw(seeded(on), view({ cameraPos: [0, 30, 0], cameraTarget: [0, 2, -50] }))
    const pitched = basisOf(shown()[0])!
    expect(pitched.a / pitched.d).toBeGreaterThan((square.a / square.d) * 1.05)
  })

  it('never spells a token backwards, on any of the four panes', () => {
    // Standing in the middle of the room, turning to each wall in turn.
    const facing: Array<[number, [number, number, number]]> = [
      [0, [0, 0, -50]],
      [1, [50, 0, 0]],
      [2, [0, 0, 50]],
      [3, [-50, 0, 0]],
    ]
    for (const [wall, target] of facing) {
      tapeWall.draw(seeded(splat({ seq: 1, wall, u: 0.5, v: 0.25 })), view({ cameraPos: [0, 0, 0], cameraTarget: target }))
      const seen = basisOf(shown()[0])!
      expect({ wall, mirrored: seen.det <= 0 }).toEqual({ wall, mirrored: false })
    }
  })

  it('shrinks a splat with distance, and stops drawing one too small to read', () => {
    const near = view({ cameraPos: [0, 0, -40], cameraTarget: [0, 0, -50] })
    tapeWall.draw(seeded(splat({ seq: 1, wall: 0, u: 0.5, v: 0.25 })), near)
    const close = basisOf(shown()[0])!.em
    const far = view({ cameraPos: [0, 0, 45], cameraTarget: [0, 0, -50] })
    tapeWall.draw(seeded(splat({ seq: 1, wall: 0, u: 0.5, v: 0.25 })), far)
    expect(basisOf(shown()[0])!.em).toBeLessThan(close)
    // Far enough and it is a smudge, not a reading: the mess on the
    // glass was thirty-two of these at once.
    const distant = view({ cameraPos: [0, 0, 4000], cameraTarget: [0, 0, -50], width: 200, height: 160 })
    tapeWall.draw(seeded(splat({ seq: 1, wall: 0, u: 0.5, v: 0.25 })), distant)
    expect(shown()[0].style.opacity).toBe('0')
  })

})
