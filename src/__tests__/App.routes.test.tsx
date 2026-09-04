import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { FakeWebSocket, admitted, installFakeHub } from '@/test/fakeHub'

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )

describe('App routes', () => {
  // Pages that dial the games hub on mount get a scripted one, never
  // the real thing.
  beforeEach(() => {
    installFakeHub()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const navOf = (index: number) => within(screen.getAllByRole('navigation')[index])

  it('serves the shortener at /iili', () => {
    at('/iili')
    expect(within(screen.getByRole('navigation')).getByText('MuchQ : iili')).toBeDefined()
  })

  // Links to muchq.com/r3dr predate the rename and still arrive.
  it('redirects the pre-rename /r3dr to /iili', () => {
    at('/r3dr')
    expect(within(screen.getByRole('navigation')).getByText('MuchQ : iili')).toBeDefined()
  })

  it('serves castle at /castle and its room share link', async () => {
    at('/castle')
    expect(navOf(0).getByText('MuchQ : Castle')).toBeDefined()
    at('/castle/room/ROOM01')
    expect(navOf(1).getByText('MuchQ : Castle')).toBeDefined()
    // The share link's room is joined once the hub admits the session.
    let ws!: FakeWebSocket
    await act(async () => {
      ws = await admitted()
    })
    expect(ws.lastSent()).toEqual({ event: 'joinRoom', payload: { roomId: 'ROOM01' } })
  })

  it('a malformed castle share link joins nothing', async () => {
    at('/castle/room/not%20a%20room')
    let ws!: FakeWebSocket
    await act(async () => {
      ws = await admitted()
    })
    expect(ws.sent).toEqual([])
  })

  it('serves the traffic stats at /stats', () => {
    at('/stats')
    expect(within(screen.getByRole('navigation')).getByText('MuchQ : Stats')).toBeDefined()
  })
})
