import { describe, expect, it } from 'vitest'
import { fromViewer, seatAround } from '../seating'

// Where each chair goes, by how many are at the table.

const clocks = (count: number) => Array.from({ length: count }, (_, i) => seatAround(count, i).clock)
const sides = (count: number) => Array.from({ length: count }, (_, i) => seatAround(count, i).side)

describe('seatAround', () => {
  it('puts the viewer at 6 and the others evenly around the rest', () => {
    expect(clocks(1)).toEqual([6])
    expect(clocks(2)).toEqual([6, 12])
    expect(clocks(3)).toEqual([6, 10, 2])
    expect(clocks(4)).toEqual([6, 9, 12, 3])
  })

  it('names the rim each seat sits against', () => {
    expect(sides(2)).toEqual(['bottom', 'top'])
    expect(sides(3)).toEqual(['bottom', 'top', 'top'])
    expect(sides(4)).toEqual(['bottom', 'left', 'top', 'right'])
  })

  it('places seats on a ring, the viewer at the bottom', () => {
    expect(seatAround(4, 0)).toMatchObject({ x: 50, y: 90 })
    expect(seatAround(4, 1)).toMatchObject({ x: 10, y: 50 })
    expect(seatAround(4, 2)).toMatchObject({ x: 50, y: 10 })
    expect(seatAround(4, 3)).toMatchObject({ x: 90, y: 50 })
    expect(seatAround(3, 1).x).toBeLessThan(50)
    expect(seatAround(3, 1).y).toBeLessThan(50)
  })
})

describe('fromViewer', () => {
  it('rotates the turn order so the viewer comes first, the next to play after', () => {
    const seats = ['bob', 'alice', 'carol', 'dave'].map(playerId => ({ playerId }))
    expect(fromViewer(seats, 'alice').map(seat => seat.playerId)).toEqual(['alice', 'carol', 'dave', 'bob'])
    expect(fromViewer(seats, 'nobody').map(seat => seat.playerId)).toEqual(['bob', 'alice', 'carol', 'dave'])
  })
})
