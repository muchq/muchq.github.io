import type { HubGameName } from '@/utils/hubStream'

// What a room can play, in the order the lobby offers it: the panel's
// picker, the command menu and every table's seat count read this list,
// so a new game is one entry here and its table hook.

export type GameFamily = 'Cards' | 'Board'

export interface CatalogEntry {
  game: HubGameName
  label: string
  family: GameFamily
  seats: { min: number; max: number }
  blurb: string
  // Chosen at the table, between deals, rather than here.
  variants?: string
}

export const CATALOG: readonly CatalogEntry[] = [
  {
    game: 'castle',
    label: 'Castle',
    family: 'Cards',
    seats: { min: 2, max: 4 },
    blurb: 'Shed every card first. 2s reset the deck, 10s clear it, four of a kind counts as a 10.'
  },
  {
    game: 'golf',
    label: 'Golf',
    family: 'Cards',
    seats: { min: 2, max: 4 },
    blurb: 'Lowest hand wins. Peek at two, then draw and swap; knock to call the last round.'
  },
  {
    game: 'rummy',
    label: 'Rummy',
    family: 'Cards',
    seats: { min: 2, max: 4 },
    blurb: 'Draw, lay down sets and runs, discard. First to empty their hand wins.',
    variants: '7-card, 10-card or gin'
  },
  {
    game: 'chess',
    label: 'Chess',
    family: 'Board',
    seats: { min: 2, max: 2 },
    blurb: 'Standard chess and endgame practice positions, on the clock. Checkmate, promote, or hold the draw.'
  }
]

export const FAMILIES: readonly GameFamily[] = [...new Set(CATALOG.map(entry => entry.family))]

// How a family of several games is named where its game is picked
// ("Card game") and in front of a table's game ("cards · castle").
export const FAMILY_NOUNS: Record<GameFamily, { singular: string; plural: string }> = {
  Cards: { singular: 'Card', plural: 'cards' },
  Board: { singular: 'Board', plural: 'board' }
}

// A family of one game needs no name of its own: chess is chess.
export function familyOf(game: HubGameName | undefined): { family: GameFamily; games: readonly CatalogEntry[] } {
  const family = catalogEntry(game).family
  return { family, games: CATALOG.filter(entry => entry.family === family) }
}

// A summary from before the game was named is golf's.
export function catalogEntry(game: HubGameName | undefined): CatalogEntry {
  const named = game ?? 'golf'
  const entry = CATALOG.find(candidate => candidate.game === named)
  if (entry === undefined) throw new Error(`not in the catalog: ${named}`)
  return entry
}

export function seatsOf(game: HubGameName | undefined): number {
  return catalogEntry(game).seats.max
}

// "2 players", "2–4 players", and what the table chooses, if anything.
export function seatsLine(entry: CatalogEntry): string {
  const { min, max } = entry.seats
  const players = min === max ? `${min} players` : `${min}–${max} players`
  return entry.variants === undefined ? players : `${players} · ${entry.variants}, chosen at the table`
}
