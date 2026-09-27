import { describe, expect, it } from 'vitest'
import { HEIGHT, PADDLE_HEIGHT, PADDLE_WIDTH, WIDTH, newGame, step, togglePause, type Pong } from '../pong'

const still = { up: false, down: false }

const playing = (): Pong => {
  const game = newGame()
  togglePause(game)
  return game
}

describe('pong', () => {
  it('waits for a start before anything moves', () => {
    const game = newGame()
    expect(step(game, { up: true, down: false })).toEqual([])
    expect(game.ball).toMatchObject({ x: WIDTH / 2, y: HEIGHT / 2 })
    expect(game.us.y).toBe((HEIGHT - PADDLE_HEIGHT) / 2)
  })

  it('moves our paddle and stops it at the wall', () => {
    const game = playing()
    for (let i = 0; i < 100; i++) step(game, { up: true, down: false })
    expect(game.us.y).toBe(0)
  })

  it('bounces off the floor', () => {
    const game = playing()
    Object.assign(game.ball, { x: WIDTH / 2, y: HEIGHT - game.ball.r, dx: 2, dy: 2 })
    step(game, still)
    expect(game.ball.dy).toBe(-2)
  })

  it('returns the ball off our paddle', () => {
    const game = playing()
    Object.assign(game.ball, { x: WIDTH - PADDLE_WIDTH - game.ball.r - 1, y: game.us.y + PADDLE_HEIGHT / 2, dx: 2, dy: 0 })
    expect(step(game, still)).toEqual(['weHit'])
    expect(game.ball.dx).toBeLessThan(0)
  })

  it('speeds up on the first return and every third after', () => {
    const game = playing()
    const speeds: number[] = []
    for (let i = 0; i < 4; i++) {
      Object.assign(game.ball, { x: WIDTH - PADDLE_WIDTH - game.ball.r - 1, y: game.us.y + PADDLE_HEIGHT / 2, dx: 2, dy: 0 })
      step(game, still)
      speeds.push(Math.abs(game.ball.dx))
    }
    expect(speeds).toEqual([3, 2, 2, 3])
  })

  it('a miss costs the other side a life, pauses, and re-serves', () => {
    const game = playing()
    Object.assign(game.ball, { x: game.ball.r, y: 0 + HEIGHT - 1, dx: -5, dy: 0 })
    game.them.y = 0
    expect(step(game, still)).toEqual(['weScored'])
    expect(game.them.lives).toBe(2)
    expect(game.paused).toBe(true)
    expect(game.message).toBe('continue')
    expect(game.ball).toMatchObject({ x: WIDTH / 2, y: HEIGHT / 2, dx: 2, dy: 2 })
  })

  it('the last life ends the match and restores everyone', () => {
    const game = playing()
    game.us.lives = 1
    Object.assign(game.ball, { x: WIDTH - game.ball.r, y: 0, dx: 5, dy: 0 })
    game.us.y = HEIGHT - PADDLE_HEIGHT
    expect(step(game, still)).toEqual(['theyScored'])
    expect(game.message).toBe('lost')
    expect([game.us.lives, game.them.lives]).toEqual([3, 3])
  })

  it('says paused, not the last point, when paused mid-rally', () => {
    const game = playing()
    game.message = 'won'
    togglePause(game)
    expect(game.message).toBe('paused')
  })

  it('keeps the green paddle on the court while it chases', () => {
    const game = playing()
    Object.assign(game.ball, { x: WIDTH / 2, y: game.ball.r + 1, dx: -1, dy: 0 })
    game.them.y = 0
    step(game, still)
    expect(game.them.y).toBe(0)
    Object.assign(game.ball, { x: WIDTH / 2, y: HEIGHT - game.ball.r - 1, dx: -1, dy: 0 })
    game.them.y = HEIGHT - PADDLE_HEIGHT
    step(game, still)
    expect(game.them.y).toBe(HEIGHT - PADDLE_HEIGHT)
  })

  it('spins the ball toward the edge of the paddle it came off', () => {
    const game = playing()
    Object.assign(game.ball, { x: WIDTH - PADDLE_WIDTH - game.ball.r - 1, y: game.us.y + 5, dx: 2, dy: 0 })
    step(game, still)
    expect(game.ball.dy).toBe(-2)
  })

  it('returns off their paddle too', () => {
    const game = playing()
    Object.assign(game.ball, { x: PADDLE_WIDTH + game.ball.r + 1, y: game.them.y + PADDLE_HEIGHT / 2, dx: -2, dy: 0 })
    expect(step(game, still)).toEqual(['theyHit'])
    expect(game.ball.dx).toBeGreaterThan(0)
  })

  // A paddle that slides over a ball already past its face must not trap
  // it into a hit every frame.
  it('only returns a ball that is heading into the paddle', () => {
    const game = playing()
    Object.assign(game.ball, { x: WIDTH - PADDLE_WIDTH - game.ball.r + 3, y: game.us.y + PADDLE_HEIGHT / 2, dx: -2, dy: 0 })
    expect(step(game, still)).toEqual([])
    expect(game.ball.dx).toBe(-2)
  })

  it('winning the match says so and resets the lives', () => {
    const game = playing()
    game.them.lives = 1
    Object.assign(game.ball, { x: game.ball.r, y: HEIGHT - 1, dx: -5, dy: 0 })
    game.them.y = 0
    step(game, still)
    expect(game.message).toBe('won')
    expect([game.us.lives, game.them.lives]).toEqual([3, 3])
  })
})

