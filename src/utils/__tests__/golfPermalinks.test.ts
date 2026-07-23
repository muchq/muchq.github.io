import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isValidId,
  parsePermalinkParams,
  generateRoomPermalink,
  generateGamePermalink,
  extractIdsFromUrl,
  type GolfRouteParams
} from '../golfPermalinks'

describe('golfPermalinks', () => {
  describe('isValidId', () => {
    it('should return true for valid alphanumeric IDs', () => {
      expect(isValidId('abc123')).toBe(true)
      expect(isValidId('ABC123')).toBe(true)
      expect(isValidId('123')).toBe(true)
      expect(isValidId('abc')).toBe(true)
      expect(isValidId('Room1')).toBe(true)
    })

    it('tolerates hyphens (hub session ids carry them)', () => {
      expect(isValidId('abc-123')).toBe(true)
    })

    it('should return false for invalid IDs', () => {
      expect(isValidId('')).toBe(false)
      expect(isValidId('abc_123')).toBe(false)
      expect(isValidId('abc 123')).toBe(false)
      expect(isValidId('abc@123')).toBe(false)
      expect(isValidId('abc.123')).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isValidId(undefined)).toBe(false)
    })
  })

  describe('parsePermalinkParams', () => {
    it('should return valid empty state when no parameters provided', () => {
      const result = parsePermalinkParams({})
      expect(result).toEqual({
        roomId: null,
        gameId: null,
        isValid: true
      })
    })

    it('should parse valid room ID only', () => {
      const params: GolfRouteParams = { roomId: 'room123' }
      const result = parsePermalinkParams(params)
      expect(result).toEqual({
        roomId: 'room123',
        gameId: null,
        isValid: true
      })
    })

    it('should parse valid room and game IDs', () => {
      const params: GolfRouteParams = { roomId: 'room123', gameId: 'game456' }
      const result = parsePermalinkParams(params)
      expect(result).toEqual({
        roomId: 'room123',
        gameId: 'game456',
        isValid: true
      })
    })

    it('should return error for invalid room ID', () => {
      const params: GolfRouteParams = { roomId: 'room@123' }
      const result = parsePermalinkParams(params)
      expect(result).toEqual({
        roomId: null,
        gameId: null,
        isValid: false,
        error: 'Invalid room ID format. Room IDs may contain only letters, numbers, and hyphens.'
      })
    })

    it('should return error for invalid game ID', () => {
      const params: GolfRouteParams = { roomId: 'room123', gameId: 'game@456' }
      const result = parsePermalinkParams(params)
      expect(result).toEqual({
        roomId: 'room123',
        gameId: null,
        isValid: false,
        error: 'Invalid game ID format. Game IDs may contain only letters, numbers, and hyphens.'
      })
    })

    it('should return error when game ID provided without room ID', () => {
      const params: GolfRouteParams = { gameId: 'game456' }
      const result = parsePermalinkParams(params)
      expect(result).toEqual({
        roomId: null,
        gameId: null,
        isValid: false,
        error: 'Game ID provided without room ID. Game permalinks require both room and game IDs.'
      })
    })
  })

  describe('generateRoomPermalink', () => {
    it('should generate correct room permalink', () => {
      const result = generateRoomPermalink('room123')
      expect(result).toBe('/golf/room/room123')
    })

    it('should throw error for invalid room ID', () => {
      expect(() => generateRoomPermalink('room 123')).toThrow('Invalid room ID provided for permalink generation')
    })

    it('carries the beta flag while v2 is enabled', () => {
      localStorage.setItem('golf_v2_beta', '1')
      expect(generateRoomPermalink('room123')).toBe('/golf/room/room123?golf=v2')
      localStorage.clear()
    })

    it('omits the beta flag while v2 is disabled', () => {
      localStorage.clear()
      expect(generateRoomPermalink('room123')).toBe('/golf/room/room123')
    })
  })

  describe('generateGamePermalink', () => {
    it('should generate correct game permalink', () => {
      const result = generateGamePermalink('room123', 'game456')
      expect(result).toBe('/golf/room/room123/game/game456')
    })

    it('should throw error for invalid room ID', () => {
      expect(() => generateGamePermalink('room 123', 'game456')).toThrow('Invalid room ID provided for permalink generation')
    })

    it('should throw error for invalid game ID', () => {
      expect(() => generateGamePermalink('room123', 'game 456')).toThrow('Invalid game ID provided for permalink generation')
    })

    it('carries the beta flag while v2 is enabled', () => {
      localStorage.setItem('golf_v2_beta', '1')
      expect(generateGamePermalink('room123', 'game456')).toBe('/golf/room/room123/game/game456?golf=v2')
      localStorage.clear()
    })

    it('omits the beta flag while v2 is disabled', () => {
      localStorage.clear()
      expect(generateGamePermalink('room123', 'game456')).toBe('/golf/room/room123/game/game456')
    })
  })

  describe('extractIdsFromUrl', () => {
    let originalLocation: Location

    beforeEach(() => {
      originalLocation = window.location
      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:3000'
        },
        writable: true
      })
    })

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true
      })
    })

    it('should extract room ID from room permalink', () => {
      const result = extractIdsFromUrl('http://localhost:3000/golf/room/room123')
      expect(result).toEqual({
        roomId: 'room123',
        gameId: null,
        isValid: true
      })
    })

    it('should extract room and game IDs from game permalink', () => {
      const result = extractIdsFromUrl('http://localhost:3000/golf/room/room123/game/game456')
      expect(result).toEqual({
        roomId: 'room123',
        gameId: 'game456',
        isValid: true
      })
    })

    it('should handle relative URLs', () => {
      const result = extractIdsFromUrl('/golf/room/room123')
      expect(result).toEqual({
        roomId: 'room123',
        gameId: null,
        isValid: true
      })
    })

    it('should return error for non-golf URLs', () => {
      const result = extractIdsFromUrl('http://localhost:3000/other/page')
      expect(result).toEqual({
        roomId: null,
        gameId: null,
        isValid: false,
        error: 'URL does not match golf permalink pattern'
      })
    })

    it('should return error for invalid URL format', () => {
      const result = extractIdsFromUrl('not-a-url')
      expect(result).toEqual({
        roomId: null,
        gameId: null,
        isValid: false,
        error: 'URL does not match golf permalink pattern'
      })
    })

    it('should validate extracted IDs', () => {
      const result = extractIdsFromUrl('http://localhost:3000/golf/room/room@123')
      expect(result).toEqual({
        roomId: null,
        gameId: null,
        isValid: false,
        error: 'Invalid room ID format. Room IDs may contain only letters, numbers, and hyphens.'
      })
    })
  })
})