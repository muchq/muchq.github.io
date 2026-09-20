import { describe, expect, it } from 'vitest'
import source from '../topology.mmd?raw'
import { containerIds, filterTopology, parseTopology } from '../topology'

// Against the real diagram, not a fixture. The fixtures pin the parsing rules;
// this pins that the copy in this repo still satisfies them.
describe('topology.mmd', () => {
  it('declares every node its edges refer to', () => {
    const { nodes, edges } = parseTopology(source)
    const declared = new Set(nodes.map(n => n.id))

    const dangling = edges.flatMap(e => [e.from, e.to]).filter(id => !declared.has(id))

    expect([...new Set(dangling)]).toEqual([])
  })

  it('counts caddy and the database as containers, and no public name or UI route', () => {
    const containers = containerIds(parseTopology(source))

    expect(containers.has('caddy')).toBe(true)
    expect(containers.has('shared_postgres')).toBe(true)
    expect([...containers].filter(id => id.startsWith('ui_'))).toEqual([])
    expect(containers.has('muchq_com')).toBe(false)
    expect(containers.has('s3')).toBe(false)
  })

  it('leaves no empty group and no stranded node when filtered to one kind', () => {
    const topology = parseTopology(source)
    for (const kind of new Set(topology.edges.map(e => e.kind))) {
      const only = filterTopology(topology, [kind])
      const held = new Set(only.nodes.map(n => n.group))

      expect(only.nodes.length, `${kind} kept no nodes`).toBeGreaterThan(0)
      for (const group of only.groups) {
        expect(held.has(group.id), `${group.label} is empty under ${kind}`).toBe(true)
      }
    }
  })
})
