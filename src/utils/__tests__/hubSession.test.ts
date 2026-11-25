import { describe, expect, it } from 'vitest'
import { hubChessFeedUrl, hubSessionUrl } from '../hubSession'

// The hub's plain-HTTP routes live beside the play socket: same host,
// http(s) for ws(s).
describe('hub URLs', () => {
  // Named as the web for the hub's metrics, with no version: it always
  // runs its latest deploy.
  it('mints sessions beside the play socket, as the web', () => {
    expect(hubSessionUrl('wss://api.muchq.com/games/v2/play')).toBe('https://api.muchq.com/games/v2/session?client=web')
    expect(hubSessionUrl('ws://localhost:2015/games/v2/play')).toBe('http://localhost:2015/games/v2/session?client=web')
  })

  it('serves the public chess feed beside it too', () => {
    expect(hubChessFeedUrl('wss://api.muchq.com/games/v2/play')).toBe('https://api.muchq.com/games/v2/chess.pgn')
    expect(hubChessFeedUrl('ws://localhost:2015/games/v2/play')).toBe('http://localhost:2015/games/v2/chess.pgn')
  })
})
