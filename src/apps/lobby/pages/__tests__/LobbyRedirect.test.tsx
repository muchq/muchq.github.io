import { useEffect } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import LobbyRedirect from '../LobbyRedirect'

// The old game links keep working: each lands on the lobby path that
// names the same room and table, and leaves nothing behind Back.

const seen = { path: '', redirects: 0 }

const Redirect = () => {
  useEffect(() => {
    seen.redirects += 1
  })
  return <LobbyRedirect />
}

const Probe = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    seen.path = pathname
  })
  return <button onClick={() => navigate(-1)}>back</button>
}

const landing = (from: string): string => {
  render(
    <MemoryRouter initialEntries={[from]}>
      <Routes>
        <Route path="/golf" element={<Redirect />} />
        <Route path="/golf/room/:roomId" element={<Redirect />} />
        <Route path="/golf/room/:roomId/game/:gameId" element={<Redirect />} />
        <Route path="/castle" element={<Redirect />} />
        <Route path="/castle/room/:roomId" element={<Redirect />} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  )
  return seen.path
}

describe('LobbyRedirect', () => {
  beforeEach(() => {
    cleanup()
    seen.path = ''
    seen.redirects = 0
  })

  it('sends the game pages and their share links into the lobby', () => {
    expect(landing('/golf')).toBe('/games')
    cleanup()
    expect(landing('/castle')).toBe('/games')
    cleanup()
    expect(landing('/golf/room/R1')).toBe('/games/room/R1')
    cleanup()
    expect(landing('/castle/room/R1')).toBe('/games/room/R1')
    cleanup()
    expect(landing('/golf/room/R1/game/G1')).toBe('/games/room/R1/table/G1')
  })

  it('leaves no old link behind Back', () => {
    landing('/golf/room/R1')
    expect(seen.redirects).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    expect(seen.path).toBe('/games/room/R1')
    // With `replace`, Back has nowhere to go and re-enters no redirect.
    expect(seen.redirects).toBe(1)
  })
})
