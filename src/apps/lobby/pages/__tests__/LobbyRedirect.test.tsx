import { cleanup, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import LobbyRedirect from '../LobbyRedirect'

// The old game links keep working: each lands on the lobby path that
// names the same room and table.

const landing = (from: string): string => {
  let landed = ''
  const Probe = () => {
    landed = useLocation().pathname
    return null
  }
  render(
    <MemoryRouter initialEntries={[from]}>
      <Routes>
        <Route path="/golf" element={<LobbyRedirect />} />
        <Route path="/golf/room/:roomId" element={<LobbyRedirect />} />
        <Route path="/golf/room/:roomId/game/:gameId" element={<LobbyRedirect />} />
        <Route path="/castle" element={<LobbyRedirect />} />
        <Route path="/castle/room/:roomId" element={<LobbyRedirect />} />
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
})
