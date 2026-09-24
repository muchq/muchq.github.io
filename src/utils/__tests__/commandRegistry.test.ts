import { describe, it, expect, vi } from 'vitest'
import { CommandRegistry, matchCommands, type Command } from '../commandRegistry'

// The world loop and the lobby's React tree each publish a source whole;
// the menu reads the union. Absent is how a command says it is not
// available, so there is no disabled state to drift.

const cmd = (id: string, label = id, detail?: string): Command => ({ id, label, detail, run: vi.fn() })

describe('CommandRegistry', () => {
  it('lists every source, in the order they first published', () => {
    const r = new CommandRegistry()
    r.publish('world', [cmd('a')])
    r.publish('lobby', [cmd('b'), cmd('c')])
    r.publish('world', [cmd('a2')])
    expect(r.list().map(c => c.id)).toEqual(['a2', 'b', 'c'])
  })

  it('a republish replaces the source, so a command that went away is gone', () => {
    const r = new CommandRegistry()
    r.publish('lobby', [cmd('open chat'), cmd('leave')])
    r.publish('lobby', [cmd('leave')])
    expect(r.list().map(c => c.id)).toEqual(['leave'])
  })

  it('withdraws a source whole, and leaves the others', () => {
    const r = new CommandRegistry()
    r.publish('world', [cmd('a')])
    r.publish('lobby', [cmd('b')])
    r.withdraw('world')
    expect(r.list().map(c => c.id)).toEqual(['b'])
  })

  it('tells subscribers on every change, and hands back the same list between changes', () => {
    const r = new CommandRegistry()
    const heard = vi.fn()
    const unsubscribe = r.subscribe(heard)
    const before = r.list()
    expect(r.list()).toBe(before)
    r.publish('world', [cmd('a')])
    expect(heard).toHaveBeenCalledTimes(1)
    expect(r.list()).not.toBe(before)
    r.withdraw('world')
    expect(heard).toHaveBeenCalledTimes(2)
    unsubscribe()
    r.publish('world', [cmd('a')])
    expect(heard).toHaveBeenCalledTimes(2)
  })

  it('withdrawing a source that never published changes nothing', () => {
    const r = new CommandRegistry()
    const heard = vi.fn()
    r.subscribe(heard)
    const before = r.list()
    r.withdraw('nobody')
    expect(heard).not.toHaveBeenCalled()
    expect(r.list()).toBe(before)
  })
})

describe('matchCommands', () => {
  const all = [cmd('1', 'Room: Glasshouse', 'Reshapes the room for everyone in it'), cmd('2', 'Avatar: cube'), cmd('3', 'Open chat')]

  it('an empty query is everything', () => {
    expect(matchCommands(all, '  ')).toEqual(all)
  })

  it('matches every word, in any order and any case, against the label', () => {
    expect(matchCommands(all, 'glass ROOM').map(c => c.id)).toEqual(['1'])
    expect(matchCommands(all, 'cube chat')).toEqual([])
  })

  it('reads the detail too, so a command can be found by what it does', () => {
    expect(matchCommands(all, 'everyone').map(c => c.id)).toEqual(['1'])
  })
})
