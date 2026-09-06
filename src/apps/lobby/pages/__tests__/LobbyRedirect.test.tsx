import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import LobbyRedirect from '../LobbyRedirect'

// The old game links keep working: each lands on the lobby path that
// names the same room and table.

let landedAt = ''
const landed = () => landedAt
// How many times a redirect ran: with `replace`, Back from the lobby
// has nowhere to go and never re-enters one.
let redirects = 0
const Redirect = () => {
  redirects += 1
  return <LobbyRedirect />
}
const landing = (from: string): string => {
  let landed = ''
  const Probe = () => {
    landed = useLocation().pathname
    landedAt = landed
    const navigate = useNavigate()
    return <button onClick={() => navigate(-1)}>back</button>
  }
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
  return landed
}

describe('LobbyRedirect', () => {
  beforeEach(() => cleanup())

  it('sends the game pages and their share links into the lobby', () => {
    expect(landing('/golf')).toBe('/games')
    expect(landing('/castle')).toBe('/games')
    expect(landing('/golf/room/R1')).toBe('/games/room/R1')
    expect(landing('/castle/room/R1')).toBe('/games/room/R1')
    expect(landing('/golf/room/R1/game/G1')).toBe('/games/room/R1/table/G1')
  })

  it('leaves no old link behind Back', () => {
    redirects = 0
    landing('/golf/room/R1')
    fireEvent.click(screen.getByRole('button', { name: 'back' }))
    expect(landed()).toBe('/games/room/R1')
    expect(redirects).toBe(1)
  })
})
