import { describe, expect, it } from 'vitest'
import { displayToken } from '../displayToken'
import { TOKENS } from '@/apps/deja/__tests__/fixtures'

describe('displayToken', () => {
  it('keeps method and path from an access-log token', () => {
    expect(displayToken(TOKENS.home)).toBe('GET /')
    expect(displayToken(TOKENS.stats)).toBe('GET /stats/v1/summary')
    expect(displayToken(TOKENS.probe)).toBe('GET /.env')
  })

  it('truncates unfamiliar shapes instead of inventing structure', () => {
    const long = 'x'.repeat(40)
    expect(displayToken(long)).toBe(`${'x'.repeat(31)}…`)
    expect(displayToken('short')).toBe('short')
  })
})
