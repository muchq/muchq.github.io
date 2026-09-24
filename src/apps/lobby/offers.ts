import type { HubGameSummary, HubRoom } from '@/utils/hubStream'

// What the lobby offers and when, read the same way by the panel's
// buttons and the command menu's entries.

// Both games seat four.
export const TABLE_SEATS = 4

// How a table reads: open to join, or why not.
export function tableOffer(table: HubGameSummary): { label: string; open: boolean } {
  if (table.status !== 'waiting') return { label: 'In play', open: false }
  if (table.playerCount >= TABLE_SEATS) return { label: 'Full', open: false }
  return { label: 'Join', open: true }
}

// Seated at a table already, so no other can be opened or joined.
export function atTable(room: HubRoom, playerId: string): boolean {
  return room.players.find(player => player.playerId === playerId)?.table !== undefined
}
