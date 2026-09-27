// Pong, as it ran on smallcat.dog: we're the red paddle on the right, the
// green one on the left plays itself, three lives each.

export const WIDTH = 600
export const HEIGHT = 400
export const PADDLE_HEIGHT = 80
export const PADDLE_WIDTH = 7

const SERVE_DX = 2
const SERVE_DY = 2
const PLAYER_SPEED = 8
const LIVES = 3

interface Paddle {
  x: number
  y: number
  color: string
  lives: number
}

export interface Pong {
  ball: { x: number; y: number; dx: number; dy: number; r: number }
  us: Paddle
  them: Paddle
  bounces: number
  paused: boolean
  /** What the paused screen says */
  message: 'start' | 'continue' | 'won' | 'lost'
}

export interface Input {
  up: boolean
  down: boolean
}

export type PongEvent = 'weHit' | 'theyHit' | 'weScored' | 'theyScored'

const paddleStart = (HEIGHT - PADDLE_HEIGHT) / 2

const serve = (game: Pong) => {
  Object.assign(game.ball, { x: WIDTH / 2, y: HEIGHT / 2, dx: SERVE_DX, dy: SERVE_DY })
}

export const newGame = (): Pong => ({
  ball: { x: WIDTH / 2, y: HEIGHT / 2, dx: SERVE_DX, dy: SERVE_DY, r: 10 },
  us: { x: WIDTH - PADDLE_WIDTH, y: paddleStart, color: 'red', lives: LIVES },
  them: { x: 0, y: paddleStart, color: 'green', lives: LIVES },
  bounces: -1,
  paused: true,
  message: 'start',
})

export const togglePause = (game: Pong) => {
  game.paused = !game.paused
}

const moveUs = (game: Pong, { up, down }: Input) => {
  if (up && !down) game.us.y = Math.max(0, game.us.y - PLAYER_SPEED)
  if (down && !up) game.us.y = Math.min(HEIGHT - PADDLE_HEIGHT, game.us.y + PLAYER_SPEED)
}

// Drifts to center while the ball heads our way, chases it on the way back.
const moveThem = ({ ball, them }: Pong) => {
  const mid = them.y + PADDLE_HEIGHT / 2
  if (ball.dx > 0) {
    if (mid < HEIGHT / 2) them.y += 2
    else if (mid > HEIGHT / 2) them.y -= 2
  } else if (ball.y > mid) {
    if (ball.y - mid > 3) them.y += 4
  } else if (ball.y < mid) {
    them.y -= 4
  }
}

const within = (y: number, paddle: Paddle) => y >= paddle.y && y < paddle.y + PADDLE_HEIGHT

// Off the paddle's top or bottom third, the ball gains spin that way.
const english = (game: Pong, paddle: Paddle) => {
  if (game.ball.y < paddle.y + PADDLE_HEIGHT / 3) game.ball.dy -= 2
  else if (game.ball.y > paddle.y + (2 * PADDLE_HEIGHT) / 3) game.ball.dy += 2
}

const collide = (game: Pong): PongEvent[] => {
  const { ball } = game
  const events: PongEvent[] = []
  const weHit = ball.x + ball.r >= WIDTH - PADDLE_WIDTH && within(ball.y, game.us)
  const theyHit = ball.x - ball.r <= PADDLE_WIDTH && within(ball.y, game.them)
  if (weHit || theyHit) {
    ball.dx = -ball.dx
    ball.x += ball.dx
    english(game, weHit ? game.us : game.them)
    events.push(weHit ? 'weHit' : 'theyHit')
    if (++game.bounces % 3 === 0) ball.dx = Math.sign(ball.dx) * (Math.abs(ball.dx) + 1)
  }
  if (ball.y > HEIGHT - ball.r || ball.y < ball.r) ball.dy = -ball.dy
  return events
}

const score = (game: Pong): PongEvent | null => {
  const { ball } = game
  if (ball.x < ball.r) {
    game.them.lives--
    return 'weScored'
  }
  if (ball.x > WIDTH - ball.r) {
    game.us.lives--
    return 'theyScored'
  }
  return null
}

/** Advances one frame; returns what happened, for the sound to follow. */
export const step = (game: Pong, input: Input): PongEvent[] => {
  if (game.paused) return []
  moveUs(game, input)
  moveThem(game)
  game.ball.x += game.ball.dx
  game.ball.y += game.ball.dy
  const events = collide(game)
  const point = score(game)
  if (!point) return events
  game.paused = true
  game.message = game.them.lives === 0 ? 'won' : game.us.lives === 0 ? 'lost' : 'continue'
  if (game.message !== 'continue') {
    game.us.lives = LIVES
    game.them.lives = LIVES
  }
  serve(game)
  return [...events, point]
}

const MESSAGES: Record<Pong['message'], string[]> = {
  start: ['Press Space (or touch) to Start!'],
  continue: ['Press Space to Continue'],
  won: ['You Win!!', 'Press Space to Play Again'],
  lost: ['They Win...', 'Press Space to Play Again'],
}

const drawLife = (ctx: CanvasRenderingContext2D, x: number) => {
  const y = 20
  ctx.beginPath()
  ctx.arc(x, y, 15, 0, Math.PI * 2, true)
  ctx.moveTo(x + 5, y)
  ctx.arc(x, y, 10, 0, Math.PI, false)
  ctx.moveTo(x - 5, y - 5)
  ctx.arc(x - 5, y - 5, 4, 0, Math.PI * 2, true)
  ctx.moveTo(x + 5, y - 5)
  ctx.arc(x + 5, y - 5, 4, 0, Math.PI * 2, true)
  ctx.stroke()
}

export const draw = (ctx: CanvasRenderingContext2D, game: Pong) => {
  const { ball } = game
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  for (let i = 0; i < game.them.lives; i++) drawLife(ctx, 20 + 40 * i)
  for (let i = 0; i < game.us.lives; i++) drawLife(ctx, WIDTH - 20 - 40 * i)

  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
  ctx.strokeStyle = 'black'
  ctx.fillStyle = 'rgba(240, 90, 240, 1.0)'
  ctx.fill()
  ctx.stroke()

  for (const paddle of [game.us, game.them]) {
    ctx.fillStyle = paddle.color
    ctx.fillRect(paddle.x, paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT)
  }

  if (!game.paused) return
  ctx.fillStyle = 'black'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  MESSAGES[game.message].forEach((line, i) => ctx.fillText(line, WIDTH / 2, HEIGHT / 2 + 40 * i))
}
