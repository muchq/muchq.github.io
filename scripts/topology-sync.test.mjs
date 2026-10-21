import { describe, expect, it } from 'vitest'
import { extractDiagram } from './topology-sync.mjs'

// The topology page's diagram is MoonBase's docs/DEPLOYMENT.md's one
// mermaid block, byte for byte.
describe('extractDiagram', () => {
  it('takes the mermaid block between its fences, every line ended', () => {
    const doc = 'intro\n\n```mermaid\nflowchart LR\n  a --> b\n```\n\nafter\n```sh\nls\n```\n'
    expect(extractDiagram(doc)).toBe('flowchart LR\n  a --> b\n')
  })

  it('refuses a doc with no mermaid block, or more than one', () => {
    expect(() => extractDiagram('no diagram\n')).toThrow(/one mermaid block/)
    expect(() => extractDiagram('```mermaid\na\n```\n```mermaid\nb\n```\n')).toThrow(/one mermaid block/)
  })

  it('refuses a block left open', () => {
    expect(() => extractDiagram('```mermaid\nflowchart LR\n')).toThrow(/unclosed/)
  })
})
