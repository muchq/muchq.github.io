export class PermutationBuilder {
  private mapping: Map<number, number>
  private size: number

  constructor(size: number = 4) {
    this.size = size
    this.mapping = new Map()
    // Initialize as identity permutation
    for (let i = 1; i <= size; i++) {
      this.mapping.set(i, i)
    }
  }

  static fromMapping(mapping: Map<number, number>, size: number): PermutationBuilder {
    const builder = new PermutationBuilder(size)
    builder.mapping.clear()
    builder.mapping = new Map(mapping)
    return builder
  }

  setMapping(from: number, to: number): void {
    if (from < 1 || from > this.size || to < 1 || to > this.size) {
      throw new Error('Invalid mapping indices')
    }
    
    this.mapping.set(from, to)
  }

  getMapping(): Map<number, number> {
    return new Map(this.mapping)
  }

  getMappingArray(): number[] {
    const result: number[] = []
    for (let i = 1; i <= this.size; i++) {
      result.push(this.mapping.get(i)!)
    }
    return result
  }

  isBijection(): boolean {
    if (this.mapping.size !== this.size) {
      return false
    }

    const targets = new Set(this.mapping.values())
    
    if (targets.size !== this.size) {
      return false
    }

    for (let i = 1; i <= this.size; i++) {
      if (!targets.has(i)) {
        return false
      }
    }

    return true
  }

  getBijectionErrors(): {
    unmappedSources: number[]
    unmappedTargets: number[]
    duplicateTargets: Map<number, number[]>
  } {
    const unmappedSources: number[] = []
    const targetCounts = new Map<number, number[]>()
    const mappedTargets = new Set<number>()

    for (let i = 1; i <= this.size; i++) {
      const target = this.mapping.get(i)
      if (target === undefined) {
        unmappedSources.push(i)
      } else {
        mappedTargets.add(target)
        const sources = targetCounts.get(target) || []
        sources.push(i)
        targetCounts.set(target, sources)
      }
    }

    const unmappedTargets: number[] = []
    for (let i = 1; i <= this.size; i++) {
      if (!mappedTargets.has(i)) {
        unmappedTargets.push(i)
      }
    }

    const duplicateTargets = new Map<number, number[]>()
    for (const [target, sources] of targetCounts.entries()) {
      if (sources.length > 1) {
        duplicateTargets.set(target, sources)
      }
    }

    return {
      unmappedSources,
      unmappedTargets,
      duplicateTargets
    }
  }

  getCycles(): number[][] | null {
    if (!this.isBijection()) {
      return null
    }

    const visited = new Set<number>()
    const cycles: number[][] = []

    for (let i = 1; i <= this.size; i++) {
      if (!visited.has(i)) {
        const cycle: number[] = []
        let current = i

        while (!visited.has(current)) {
          visited.add(current)
          cycle.push(current)
          current = this.mapping.get(current)!
        }

        if (cycle.length > 1) {
          cycles.push(cycle)
        }
      }
    }

    return cycles
  }

  getCycleNotation(): string | null {
    const cycles = this.getCycles()
    
    if (cycles === null) {
      return null
    }

    if (cycles.length === 0) {
      return 'Identity'
    }

    return cycles.map(cycle => `(${cycle.join(' ')})`).join('')
  }

  isIdentity(): boolean {
    if (!this.isBijection()) {
      return false
    }

    for (let i = 1; i <= this.size; i++) {
      if (this.mapping.get(i) !== i) {
        return false
      }
    }

    return true
  }

  reset(): void {
    this.mapping.clear()
    for (let i = 1; i <= this.size; i++) {
      this.mapping.set(i, i)
    }
  }

  randomize(): void {
    const targets = Array.from({ length: this.size }, (_, i) => i + 1)
    
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[targets[i], targets[j]] = [targets[j], targets[i]]
    }

    this.mapping.clear()
    for (let i = 1; i <= this.size; i++) {
      this.mapping.set(i, targets[i - 1])
    }
  }

  clone(): PermutationBuilder {
    return PermutationBuilder.fromMapping(this.mapping, this.size)
  }
}