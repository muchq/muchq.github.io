import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GameReview from '../GameReview'
import type { ChessReview } from '../../wire'

// A finished game stepped through (MoonBase#1637): it opens on the final
// position, the controls, the keys and the move list each move the board,
// and the PGN and the position leave for elsewhere.

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'

const review = (): ChessReview => ({
  summary: {
    archiveId: 42,
    gameId: 'G1',
    ordinal: 2,
    white: 'alice',
    black: 'bob',
    result: { ending: 'resignation', winner: 'bob', winnerColor: 'black' },
    setupId: 'standard',
    setupName: 'Standard starting position',
    plies: 2,
    endedAtMs: 1_800_000_000_000,
    published: false
  },
  moves: ['e2e4', 'e7e5'],
  san: ['e4', 'e5'],
  fens: [START, AFTER_E4, AFTER_E5],
  pgn: '[Event "muchq.com room R1"]\n\n1. e4 e5 0-1\n'
})

const mount = (playerId = 'alice') => {
  const onClose = vi.fn()
  render(<GameReview review={review()} playerId={playerId} onClose={onClose} />)
  return { onClose }
}

const square = (name: string) => screen.getByRole('img', { name: new RegExp(`^${name}`) })
const position = () => screen.getByTestId('review-position').textContent

describe('GameReview', () => {
  it('names the game and opens on its final position', () => {
    mount()
    expect(screen.getByRole('heading', { name: /alice vs bob/ })).toBeInTheDocument()
    expect(screen.getByText('bob won by resignation')).toBeInTheDocument()
    expect(square('e5, black pawn')).toBeInTheDocument()
    expect(position()).toBe('After 1… e5')
  })

  it('steps back and forth with the buttons, to either end', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Previous move' }))
    expect(position()).toBe('After 1. e4')
    expect(screen.queryByRole('img', { name: /^e5, / })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(position()).toBe('Start')
    expect(square('e2, white pawn')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous move' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next move' }))
    expect(position()).toBe('After 1. e4')
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    expect(position()).toBe('After 1… e5')
    expect(screen.getByRole('button', { name: 'Next move' })).toBeDisabled()
  })

  it('steps with the arrow keys, and Home and End', () => {
    mount()
    const review = screen.getByRole('dialog', { name: /alice vs bob/ })
    fireEvent.keyDown(review, { key: 'ArrowLeft' })
    expect(position()).toBe('After 1. e4')
    fireEvent.keyDown(review, { key: 'Home' })
    expect(position()).toBe('Start')
    fireEvent.keyDown(review, { key: 'ArrowRight' })
    expect(position()).toBe('After 1. e4')
    fireEvent.keyDown(review, { key: 'End' })
    expect(position()).toBe('After 1… e5')
  })

  it('jumps to a move from the list, which marks the one shown', () => {
    mount()
    const moves = screen.getByRole('list', { name: 'Moves' })
    fireEvent.click(within(moves).getByRole('button', { name: 'e4' }))
    expect(position()).toBe('After 1. e4')
    expect(within(moves).getByRole('button', { name: 'e4' })).toHaveAttribute('aria-current', 'true')
    expect(within(moves).getByRole('button', { name: 'e5' })).not.toHaveAttribute('aria-current')
  })

  it('downloads the PGN the hub wrote, named for the game', () => {
    mount()
    const download = screen.getByRole('link', { name: 'Download PGN' })
    expect(download).toHaveAttribute('download', 'muchq-chess-42.pgn')
    expect(decodeURIComponent(download.getAttribute('href')!.split(',')[1])).toBe(review().pgn)
  })

  it('analyzes the position shown on lichess', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Previous move' }))
    const analyze = screen.getByRole('link', { name: /Analyze on lichess/ })
    expect(analyze).toHaveAttribute('href', `https://lichess.org/analysis/standard/${AFTER_E4.replace(/ /g, '_')}`)
    expect(analyze).toHaveAttribute('target', '_blank')
    expect(analyze).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows Black the board from Black’s side, and anyone else from White’s', () => {
    mount('bob')
    expect(screen.getAllByRole('img')[0]).toHaveAccessibleName(/^h1/)
  })

  // Escape closes the review and is marked handled, so the command
  // menu's own Escape binding never opens over it.
  it('closes on Escape, which goes no further', () => {
    const { onClose } = mount()
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    screen.getByRole('dialog', { name: /alice vs bob/ }).dispatchEvent(event)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('closes', () => {
    const { onClose } = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Close review' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
