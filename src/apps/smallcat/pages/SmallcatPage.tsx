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

    const onKey = (pressed: boolean) => (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') input.up = pressed
      else if (e.key === 'ArrowDown') input.down = pressed
      else if (e.key === ' ' && pressed) togglePause(game)
      else return
      e.preventDefault()
    }
    const onKeyDown = onKey(true)
    const onKeyUp = onKey(false)

    // Chase the finger with our paddle's middle, in canvas coordinates.
    const onTouch = (e: TouchEvent) => {
      e.preventDefault()
      if (game.paused) togglePause(game)
      const rect = canvas.getBoundingClientRect()
      const y = ((e.touches[0].clientY - rect.top) * HEIGHT) / rect.height
      const mid = game.us.y + PADDLE_HEIGHT / 2
      input.down = y > mid
      input.up = y < mid
    }
    const onTouchEnd = () => {
      input.up = false
      input.down = false
    }

    let frame = 0
    const tick = () => {
      for (const event of step(game, input)) void sounds[event].play().catch(() => {})
      draw(ctx, game)
      frame = requestAnimationFrame(tick)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('touchstart', onTouch, { passive: false })
    canvas.addEventListener('touchmove', onTouch, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('touchstart', onTouch)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchend', onTouchEnd)
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
        aria-label="Pong: arrow keys move the red paddle, space pauses"
      />
    </div>
  )
}

export default SmallcatPage
