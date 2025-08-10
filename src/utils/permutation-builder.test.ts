import { describe, it, expect } from 'vitest'
import { PermutationBuilder } from './permutation-builder'

describe('PermutationBuilder', () => {
  describe('Basic mapping operations', () => {
    it('should start with identity mapping', () => {
      const builder = new PermutationBuilder(4)
      expect(builder.getMappingArray()).toEqual([1, 2, 3, 4])
      expect(builder.isBijection()).toBe(true)
      expect(builder.isIdentity()).toBe(true)
    })

    it('should set individual mappings', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(3, 4)
      
      expect(builder.getMappingArray()).toEqual([2, 2, 4, 4])
      expect(builder.isBijection()).toBe(false)
    })

    it('should allow identity mappings', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 1)
      builder.setMapping(2, 2)
      
      expect(builder.getMappingArray()).toEqual([1, 2, 3, 4])
    })

    it('should overwrite existing mappings', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(1, 3)
      
      expect(builder.getMappingArray()).toEqual([3, 2, 3, 4])
    })
  })

  describe('Bijection validation', () => {
    it('should detect valid bijection', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(2, 1)
      builder.setMapping(3, 4)
      builder.setMapping(4, 3)
      
      expect(builder.isBijection()).toBe(true)
      expect(builder.getCycleNotation()).toBe('(1 2)(3 4)')
    })

    it('should detect incomplete mapping', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(2, 3)
      
      expect(builder.isBijection()).toBe(false)
      
      const errors = builder.getBijectionErrors()
      expect(errors.unmappedSources).toEqual([])
      expect(errors.unmappedTargets).toEqual([1])
      expect(errors.duplicateTargets.get(3)).toEqual([2, 3])
    })

    it('should detect duplicate targets', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(3, 2)
      
      expect(builder.isBijection()).toBe(false)
      
      const errors = builder.getBijectionErrors()
      expect(errors.unmappedSources).toEqual([])
      expect(errors.unmappedTargets).toEqual([1, 3])
      expect(errors.duplicateTargets.get(2)).toEqual([1, 2, 3])
    })

    it('should detect all unmapped targets', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(2, 3)
      builder.setMapping(3, 4)
      builder.setMapping(4, 2)
      
      expect(builder.isBijection()).toBe(false)
      
      const errors = builder.getBijectionErrors()
      expect(errors.unmappedSources).toEqual([])
      expect(errors.unmappedTargets).toEqual([1])
      expect(errors.duplicateTargets.get(2)).toEqual([1, 4])
    })
  })

  describe('Cycle notation', () => {
    it('should return null for non-bijection', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(2, 3)
      
      expect(builder.getCycleNotation()).toBe(null)
      expect(builder.getCycles()).toBe(null)
    })

    it('should return Identity for identity permutation', () => {
      const builder = new PermutationBuilder(4)
      
      expect(builder.isBijection()).toBe(true)
      expect(builder.getCycleNotation()).toBe('Identity')
      expect(builder.isIdentity()).toBe(true)
    })

    it('should generate cycle notation for 2-cycle', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(2, 1)
      builder.setMapping(3, 3)
      builder.setMapping(4, 4)
      
      expect(builder.getCycleNotation()).toBe('(1 2)')
    })

    it('should generate cycle notation for 3-cycle', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(2, 3)
      builder.setMapping(3, 1)
      builder.setMapping(4, 4)
      
      expect(builder.getCycleNotation()).toBe('(1 2 3)')
    })

    it('should generate cycle notation for multiple cycles', () => {
      const builder = new PermutationBuilder(6)
      builder.setMapping(1, 2)
      builder.setMapping(2, 3)
      builder.setMapping(3, 1)
      builder.setMapping(4, 5)
      builder.setMapping(5, 4)
      builder.setMapping(6, 6)
      
      expect(builder.getCycleNotation()).toBe('(1 2 3)(4 5)')
    })
  })

  describe('Utility methods', () => {
    it('should reset to identity mapping', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(2, 1)
      builder.reset()
      
      expect(builder.getMappingArray()).toEqual([1, 2, 3, 4])
      expect(builder.isBijection()).toBe(true)
      expect(builder.isIdentity()).toBe(true)
    })

    it('should create random bijection', () => {
      const builder = new PermutationBuilder(4)
      builder.randomize()
      
      expect(builder.isBijection()).toBe(true)
      
      const mapping = builder.getMappingArray()
      const targets = new Set(mapping)
      expect(targets.size).toBe(4)
    })

    it('should clone correctly', () => {
      const builder = new PermutationBuilder(4)
      builder.setMapping(1, 2)
      builder.setMapping(2, 3)
      
      const clone = builder.clone()
      clone.setMapping(3, 4)
      
      expect(builder.getMappingArray()).toEqual([2, 3, 3, 4])
      expect(clone.getMappingArray()).toEqual([2, 3, 4, 4])
    })
  })
})