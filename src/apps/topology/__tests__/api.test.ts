import { describe, expect, it, vi } from 'vitest'
import { fetchNodeStates } from '../api'

const containers = [
  { name: 'ubuntu-deja-1', service: 'deja', reporting: true, crash_looping: false },
  { name: 'ubuntu-stats-1', service: 'stats', reporting: false, crash_looping: false },
]

describe('fetchNodeStates', () => {
  it('keys each container state by the compose service, which is the node id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ timestamp: 'now', containers }),
    }))

    const states = await fetchNodeStates()

    expect(states?.get('deja')).toBe('up')
    expect(states?.get('stats')).toBe('not reporting')
  })

  it('answers null when the metrics API is unreachable, so the page can still draw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))

    expect(await fetchNodeStates()).toBeNull()
  })
})
