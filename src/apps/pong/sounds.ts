import type { PongFrame, PongView } from './wire'

// smallcat's four sounds, heard from what reaches the client: a hit is
// the ball turned back along the court, a miss a seat's lives dropping.

export type PongSound = 'boo' | 'ping' | 'woo' | 'mah'

// The ends whose paddle turned the ball between two frames of one rally.
// A serve sets the ball going too, so a frame waiting on one hears none.
export const hitsBetween = (prev: PongFrame | null, next: PongFrame): number[] => {
  if (prev === null || prev.gameId !== next.gameId || prev.serveIn > 0 || next.serveIn > 0) return []
  const before = Math.sign(prev.velocity.z)
  const after = Math.sign(next.velocity.z)
  if (before === 0 || after === 0 || before === after) return []
  return [after > 0 ? 0 : 1]
}

// The seats that lost a life between two views of one table.
export const missesBetween = (prev: PongView | null, next: PongView): number[] => {
  if (prev === null || prev.gameId !== next.gameId) return []
  return next.players.flatMap((player, seat) => {
    const was = prev.players[seat]?.lives
    return was !== undefined && player.lives !== undefined && player.lives < was ? [seat] : []
  })
}

// From the viewer's side: boo for your hit, ping for theirs, woo when
// they miss, mah when you do.
export const soundFor = (kind: 'hit' | 'miss', seat: number, viewer: number): PongSound => {
  if (kind === 'hit') return seat === viewer ? 'boo' : 'ping'
  return seat === viewer ? 'mah' : 'woo'
}
