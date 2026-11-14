import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import type { UseLobby } from '@/hooks/useLobby'
import { HUB_GAMES } from '@/utils/hubStream'
import ChallengeDiscovery from '../ChallengeDiscovery'

function fixture(): UseLobby {
  return {
    playerId: 'alice', connected: true, chat: { rejection: null },
    ...Object.fromEntries(HUB_GAMES.map(game => [game, { view: null, review: null, roundRobins: [], joinTable: vi.fn() }])),
    room: {
      roomId: 'R1',
      players: [{ playerId: 'bob', connected: true, table: { game: 'chess', gameId: 'C1' } }],
      games: [{ game: 'chess', gameId: 'C1', status: 'waiting', playerCount: 1, terms: 'Blitz · 5+0' }]
    }
  } as unknown as UseLobby
}
function View({ lobby }: { lobby: UseLobby }) {
  const [selected, select] = useState<string | null>(null)
  return <ChallengeDiscovery lobby={lobby} selected={selected} onSelect={select} />
}
function preview() {
  fireEvent.click(screen.getByRole('button', { name: /Open challenges/ }))
  fireEvent.click(screen.getByRole('button', { name: /chess.*C1/ }))
}
beforeEach(() => {
  document.body.innerHTML = '<div id="world-challenges"></div><div id="map-challenges"></div>'
})
afterEach(cleanup)

describe('shared room challenges', () => {
  it('shows late-arriving room state on both surfaces and removes filled invitations', () => {
    const lobby = fixture()
    const { rerender } = render(<View lobby={{ ...lobby, room: { ...lobby.room!, games: [] } }} />)
    expect(document.querySelectorAll('[data-challenge-host]')).toHaveLength(0)
    rerender(<View lobby={lobby} />)
    expect(document.querySelectorAll('[data-challenge-host="bob"]')).toHaveLength(2)
    preview()
    expect(screen.getByText('Blitz · 5+0')).toBeInTheDocument()
    lobby.room!.games[0].playerCount = 2
    rerender(<View lobby={lobby} />)
    expect(document.querySelectorAll('[data-challenge-host]')).toHaveLength(0)
    expect(screen.getByText(/no longer available/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept chess' })).not.toBeInTheDocument()
  })
  it('locks repeated joins until rejection and exposes the server reason', () => {
    const lobby = fixture()
    const { rerender } = render(<View lobby={lobby} />)
    preview()
    fireEvent.click(screen.getByRole('button', { name: 'Accept chess' }))
    fireEvent.click(screen.getByRole('button', { name: 'Joining…' }))
    expect(lobby.chess.joinTable).toHaveBeenCalledExactlyOnceWith('C1')
    // Ordinary room broadcasts must not release the pending request.
    rerender(<View lobby={{ ...lobby, room: { ...lobby.room! } }} />)
    expect(screen.getByRole('button', { name: 'Joining…' })).toBeDisabled()
    lobby.chat.rejection = { seq: 1, reason: 'Another player took that seat' }
    rerender(<View lobby={lobby} />)
    expect(screen.getByText('Another player took that seat')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept chess' })).toBeEnabled()
  })
  it('removes markers with no connected anchor but leaves an open table joinable', () => {
    const lobby = fixture()
    const { rerender } = render(<View lobby={lobby} />)
    preview()
    lobby.room!.players[0].connected = false
    rerender(<View lobby={lobby} />)
    expect(document.querySelectorAll('[data-challenge-host]')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Accept chess' }))
    expect(lobby.chess.joinTable).toHaveBeenCalledExactlyOnceWith('C1')
    lobby.room!.players[0].connected = true
    lobby.connected = false
    rerender(<View lobby={lobby} />)
    expect(document.querySelectorAll('[data-challenge-host]')).toHaveLength(0)
    expect(screen.getByText('Reconnect to join a challenge.')).toBeInTheDocument()
    lobby.connected = true
    rerender(<View lobby={lobby} />)
    expect(document.querySelectorAll('[data-challenge-host]')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Accept chess' })).toBeEnabled()
  })
  it('protects seated players and tournament pairings', () => {
    const lobby = fixture()
    lobby.room!.players.push({ ...lobby.room!.players[0], playerId: 'alice' })
    const { rerender } = render(<View lobby={lobby} />)
    preview()
    const disabled = screen.getByRole('button', { name: 'Accept chess' })
    expect(disabled).toBeDisabled()
    fireEvent.click(disabled)
    expect(lobby.chess.joinTable).not.toHaveBeenCalled()
    lobby.room!.players.pop()
    lobby.chess.roundRobins = [{ terms: { initialSeconds: 300, incrementSeconds: 0, setupName: 'Standard' }, pairings: [{ gameId: 'C1', white: 'bob', black: 'carol' }] }] as UseLobby['chess']['roundRobins']
    rerender(<View lobby={lobby} />)
    expect(document.querySelectorAll('[data-challenge-host]')).toHaveLength(0)
    expect(screen.getByText(/no longer available/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept chess' })).not.toBeInTheDocument()
  })
  it('closes on server-confirmed entry and restores focus when dismissed', () => {
    const lobby = fixture()
    const { rerender } = render(<View lobby={lobby} />)
    fireEvent.click(screen.getByRole('button', { name: /Open challenges/ }))
    const opener = screen.getByRole('button', { name: /chess.*C1/ })
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByRole('button', { name: 'Close challenge preview' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close challenge preview' }), { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Challenge preview' })).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    fireEvent.click(opener)
    lobby.chess.view = { gameId: 'C1' } as UseLobby['chess']['view']
    rerender(<View lobby={lobby} />)
    expect(screen.queryByRole('region', { name: 'Challenge preview' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-challenge-host]')).toHaveLength(0)
  })
  it('collapses its list on Escape and otherwise leaves Escape to page commands', () => {
    const lobby = fixture()
    const escaped = vi.fn()
    document.addEventListener('keydown', escaped)
    render(<View lobby={lobby} />)
    const toggle = screen.getByRole('button', { name: /Open challenges/ })
    fireEvent.keyDown(toggle, { key: 'Escape' })
    expect(escaped).toHaveBeenCalledOnce()
    fireEvent.click(toggle)
    escaped.mockClear()
    fireEvent.keyDown(toggle, { key: 'Escape' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(escaped).not.toHaveBeenCalled()
    document.removeEventListener('keydown', escaped)
  })
})
