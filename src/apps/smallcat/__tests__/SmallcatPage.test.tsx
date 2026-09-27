import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SmallcatPage from '../pages/SmallcatPage'

const SHIPPED = Object.keys(import.meta.glob('/public/audio/smallcat/*.wav'))

// Every 2D call is a no-op that records fillText, so the paused screen's
// words are readable.
const fakeContext = () => {
  const text: string[] = []
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, prop) =>
      prop === 'fillText' ? (line: string) => text.push(line) : (target[prop as string] ?? (() => {})),
    set: (target, prop, value) => ((target[prop as string] = value), true),
  })
  return { ctx, text }
}

const press = (key: string) => {
  const event = new KeyboardEvent('keydown', { key, cancelable: true })
  document.dispatchEvent(event)
  return event.defaultPrevented
}

describe('SmallcatPage', () => {
  let frames: FrameRequestCallback[]
  let text: string[]

  beforeEach(() => {
    frames = []
    const fake = fakeContext()
    text = fake.text
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake.ctx as never)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => frames.push(cb))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const tick = () => frames.shift()?.(0)

  const mount = () =>
    render(
      <MemoryRouter>
        <SmallcatPage />
      </MemoryRouter>
    )

  it('waits on the start screen until space', () => {
    mount()
    tick()
    expect(text).toEqual(['Press Space (or touch) to Start!'])
    text.length = 0
    press(' ')
    tick()
    expect(text).toEqual([])
  })

  // Space and the arrows would scroll the page out from under the court.
  it('keeps the game keys from scrolling while mounted, and only then', () => {
    const { unmount } = mount()
    expect(press('ArrowUp')).toBe(true)
    expect(press('a')).toBe(false)
    unmount()
    expect(press('ArrowUp')).toBe(false)
  })

  // The sounds are vendored from smallcat.dog; nothing else serves them.
  it('asks only for sounds the site ships', () => {
    const sources: string[] = []
    vi.spyOn(window, 'Audio').mockImplementation(function (src?: string) {
      sources.push(src ?? '')
      return { play: () => Promise.resolve() } as HTMLAudioElement
    })
    mount()
    expect(sources).toHaveLength(4)
    for (const src of sources) expect(SHIPPED).toContain(`/public${src}`)
  })
})
