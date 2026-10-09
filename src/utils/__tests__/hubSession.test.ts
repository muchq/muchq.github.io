import { describe, expect, it } from 'vitest'
import { hubChessFeedUrl, hubSessionUrl } from '../hubSession'

// The hub's plain-HTTP routes live beside the play socket: same host,
// http(s) for ws(s).
describe('hub URLs', () => {
  it('mints sessions beside the play socket', () => {
    expect(hubSessionUrl('wss://api.muchq.com/games/v2/play')).toBe('https://api.muchq.com/games/v2/session')
    expect(hubSessionUrl('ws://localhost:2015/games/v2/play')).toBe('http://localhost:2015/games/v2/session')
  })

  it('serves the public chess feed beside it too', () => {
    expect(hubChessFeedUrl('wss://api.muchq.com/games/v2/play')).toBe('https://api.muchq.com/games/v2/chess.pgn')
    expect(hubChessFeedUrl('ws://localhost:2015/games/v2/play')).toBe('http://localhost:2015/games/v2/chess.pgn')
  })
})
