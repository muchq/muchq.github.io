import { useEffect, useRef } from 'react'
import Navigation from '@/shared/components/Navigation'
import NavTagline from '@/shared/components/nav/NavTagline'
import { HEIGHT, PADDLE_HEIGHT, WIDTH, draw, newGame, step, togglePause, type PongEvent } from '../pong'
import styles from './SmallcatPage.module.css'

const SOUNDS: Record<PongEvent, string> = {
  weHit: 'boo',
  theyHit: 'ping',
  weScored: 'woo',
  theyScored: 'mah',
}

// Keys pressed on these belong to them, not the game.
const INTERACTIVE = 'a, button, input, select, textarea, [contenteditable]'

const SmallcatPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const game = newGame()
    const input = { up: false, down: false }
    const sounds = Object.fromEntries(
      Object.entries(SOUNDS).map(([event, name]) => [event, new Audio(`/audio/smallcat/${name}.wav`)])
    ) as Record<PongEvent, HTMLAudioElement>

    // iOS plays a sound from the game loop only once a gesture has
    // started it, so the first gesture starts each one, muted.
    let unlocked = false
    const unlock = () => {
      if (unlocked) return
      unlocked = true
      for (const sound of Object.values(sounds)) {
        sound.muted = true
        sound
          .play()
          .then(() => {
            sound.pause()
            sound.currentTime = 0
          })
          .catch(() => {})
          .finally(() => {
            sound.muted = false
          })
      }
    }

    const stop = () => {
      input.up = false
      input.down = false
    }

    const onKey = (pressed: boolean) => (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return
      if (e.key === 'ArrowUp') input.up = pressed
      else if (e.key === 'ArrowDown') input.down = pressed
      else if (e.key !== ' ') return
      e.preventDefault()
      if (e.key === ' ' && pressed && !e.repeat) {
        unlock()
        togglePause(game)
      }
    }
    const onKeyDown = onKey(true)
    const onKeyUp = onKey(false)

    // Chase the finger with our paddle's middle, in canvas coordinates.
    const aim = (touch: Touch) => {
      const rect = canvas.getBoundingClientRect()
      const y = ((touch.clientY - rect.top) * HEIGHT) / rect.height
      const mid = game.us.y + PADDLE_HEIGHT / 2
      input.down = y > mid
      input.up = y < mid
    }
    const onTouch = (e: TouchEvent) => {
      e.preventDefault()
      unlock()
      if (game.paused) togglePause(game)
      aim(e.touches[0])
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) aim(e.touches[0])
      else stop()
    }

    let frame = 0
    const tick = () => {
      for (const event of step(game, input)) void sounds[event].play().catch(() => {})
      draw(ctx, game)
      frame = requestAnimationFrame(tick)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', stop)
    canvas.addEventListener('touchstart', onTouch, { passive: false })
    canvas.addEventListener('touchmove', onTouch, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('touchcancel', stop)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', stop)
      canvas.removeEventListener('touchstart', onTouch)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', stop)
      for (const sound of Object.values(sounds)) sound.pause()
    }
  }, [])

  return (
    <div className={styles.container}>
      <Navigation appName="Smallcat" context={<NavTagline text="Pong" />} />
      <canvas
        ref={canvasRef}
        className={styles.court}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label="Pong court. You are the red paddle on the right."
      />
      <p className={styles.controls}>↑ ↓ to move · Space to pause · or drag on the court</p>
    </div>
  )
}

export default SmallcatPage
