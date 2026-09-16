import { describe, it, expect } from 'vitest'
import { lineVertexShaderSource, lineFragmentShaderSource } from '../shaders'

// A uniform both stages read has to say the same precision in both, or
// the program will not link: a vertex shader's floats default to high
// and a fragment shader's to medium. Nothing about that shows up until
// a real driver refuses the link, and a room whose program will not
// build is quietly skipped — so the rule is checked here instead.

const declarations = (source: string) => {
  const found = new Map<string, string>()
  for (const line of source.split('\n')) {
    const match = /^\s*uniform\s+(?:(highp|mediump|lowp)\s+)?\w+\s+(\w+)\s*;/.exec(line)
    if (match) found.set(match[2], match[1] ?? '')
  }
  return found
}

describe('the line pass shaders', () => {
  it('agrees on the precision of every uniform both stages read', () => {
    const vertex = declarations(lineVertexShaderSource)
    const fragment = declarations(lineFragmentShaderSource)
    const shared = [...vertex.keys()].filter(name => fragment.has(name))
    expect(shared.length).toBeGreaterThan(0)
    for (const name of shared) {
      expect(vertex.get(name), name).toBe(fragment.get(name))
      // And says it out loud, rather than leaning on a default that
      // differs between the two.
      expect(vertex.get(name), name).not.toBe('')
    }
  })

  it('counts a curve\'s points at a precision that can hold them', () => {
    // Medium floats stop counting exactly at 2048; the curves are longer.
    expect(lineVertexShaderSource).toMatch(/out\s+highp\s+float\s+v_index/)
    expect(lineFragmentShaderSource).toMatch(/in\s+highp\s+float\s+v_index/)
  })
})
