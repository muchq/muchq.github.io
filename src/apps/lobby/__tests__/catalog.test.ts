import { describe, expect, it } from 'vitest'
import { CATALOG, catalogEntry, seatsOf, seatsLine } from '../catalog'

// One list says what the room can play: the panel's picker, the command
// menu and the tables' seat counts all read it.

describe('the game catalog', () => {
  it('names each game once, families in the order the picker shows them', () => {
    expect(CATALOG.map(entry => entry.game)).toEqual(['castle', 'golf', 'rummy', 'chess'])
    expect(CATALOG.map(entry => entry.family)).toEqual(['Cards', 'Cards', 'Cards', 'Board'])
  })

  it('reads each game’s seats; a summary from before games were named is golf’s', () => {
    expect(seatsOf('chess')).toBe(2)
    expect(seatsOf('rummy')).toBe(4)
    expect(seatsOf(undefined)).toBe(4)
    expect(catalogEntry(undefined).game).toBe('golf')
  })

  it('says how many play, and what is chosen at the table', () => {
    expect(seatsLine(catalogEntry('chess'))).toBe('2 players')
    expect(seatsLine(catalogEntry('castle'))).toBe('2–4 players')
    expect(seatsLine(catalogEntry('rummy'))).toBe('2–4 players · 7-card, 10-card or gin, chosen at the table')
  })
})
