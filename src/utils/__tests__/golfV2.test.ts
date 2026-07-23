import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isGolfV2Enabled, golfV2SessionUrl } from '../golfV2'

describe('golf v2 beta switch', () => {
  const setSearch = (search: string) => {
    vi.stubGlobal('location', { ...window.location, search })
  }

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults off', () => {
    setSearch('')
    expect(isGolfV2Enabled()).toBe(false)
  })

  it('?golf=v2 opts in and sticks', () => {
    setSearch('?golf=v2')
    expect(isGolfV2Enabled()).toBe(true)

    setSearch('')
    expect(isGolfV2Enabled()).toBe(true) // persisted
  })

  it('?golf=v1 opts back out and sticks', () => {
    localStorage.setItem('golf_v2_beta', '1')
    setSearch('?golf=v1')
    expect(isGolfV2Enabled()).toBe(false)

    setSearch('')
    expect(isGolfV2Enabled()).toBe(false)
  })

  it('derives the session url from the play url', () => {
    expect(golfV2SessionUrl()).toBe('https://api.muchq.com/games/v2/session')
  })
})
