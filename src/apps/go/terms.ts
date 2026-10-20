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
