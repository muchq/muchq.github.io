import { describe, expect, it } from 'vitest'
import { nameOf } from '../terms'

describe('nameOf', () => {
  // A bot's id ("gnugo@4") names its engine and level, as the hub mints
  // it (games_hub go_bots.h); a player's id is their name.
  it('names a bot by its engine and level, and a player by their id', () => {
    expect(nameOf('gnugo@4')).toBe('GNU Go 4')
    expect(nameOf('gnugo@10')).toBe('GNU Go 10')
    expect(nameOf('alice')).toBe('alice')
    expect(nameOf('gnugo@x')).toBe('gnugo@x')
  })
})
