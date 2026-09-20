import { describe, expect, it } from 'vitest'
import { layout } from '../layout'
import { parseTopology } from '../topology'

const topology = parseTopology(`flowchart LR
  subgraph edge["Host edge"]
    caddy["caddy"]
  end

  subgraph apps["Applications"]
    deja["deja"]
  end

  caddy -->|http| deja
`)

describe('layout', () => {
  it('places every node somewhere, with a size', () => {
    const placed = layout(topology)

    for (const node of placed.nodes) {
      expect(Number.isFinite(node.x), node.id).toBe(true)
      expect(node.width).toBeGreaterThan(0)
      expect(node.height).toBeGreaterThan(0)
    }
    expect(placed.nodes).toHaveLength(2)
  })

  it('runs left to right, so a caller sits left of what it calls', () => {
    const placed = layout(topology)
    const at = (id: string) => placed.nodes.find(n => n.id === id)!

    expect(at('caddy').x).toBeLessThan(at('deja').x)
  })

  it('boxes each group around the nodes it holds', () => {
    const placed = layout(topology)
    const apps = placed.clusters.find(c => c.id === 'apps')!
    const deja = placed.nodes.find(n => n.id === 'deja')!

    expect(apps.label).toBe('Applications')
    expect(deja.x).toBeGreaterThanOrEqual(apps.x)
    expect(deja.x + deja.width).toBeLessThanOrEqual(apps.x + apps.width)
  })

  it('gives every edge a path to draw', () => {
    const placed = layout(topology)

    expect(placed.edges[0].points.length).toBeGreaterThanOrEqual(2)
    expect(placed.edges[0].kind).toBe('http')
  })

  it('reports a canvas big enough to hold what it placed', () => {
    const placed = layout(topology)

    for (const node of placed.nodes) {
      expect(node.x + node.width).toBeLessThanOrEqual(placed.width)
      expect(node.y + node.height).toBeLessThanOrEqual(placed.height)
    }
  })
})
