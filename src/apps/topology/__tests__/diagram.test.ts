import { describe, expect, it } from 'vitest'
import source from '../topology.mmd?raw'
import { containerNodes, filterByKinds, parseTopology } from '../topology'

// Against the real diagram, not a fixture. The fixtures pin the parsing rules;
// this pins that the copy in this repo still satisfies them.
describe('topology.mmd', () => {
  it('declares every node its edges refer to', () => {
    const { nodes, edges } = parseTopology(source)
    const declared = new Set(nodes)

    const dangling = edges.flatMap(e => [e.from, e.to]).filter(id => !declared.has(id))

    expect([...new Set(dangling)]).toEqual([])
  })

  it('counts caddy and the database as containers, and no public name or UI route', () => {
    const containers = containerNodes(source)

    expect(containers.has('caddy')).toBe(true)
    expect(containers.has('shared_postgres')).toBe(true)
    expect([...containers].filter(id => id.startsWith('ui_'))).toEqual([])
    expect(containers.has('muchq_com')).toBe(false)
    expect(containers.has('s3')).toBe(false)
  })

  it('leaves no empty group behind when filtered to one kind', () => {
    for (const kind of new Set(parseTopology(source).edges.map(e => e.kind))) {
      const only = filterByKinds(source, [kind])
      const groups = only.split('\n').filter(l => /^\s*subgraph\b/.test(l))
      const nodes = new Set(parseTopology(only).nodes)

      expect(nodes.size, `${kind} kept groups but no nodes`).toBeGreaterThan(0)
      for (const group of groups) {
        const body = only.split(group)[1]?.split(/^\s*end\s*$/m)[0] ?? ''
        expect(parseTopology(body).nodes.length, `${group.trim()} is empty under ${kind}`).toBeGreaterThan(0)
      }
    }
  })
})
