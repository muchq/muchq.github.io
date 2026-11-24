import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SOUND_KEY, useSoundSetting, useWordchainSounds } from '../useWordchainSounds'
import type { Cue } from '../sounds'
import type { WordchainView } from '../wire'

const view = (ladder: string[]): WordchainView => ({
  gameId: 'W1',
  phase: 'racing',
  start: 'cold',
  target: 'warm',
  par: 5,
  startedAtMs: 0,
  deadlineMs: 180_000,
  runners: [{ playerId: 'alice', words: ladder.length, left: false, ladder, wins: 0 }],
  racesPlayed: 0,
  practice: true
})

afterEach(() => localStorage.clear())

describe('useWordchainSounds', () => {
  const mount = (on: boolean) => {
    const play = vi.fn<(cue: Cue) => void>()
    const hook = renderHook(({ v, refusals }: { v: WordchainView; refusals: number }) => useWordchainSounds({ view: v, refusals, playerId: 'alice', on, play }), {
      initialProps: { v: view([]), refusals: 0 }
    })
    return { ...hook, play }
  }

  it('plays each accepted word once', () => {
    const { rerender, play } = mount(true)
    rerender({ v: view(['cord']), refusals: 0 })
    rerender({ v: view(['cord']), refusals: 0 })
    expect(play.mock.calls).toEqual([[{ kind: 'rung', step: 1 }]])
  })

  it('plays the refusal cue for a refused word, not a rung', () => {
    const { rerender, play } = mount(true)
    rerender({ v: view([]), refusals: 1 })
    expect(play.mock.calls).toEqual([[{ kind: 'refused' }]])
  })

  it('plays nothing with sound effects off', () => {
    const { rerender, play } = mount(false)
    rerender({ v: view(['cord']), refusals: 0 })
    rerender({ v: view(['cord']), refusals: 1 })
    expect(play).not.toHaveBeenCalled()
  })
})

describe('useSoundSetting', () => {
  it('is on until turned off, and stays off on this device', () => {
    const first = renderHook(() => useSoundSetting())
    expect(first.result.current[0]).toBe(true)
    act(() => first.result.current[1](false))
    expect(first.result.current[0]).toBe(false)
    expect(localStorage.getItem(SOUND_KEY)).toBe('off')
    first.unmount()
    expect(renderHook(() => useSoundSetting()).result.current[0]).toBe(false)
  })
})
