import { describe, it, expect } from 'vitest'
import { generateRandomColor, generateRandomSpawnPosition, midiToFreq } from '../gameUtils'

describe('gameUtils', () => {
  describe('generateRandomColor', () => {
    it('generates valid RGB color values', () => {
      const color = generateRandomColor()
      
      expect(color).toHaveLength(3)
      expect(color[0]).toBeGreaterThanOrEqual(0)
      expect(color[0]).toBeLessThanOrEqual(1)
      expect(color[1]).toBeGreaterThanOrEqual(0)
      expect(color[1]).toBeLessThanOrEqual(1)
      expect(color[2]).toBeGreaterThanOrEqual(0)
      expect(color[2]).toBeLessThanOrEqual(1)
    })
  })

  describe('generateRandomSpawnPosition', () => {
    it('generates position within world boundary', () => {
      const worldBoundary = 50
      const position = generateRandomSpawnPosition(worldBoundary)
      
      expect(position).toHaveLength(3)
      expect(Math.abs(position[0])).toBeLessThanOrEqual(worldBoundary - 5) // Account for margin
      expect(position[1]).toBe(0) // Always spawn at ground level
      expect(Math.abs(position[2])).toBeLessThanOrEqual(worldBoundary - 5) // Account for margin
    })
  })

  describe('midiToFreq', () => {
    it('converts MIDI note numbers to frequencies correctly', () => {
      expect(midiToFreq(69)).toBeCloseTo(440) // A4 = 440Hz
      expect(midiToFreq(60)).toBeCloseTo(261.63) // C4
      expect(midiToFreq(72)).toBeCloseTo(523.25) // C5
    })
  })
})