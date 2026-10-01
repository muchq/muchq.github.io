import type { UseLobby } from '@/hooks/useLobby'
import type { HubGameName, HubGameSummary, HubRoom } from '@/utils/hubStream'
import { seatsOf } from './catalog'

export { seatsOf }

// What the lobby offers and when, read the same way by the panel's
// buttons and the command menu's entries.

// How a table reads: open to join, or why not.
export function tableOffer(table: HubGameSummary): { label: string; open: boolean } {
  if (table.status !== 'waiting') return { label: 'In play', open: false }
  if (table.playerCount >= seatsOf(table.game)) return { label: 'Full', open: false }
  return { label: 'Join', open: true }
}

// Seated at a table already, so no other can be opened or joined.
export function atTable(room: HubRoom, playerId: string): boolean {
  return room.players.find(player => player.playerId === playerId)?.table !== undefined
}

// The table hook that speaks a game's vocabulary: a table is joined in its
// own game's envelope, or the hub refuses it. A summary from before the
// game was named is golf's.
export function tableFor(lobby: Pick<UseLobby, 'castle' | 'golf' | 'rummy' | 'chess'>, game: HubGameName | undefined) {
  if (game === 'castle') return lobby.castle
  if (game === 'rummy') return lobby.rummy
  if (game === 'chess') return lobby.chess
  return lobby.golf
}
