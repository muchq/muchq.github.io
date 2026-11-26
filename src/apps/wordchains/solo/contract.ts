export const SOLO_API = '/api/wordchains/solo'

export const DIFFICULTIES = {
  3: { label: 'Easy', seconds: 90 },
  4: { label: 'Medium', seconds: 120 },
  5: { label: 'Hard', seconds: 180 },
} as const

export const LENGTHS = [3, 4, 5] as const
export type Length = typeof LENGTHS[number]
export type Mode = 'quick' | 'daily' | 'sprint'

export interface Puzzle {
  start: string
  target: string
}

export interface Result {
  optimalSteps: number
  points: number
}

export type Move =
  | { status: 'rejected'; feedback: string }
  | { status: 'accepted' }
  | { status: 'solved'; result: Result }

export type SoloAction =
  | { action: 'start'; mode: Mode; length: Length }
  | { action: 'play'; puzzle: Puzzle; chain: string[]; word: string }
  | { action: 'hint'; mode: 'quick'; puzzle: Puzzle; chain: string[] }
