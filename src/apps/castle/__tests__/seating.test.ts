import { describe, expect, it } from 'vitest'
import { clockOf, fromViewer } from '../seating'

// Where each chair goes, by how many are at the table.

const clocks = (count: number) => Array.from({ length: count }, (_, i) => clockOf(count, i))

describe('clockOf', () => {
  it('puts the viewer at 6 and the others evenly around the rest', () => {
    expect(clocks(1)).toEqual([6])
    expect(clocks(2)).toEqual([6, 12])
    expect(clocks(3)).toEqual([6, 10, 2])
    expect(clocks(4)).toEqual([6, 9, 12, 3])
  })

  it('a chair the table has no place for lands on 6', () => {
    expect(clocks(5)).toEqual([6, 6, 6, 6, 6])
  })
})

describe('fromViewer', () => {
  it('rotates the turn order so the viewer comes first, the next to play after', () => {
    const seats = ['bob', 'alice', 'carol', 'dave'].map(playerId => ({ playerId }))
    expect(fromViewer(seats, 'alice').map(seat => seat.playerId)).toEqual(['alice', 'carol', 'dave', 'bob'])
    expect(fromViewer(seats, 'nobody').map(seat => seat.playerId)).toEqual(['bob', 'alice', 'carol', 'dave'])
  })
})
