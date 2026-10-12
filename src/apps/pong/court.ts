import { BOT_LEVELS, type PongCourt, type PongFrame, type PongVector } from './wire'

// The court on screen, in both of pong's layouts. smallcat's is flat and
// sideways: the ball travels left and right, and your end is on the
// right. The 3D one is seen from behind your end, looking down the tunnel
// at your opponent's. A watcher sees either from the second seat's side.

export type Seat = 0 | 1

export interface ScreenPoint {
  x: number
  y: number
}

export const viewSeat = (players: readonly string[], playerId: string): Seat => (players[0] === playerId ? 0 : 1)

// The flat court is drawn one pixel per court unit.
export const flatSize = (court: PongCourt): { width: number; height: number } => ({ width: court.depth, height: court.height })

// End 0 is at z = 0: on the right for its own seat, on the left otherwise.
export const flatPoint = (court: PongCourt, seat: Seat, point: { z: number; y: number }): ScreenPoint => ({
  x: seat === 0 ? court.depth - point.z : point.z,
  y: point.y
})

// The tunnel's canvas is 600 pixels across, its rim in proportion.
const TUNNEL_PIXELS = 600
// The eye sits this far behind its end, as a share of the court's depth:
// the far end then shows a third the size of the near one.
const EYE_BACK = 0.5

export const tunnelSize = (court: PongCourt): { width: number; height: number } => ({
  width: TUNNEL_PIXELS,
  height: (TUNNEL_PIXELS * court.height) / court.width
})

// Pixels per court unit at the near rim.
const rimScale = (court: PongCourt): number => TUNNEL_PIXELS / court.width

// A court point as seen from behind the seat's end, with the pixels per
// court unit at its depth.
export const project = (court: PongCourt, seat: Seat, point: PongVector): ScreenPoint & { scale: number } => {
  const size = tunnelSize(court)
  const eye = court.depth * EYE_BACK
  const ahead = (seat === 0 ? point.z : court.depth - point.z) + eye
  const across = seat === 0 ? point.x : court.width - point.x
  const scale = (rimScale(court) * eye) / ahead
  return {
    x: size.width / 2 + (across - court.width / 2) * scale,
    y: size.height / 2 + (point.y - court.height / 2) * scale,
    scale
  }
}

// A screen point back onto the seat's paddle plane, in court units.
export const unproject = (court: PongCourt, seat: Seat, point: ScreenPoint): { x: number; y: number } => {
  const size = tunnelSize(court)
  const eye = court.depth * EYE_BACK
  const scale = (rimScale(court) * eye) / (eye + court.inset)
  const across = (point.x - size.width / 2) / scale + court.width / 2
  return {
    x: seat === 0 ? across : court.width - across,
    y: (point.y - size.height / 2) / scale + court.height / 2
  }
}

// A client point in canvas pixels. The canvas is drawn contained in its
// box (object-fit), so a box capped in height letterboxes the court at
// its sides: the point is read through the court as drawn.
export const canvasPoint = (
  box: { left: number; top: number; width: number; height: number },
  size: { width: number; height: number },
  client: ScreenPoint
): ScreenPoint => {
  const scale = Math.min(box.width / size.width, box.height / size.height)
  return {
    x: (client.x - box.left - (box.width - size.width * scale) / 2) / scale,
    y: (client.y - box.top - (box.height - size.height * scale) / 2) / scale
  }
}

// Where a pointer at this canvas point asks the seat's paddle to go.
export const aimFor = (court: PongCourt, seat: Seat, point: ScreenPoint): { x: number; y: number } =>
  court.width === 0 ? { x: 0, y: point.y } : unproject(court, seat, point)

// Below this share of its reach a stick asks for nothing.
const STICK_DEADZONE = 0.3
// A component counts toward the direction past this share of the stick's
// lean: about 22.5° either side of each of eight directions.
const STICK_AXIS = 0.38

// Where a stick, leaning by `lean` (each axis -1 to 1, down and right
// positive on screen), runs the seat's paddle: the edge it points at, in
// eight directions. The flat court reads only up and down; from behind
// end 1, x runs right to left. Null near the centre.
export const stickTarget = (
  court: PongCourt,
  seat: Seat,
  lean: ScreenPoint,
  paddle: { x: number; y: number }
): { x: number; y: number } | null => {
  const reach = Math.hypot(lean.x, lean.y)
  if (reach < STICK_DEADZONE) return null
  const along = (value: number) => (Math.abs(value) >= STICK_AXIS * reach ? Math.sign(value) : 0)
  const across = court.width === 0 ? 0 : along(seat === 0 ? lean.x : -lean.x)
  const down = along(lean.y)
  if (across === 0 && down === 0) return null
  return {
    x: across === 0 ? paddle.x : across > 0 ? court.width : 0,
    y: down === 0 ? paddle.y : down > 0 ? court.height : 0
  }
}

// No further than a few dropped frames: past that the rally has likely
// moved on in a way the velocity doesn't know.
const EXTRAPOLATE_MS = 100

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value))

// The ball elapsedMs after its frame arrived.
export const extrapolate = (frame: PongFrame, court: PongCourt, elapsedMs: number): PongVector => {
  if (frame.serveIn > 0) return frame.ball
  const ticks = (Math.min(elapsedMs, EXTRAPOLATE_MS) * court.ticksPerSecond) / 1000
  const { ball, velocity } = frame
  return {
    x: clamp(ball.x + velocity.x * ticks, 0, court.width),
    y: clamp(ball.y + velocity.y * ticks, 0, court.height),
    z: clamp(ball.z + velocity.z * ticks, 0, court.depth)
  }
}

// smallcat's bots by their level; anyone else by their id.
export const pongName = (playerId: string): string => {
  const bot = /^smallcat@(\d)$/.exec(playerId)
  const level = bot === null ? undefined : BOT_LEVELS.find(entry => entry.level === Number(bot[1]))
  return level === undefined ? playerId : `smallcat bot (${level.label})`
}
