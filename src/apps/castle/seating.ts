// Seats around a round table, seen from above (muchq.github.io#304):
// the viewer at 6 o'clock, the others spread evenly around the rest of
// the circle in turn order, clockwise from the viewer. One other sits
// at 12; two at 10 and 2; three at 9, 12 and 3.

export type Side = 'bottom' | 'top' | 'left' | 'right'

export interface Seating {
  // Hour hand position, 1-12.
  clock: number
  // Which rim the seat is nearest: its hand goes on that side, its
  // castle toward the centre.
  side: Side
  // Centre of the seat, as a percentage of the ring.
  x: number
  y: number
}

const RADIUS = 40

export function seatAround(count: number, index: number): Seating {
  const angle = (180 + (360 * index) / count) % 360
  const radians = (angle * Math.PI) / 180
  const clock = Math.round(angle / 30) % 12 || 12
  const side: Side = index === 0 ? 'bottom' : angle >= 300 || angle <= 60 ? 'top' : angle < 180 ? 'right' : 'left'
  return {
    clock,
    side,
    x: Math.round(50 + RADIUS * Math.sin(radians)),
    y: Math.round(50 - RADIUS * Math.cos(radians))
  }
}

// The table in turn order from the viewer's chair; a viewer not seated
// (never, at a table they were dealt into) sees it from seat 0.
export function fromViewer<T extends { playerId: string }>(players: T[], viewer: string): T[] {
  const at = Math.max(0, players.findIndex(player => player.playerId === viewer))
  return [...players.slice(at), ...players.slice(0, at)]
}
