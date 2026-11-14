import { expect, test, type WebSocketRoute } from '@playwright/test'

// Exercise the real lobby and WebGL renderer against a controlled hub,
// including the room broadcast arriving before a refused final-seat join.
for (const geometry of [{ plane: {} }, { sphere: { radius: 53 } }]) {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`room invitations project and join at ${viewport.width}px on ${'sphere' in geometry ? 'sphere' : 'plane'}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.addInitScript(() => localStorage.setItem('lobby.panel', 'hidden'))
      await page.route('**/games/v2/session', route => route.fulfill({ json: { playerId: 'alice', ticket: 'test', resumeToken: 'test' } }))
      let socket: WebSocketRoute
      let joins = 0
      const room = {
        roomId: 'R1', geometry,
        players: [
          { playerId: 'alice', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
          { playerId: 'bob', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0, table: { game: 'chess', gameId: 'C1' } }
        ],
        games: [{ game: 'chess', gameId: 'C1', status: 'waiting', playerCount: 1, terms: 'Blitz · 5+0' }]
      }
      const send = (event: string, payload: unknown) => socket.send(JSON.stringify({ event, payload }))
      await page.routeWebSocket('**/games/v2/play?*', ws => {
        socket = ws
        ws.onMessage(raw => {
          const message = JSON.parse(String(raw))
          if (message.event === 'lobby' && message.payload.action.join) {
            const spawn = message.payload.action.join
            send('lobby', { update: { worldState: { geometry, players: [{ ...spawn, playerId: 'bob' }] } } })
          }
          if (message.event === 'chess' && message.payload.move.joinGame) joins++
        })
        send('sessionReady', { playerId: 'alice', resumed: true, roomId: 'R1' })
        send('roomState', room)
      })
      await page.goto('/games/room/R1')
      const beacon = page.locator('#world-challenges button')
      const marker = page.locator('#map-challenges button')
      await expect(beacon).toBeVisible()
      await expect(marker).toBeVisible()
      await marker.click()
      const preview = page.getByRole('region', { name: 'Challenge preview' })
      await expect(preview).toBeVisible()
      await expect(preview).toContainText('Play with bob')
      await page.screenshot({ path: `test-results/challenges-${viewport.width}-${'sphere' in geometry ? 'sphere' : 'plane'}.png` })
      const box = (await preview.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThan(60)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
      await page.getByRole('button', { name: 'Close challenge preview' }).press('Escape')
      await expect(marker).toBeFocused()
      await marker.press('Enter')
      await page.getByRole('button', { name: 'Accept chess' }).click()
      await expect(page.getByRole('button', { name: 'Joining…' })).toBeDisabled()
      expect(joins).toBe(1)
      room.games[0].playerCount = 2
      send('roomState', room)
      send('commandRejected', { reason: 'Another player took that seat' })
      await expect(marker).toHaveCount(0)
      await expect(beacon).toHaveCount(0)
      await expect(preview).toContainText('no longer available')
      await expect(page.getByRole('button', { name: 'Accept chess' })).toHaveCount(0)
    })
  }
}
