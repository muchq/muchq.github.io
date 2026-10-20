import type { GoBoardSize, GoTerms } from './wire'

// The boards and clocks the go table and the lobby offer.
export const SIZES: GoBoardSize[] = [9, 13, 19]

export const CLOCKS: Record<string, { initialSeconds: number; incrementSeconds: number }> = {
  '10+5': { initialSeconds: 600, incrementSeconds: 5 },
  '5+3': { initialSeconds: 300, incrementSeconds: 3 },
  '20+10': { initialSeconds: 1200, incrementSeconds: 10 }
}

// A clock as the lobby says it: whole minutes in minutes, else seconds.
export const clockLine = (initialSeconds: number, incrementSeconds: number) =>
  `${initialSeconds % 60 === 0 ? initialSeconds / 60 : `${initialSeconds}s`}+${incrementSeconds}`

export const termsLine = (terms: GoTerms) => `${terms.size}×${terms.size} · komi ${terms.komi} · ${clockLine(terms.initialSeconds, terms.incrementSeconds)}`

// A bot's levels, GNU Go's own (1 to 10).
export const BOT_LEVELS: Array<{ level: number; name: string }> = [
  { level: 1, name: 'Beginner' },
  { level: 4, name: 'Casual' },
  { level: 7, name: 'Club' },
  { level: 10, name: 'Strongest' }
]

// A seat as people read it: a player's id is their name; a bot's
// ("gnugo@4") its engine and level. The id's shape is the hub's bot-naming
// contract (games_hub go_bots.h).
export function nameOf(playerId: string): string {
  const bot = /^gnugo@(\d+)$/.exec(playerId)
  return bot === null ? playerId : `GNU Go ${bot[1]}`
}
