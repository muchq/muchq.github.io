import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HoverableWord from '../HoverableWord'

const answer = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as Response)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('HoverableWord', () => {
  it('opens the word’s definition from the keyboard as well as a tap', async () => {
    vi.stubGlobal('fetch', answer([{ meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A thin rope.' }] }] }]))
    render(<HoverableWord word="cord" />)
    const word = screen.getByRole('button', { name: 'Define cord' })
    expect(word.textContent).toBe('cord')
    fireEvent.click(word)
    const dialog = await screen.findByRole('dialog', { name: 'cord' })
    expect(await screen.findByText('A thin rope.')).toBeTruthy()
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('closes on Escape and gives focus back to the word', async () => {
    vi.stubGlobal('fetch', answer([], false))
    render(<HoverableWord word="qzqz" />)
    const word = screen.getByRole('button', { name: 'Define qzqz' })
    word.focus()
    fireEvent.click(word)
    expect(await screen.findByText('Could not find definition for "qzqz"')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(word)
  })
})
