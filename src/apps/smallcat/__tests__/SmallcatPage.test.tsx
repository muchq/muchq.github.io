import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SmallcatPage from '../pages/SmallcatPage'
import { HEIGHT, PADDLE_HEIGHT } from '../pong'

const SHIPPED = Object.keys(import.meta.glob('/public/audio/smallcat/*.wav'))

// Every 2D call is a no-op except the two a test reads back: fillText, for
// the paused screen's words, and our red paddle's fillRect, for where it is.
const fakeContext = () => {
  const text: string[] = []
  const ours: number[] = []
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, prop) => {
      if (prop === 'fillText') return (line: string) => text.push(line)
      if (prop === 'fillRect')
        return (_x: number, y: number) => {
          if (target.fillStyle === 'red') ours.push(y)
        }
      return target[prop as string] ?? (() => {})
    },
    set: (target, prop, value) => ((target[prop as string] = value), true),
  })
  return { ctx, text, ours }
}

interface FakeAudio {
  src: string
  muted: boolean
  played: boolean[]
  paused: boolean
}

const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document) => {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init })
  target.dispatchEvent(event)
  return event.defaultPrevented
}

const release = (key: string) => document.dispatchEvent(new KeyboardEvent('keyup', { key }))

describe('SmallcatPage', () => {
  let frames: FrameRequestCallback[]
  let text: string[]
  let ours: number[]
  let sounds: FakeAudio[]

  beforeEach(() => {
    frames = []
    sounds = []
    const fake = fakeContext()
    text = fake.text
    ours = fake.ours
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake.ctx as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 0, height: HEIGHT } as DOMRect)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => frames.push(cb))
    vi.spyOn(window, 'Audio').mockImplementation(function (src?: string) {
      const sound: FakeAudio & Record<string, unknown> = {
        src: src ?? '',
        muted: false,
        played: [],
        paused: true,
        play() {
          sound.played.push(sound.muted)
          sound.paused = false
          return Promise.resolve()
        },
        pause() {
          sound.paused = true
        },
      }
      sounds.push(sound)
      return sound as unknown as HTMLAudioElement
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const tick = () => frames.shift()?.(0)
  const ticks = (n: number) => {
    for (let i = 0; i < n; i++) tick()
  }
  const paddle = () => ours[ours.length - 1]
  const court = () => screen.getByRole('img')

  const mount = () =>
    render(
      <MemoryRouter>
        <SmallcatPage />
      </MemoryRouter>
    )

  it('waits on the start screen until space', () => {
    mount()
    tick()
    expect(text).toEqual(['Space or tap to start!'])
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

  it('leaves space to a focused button', () => {
    mount()
    const button = document.createElement('button')
    document.body.appendChild(button)
    expect(press(' ', {}, button)).toBe(false)
    tick()
    expect(text).toEqual(['Space or tap to start!'])
    button.remove()
  })

  it('a held space toggles once', () => {
    mount()
    press(' ')
    press(' ', { repeat: true })
    tick()
    expect(text).toEqual([])
  })

  it('drives our paddle toward a touch', () => {
    mount()
    tick()
    const start = paddle()
    fireEvent.touchStart(court(), { touches: [{ clientY: HEIGHT }] })
    ticks(3)
    expect(paddle()).toBeGreaterThan(start)
  })

  it('keeps chasing while a second finger stays down', () => {
    mount()
    fireEvent.touchStart(court(), { touches: [{ clientY: HEIGHT }] })
    ticks(2)
    fireEvent.touchEnd(court(), { touches: [{ clientY: HEIGHT }] })
    const before = paddle()
    ticks(2)
    expect(paddle()).toBeGreaterThan(before)
  })

  // Otherwise a lost keyup or a cancelled touch leaves it sliding.
  it.each([
    ['the window loses focus', () => fireEvent.blur(window)],
    ['the touch is cancelled', () => fireEvent.touchCancel(court(), { touches: [] })],
  ])('stops our paddle when %s', (_, interrupt) => {
    mount()
    press(' ')
    press('ArrowDown')
    ticks(2)
    interrupt()
    tick()
    const stopped = paddle()
    ticks(2)
    expect(paddle()).toBe(stopped)
    release('ArrowDown')
  })

  it('never lets our paddle off the court', () => {
    mount()
    press(' ')
    press('ArrowDown')
    ticks(60)
    expect(paddle()).toBe(HEIGHT - PADDLE_HEIGHT)
  })

  // The sounds are vendored from smallcat.dog; nothing else serves them.
  it('asks only for sounds the site ships', () => {
    mount()
    expect(sounds).toHaveLength(4)
    for (const { src } of sounds) expect(SHIPPED).toContain(`/public${src}`)
  })

  // iOS only lets a sound play from the game loop once a gesture has
  // started it.
  it('unlocks every sound, silently, on the first gesture', async () => {
    mount()
    press(' ')
    press(' ')
    expect(sounds.map(sound => sound.played)).toEqual(sounds.map(() => [true]))
    await vi.waitFor(() => expect(sounds.every(sound => !sound.muted && sound.paused)).toBe(true))
  })

  it('silences the sounds on the way out', () => {
    const { unmount } = mount()
    for (const sound of sounds) sound.paused = false
    unmount()
    expect(sounds.every(sound => sound.paused)).toBe(true)
  })
})
