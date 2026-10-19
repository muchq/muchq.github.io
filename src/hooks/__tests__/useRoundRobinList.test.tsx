import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRoundRobinList } from '../useRoundRobinList'

interface Held {
  roundRobinId: string
  withdrawn: string[]
}

const held = (over: Partial<Held> = {}): Held => ({ roundRobinId: 'E1', withdrawn: [], ...over })

const setup = () => {
  const ask = vi.fn()
  const hook = renderHook(() => useRoundRobinList<Held>(ask))
  const list = (roundRobins: Held[]) => act(() => hook.result.current.heardList(roundRobins))
  const one = (roundRobin: Held) => act(() => hook.result.current.heardOne(roundRobin))
  return { hook, ask, list, one }
}

describe('useRoundRobinList', () => {
  it('asks for the list, then keeps each one current', () => {
    const { hook, ask, list, one } = setup()
    expect(hook.result.current.roundRobins).toBeNull()
    act(() => hook.result.current.load())
    expect(ask).toHaveBeenCalledTimes(1)
    list([held()])
    one(held({ withdrawn: ['carol'] }))
    one(held({ roundRobinId: 'E2' }))
    expect(hook.result.current.roundRobins).toEqual([held({ withdrawn: ['carol'] }), held({ roundRobinId: 'E2' })])
    expect(ask).toHaveBeenCalledTimes(1)
  })

  // One heard before any list asks for the list, once.
  it('asks once for the list on hearing one before it', () => {
    const { hook, ask, one } = setup()
    one(held())
    one(held({ roundRobinId: 'E2' }))
    expect(hook.result.current.roundRobins).toBeNull()
    expect(ask).toHaveBeenCalledTimes(1)
  })

  // An answer built before a change can arrive after it.
  it('asks again after a list that may predate one heard while it was asked for', () => {
    const { hook, ask, list, one } = setup()
    act(() => hook.result.current.load())
    one(held({ withdrawn: ['carol'] }))
    list([held()])
    expect(ask).toHaveBeenCalledTimes(2)
    list([held({ withdrawn: ['carol'] })])
    expect(hook.result.current.roundRobins?.[0].withdrawn).toEqual(['carol'])
    expect(ask).toHaveBeenCalledTimes(2)
  })

  it('does not ask again after a list nothing was heard during', () => {
    const { hook, ask, list } = setup()
    act(() => hook.result.current.load())
    list([held()])
    expect(ask).toHaveBeenCalledTimes(1)
  })

  it('forgets the list and any ask on reset', () => {
    const { hook, ask, list, one } = setup()
    act(() => hook.result.current.load())
    one(held())
    act(() => hook.result.current.reset())
    expect(hook.result.current.roundRobins).toBeNull()
    list([held()])
    expect(ask).toHaveBeenCalledTimes(1)
  })
})
