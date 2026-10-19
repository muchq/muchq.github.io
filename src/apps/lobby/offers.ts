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
  // A challenge's terms are set: joining takes them and starts the game.
  return { label: table.terms === undefined ? 'Join' : 'Accept', open: true }
}

// The pair a chess, pong or go table's round robin pairing seats, as far as
// the lobby knows (MoonBase#1647). Unknown round robins are none: an
// ordinary table stays anyone's, and the hub turns away all but a pairing
// table's pair.
export function pairingAt(lobby: Pick<UseLobby, 'chess' | 'pong' | 'go'>, table: HubGameSummary): readonly [string, string] | undefined {
  if (table.game === 'chess') {
    for (const roundRobin of lobby.chess.roundRobins ?? []) {
      const pairing = roundRobin.pairings.find(candidate => candidate.gameId === table.gameId)
      if (pairing !== undefined) return [pairing.white, pairing.black]
    }
  }
  if (table.game === 'pong') {
    for (const roundRobin of lobby.pong.roundRobins ?? []) {
      const pairing = roundRobin.pairings.find(candidate => candidate.gameId === table.gameId)
      if (pairing !== undefined) return [pairing.first, pairing.second]
    }
  }
  if (table.game === 'go') {
    for (const roundRobin of lobby.go.roundRobins ?? []) {
      const pairing = roundRobin.pairings.find(candidate => candidate.gameId === table.gameId)
      if (pairing !== undefined) return [pairing.black, pairing.white]
    }
  }
  return undefined
}

// How a table reads for this player: a pairing's table is open to its pair alone.
export function offerFor(lobby: Pick<UseLobby, 'chess' | 'pong' | 'go' | 'playerId'>, table: HubGameSummary): { label: string; open: boolean } {
  const offer = tableOffer(table)
  const pair = pairingAt(lobby, table)
  if (pair === undefined || pair.includes(lobby.playerId)) return offer
  return { ...offer, open: false }
}

// Seated at a table already, so no other can be opened or joined.
export function atTable(room: HubRoom, playerId: string): boolean {
  return room.players.find(player => player.playerId === playerId)?.table !== undefined
}

// The table hook that speaks a game's vocabulary: a table is joined in its
// own game's envelope, or the hub refuses it. A summary from before the
// game was named is golf's.
export function tableFor(lobby: Pick<UseLobby, HubGameName>, game: HubGameName | undefined) {
  return lobby[game ?? 'golf']
}
