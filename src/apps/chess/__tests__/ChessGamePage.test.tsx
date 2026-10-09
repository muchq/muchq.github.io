import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChessGamePage from '../pages/ChessGamePage'
import type { ChessReview } from '../wire'

// A published game's own page (MoonBase#1637): the URL its PGN's [Site]
// names, read from the hub by archive id and shown as a review.

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

const review: ChessReview = {
  summary: {
    archiveId: 42,
    white: 'alice',
    black: 'bob',
    result: { ending: 'resignation', winner: 'alice', winnerColor: 'white' },
    setupId: 'standard',
    setupName: 'Standard starting position',
    plies: 1,
    endedAtMs: 1_800_000_000_000,
    published: true
  },
  moves: ['e2e4'],
  san: ['e4'],
  fens: [START, AFTER_E4],
  pgn: '[Site "https://muchq.com/games/chess/42"]\n\n1. e4 1-0\n'
}

const answer = (status: number, body: unknown = {}) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))

const visit = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/games/chess/:archiveId" element={<ChessGamePage />} />
        <Route path="/games" element={<p>lobby</p>} />
      </Routes>
    </MemoryRouter>
  )

afterEach(() => vi.unstubAllGlobals())

describe('ChessGamePage', () => {
  it('reads the game by its archive id and shows it', async () => {
    const fetch = answer(200, review)
    vi.stubGlobal('fetch', fetch)
    visit('/games/chess/42')

    expect(await screen.findByRole('heading', { name: /alice vs bob/ })).toBeInTheDocument()
    expect(screen.getByText('alice won by resignation')).toBeInTheDocument()
    expect(fetch.mock.calls[0][0]).toBe('https://api.muchq.com/games/v2/chess/42')
  })

  it('says so when the game is not public, or has left the feed', async () => {
    vi.stubGlobal('fetch', answer(404, { message: 'no published game has that archive id' }))
    visit('/games/chess/42')

    expect(await screen.findByText(/isn’t public, or has left the public feed/)).toBeInTheDocument()
  })

  it('says so when the hub cannot answer, rather than that the game is gone', async () => {
    vi.stubGlobal('fetch', answer(503))
    visit('/games/chess/42')

    expect(await screen.findByText(/Couldn’t load this game/)).toBeInTheDocument()
  })

  it('asks the hub nothing for an id that is not one', async () => {
    const fetch = answer(200, review)
    vi.stubGlobal('fetch', fetch)
    visit('/games/chess/abc')

    expect(await screen.findByText(/isn’t public, or has left the public feed/)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
