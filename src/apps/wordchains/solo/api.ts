import { SOLO_API, type Length, type Mode, type Move, type Puzzle, type SoloAction } from './contract'

async function request<T>(body: SoloAction, signal: AbortSignal): Promise<T> {
  const response = await fetch(SOLO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw new Error('Word Chains request failed')
  return response.json()
}

export const startPuzzle = (mode: Mode, length: Length, signal: AbortSignal) =>
  request<Puzzle>({ action: 'start', mode, length }, signal)

export const playWord = (puzzle: Puzzle, chain: string[], word: string, signal: AbortSignal) =>
  request<Move>({ action: 'play', puzzle, chain, word }, signal)

export const requestHint = (puzzle: Puzzle, chain: string[], signal: AbortSignal) =>
  request<{ word: string | null }>({ action: 'hint', mode: 'quick', puzzle, chain }, signal)
