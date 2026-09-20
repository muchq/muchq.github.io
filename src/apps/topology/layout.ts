import dagre from '@dagrejs/dagre'
import type { Edge, Group, Node, Topology } from './topology'

export type PlacedNode = Node & { x: number; y: number; width: number; height: number }
export type PlacedCluster = Group & { x: number; y: number; width: number; height: number }
export type PlacedEdge = Edge & { points: { x: number; y: number }[] }

export type Placed = {
  nodes: PlacedNode[]
  edges: PlacedEdge[]
  clusters: PlacedCluster[]
  width: number
  height: number
}

const CHAR = 7.2
const PAD_X = 20
const HEIGHT = 34
const MARGIN = 12

const widthOf = (label: string) => Math.max(72, Math.round(label.length * CHAR) + PAD_X * 2)

// Dagre positions by centre; everything downstream wants a top-left corner.
const corner = (v: { x: number; y: number; width: number; height: number }) => ({
  x: v.x - v.width / 2,
  y: v.y - v.height / 2,
  width: v.width,
  height: v.height,
})

export function layout(topology: Topology): Placed {
  const g = new dagre.graphlib.Graph({ compound: true, multigraph: true })
  g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 56, marginx: MARGIN, marginy: MARGIN })
  g.setDefaultEdgeLabel(() => ({}))

  for (const group of topology.groups) g.setNode(group.id, { label: group.label })
  for (const node of topology.nodes) {
    g.setNode(node.id, { width: widthOf(node.label), height: HEIGHT })
    if (node.group) g.setParent(node.id, node.group)
  }
  for (const edge of topology.edges) g.setEdge(edge.from, edge.to, {}, edge.kind)

  dagre.layout(g)

  const nodes = topology.nodes.map(node => ({ ...node, ...corner(g.node(node.id)) }))
  const clusters = topology.groups.map(group => ({ ...group, ...corner(g.node(group.id)) }))
  const edges = topology.edges.map(edge => ({
    ...edge,
    points: (g.edge(edge.from, edge.to, edge.kind)?.points ?? []).map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })),
  }))

  const right = (b: { x: number; width: number }) => b.x + b.width
  const bottom = (b: { y: number; height: number }) => b.y + b.height
  const boxes = [...nodes, ...clusters]
  return {
    nodes,
    edges,
    clusters,
    width: Math.max(0, ...boxes.map(right)) + MARGIN,
    height: Math.max(0, ...boxes.map(bottom)) + MARGIN,
  }
}
