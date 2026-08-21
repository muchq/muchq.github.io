import { describe, expect, it } from 'vitest'
import { normalizeUrl, validateUrl } from '../urlInput'

describe('normalizeUrl', () => {
  it('prefixes bare domains with https://', () => {
    expect(normalizeUrl('example.com/x')).toBe('https://example.com/x')
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com')
  })

  it('lowercases an uppercased http(s) scheme instead of bouncing it', () => {
    expect(normalizeUrl('HTTPS://Example.com/Path')).toBe('https://Example.com/Path')
    expect(normalizeUrl('HTTP://g.co')).toBe('http://g.co')
  })

  it('leaves other schemes alone to fail validation', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
    expect(normalizeUrl('ftp://example.com')).toBe('ftp://example.com')
  })
})

describe('validateUrl', () => {
  it('mirrors the API traits at both edges', () => {
    expect(validateUrl('')).toMatch(/paste/i)
    expect(validateUrl('ftp://example.com')).toMatch(/http/)
    expect(validateUrl('http://g.c')).toMatch(/short/)
    expect(validateUrl('http://g.co')).toBeNull()
    expect(validateUrl('https://e.co/' + 'a'.repeat(987))).toBeNull() // exactly 1000
    expect(validateUrl('https://e.co/' + 'a'.repeat(988))).toMatch(/1000/)
  })

  it('counts code points like the server, not UTF-16 units', () => {
    // 13 + 987 code points = 1000; twice that many UTF-16 units.
    expect(validateUrl('https://e.co/' + '🌸'.repeat(987))).toBeNull()
  })
})
