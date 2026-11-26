import { createDictionary, type Dictionary } from './puzzles'

let pending: Promise<Dictionary> | undefined

export function loadDictionary(): Promise<Dictionary> {
  pending ??= Promise.all(['words.txt', 'puzzle-words.txt'].map(async file => {
    const response = await fetch(`${import.meta.env.BASE_URL}wordchains/${file}`)
    if (!response.ok) throw new Error('Could not load the dictionary')
    return response.text()
  })).then(([words, endpoints]) => createDictionary(words, endpoints)).catch(error => {
    pending = undefined
    throw error
  })
  return pending
}
