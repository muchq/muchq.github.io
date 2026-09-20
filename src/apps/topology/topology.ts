// The deployment diagram, as data. The source is MoonBase's
// docs/DEPLOYMENT.md, copied here as topology.mmd — mermaid's flowchart
// syntax, parsed rather than rendered: this page draws its own SVG.

export type Edge = { from: string; to: string; kind: string }
export type Node = { id: string; label: string; group: string }
export type Group = { id: string; label: string }

export type Topology = {
  nodes: Node[]
  edges: Edge[]
  groups: Group[]
  clicks: Record<string, string>
}

const EDGE = /^\s*([\w-]+)\s*(?:-->|-\.->)\|(\w+)\|\s*([\w-]+)\s*$/
const NODE = /^\s*([\w-]+)[[(]+"?([^"\])]*)"?[\])]+/
const SUBGRAPH = /^\s*subgraph\s+([\w-]+)\["?([^"\]]*)"?\]/
const CLICK = /^\s*click\s+([\w-]+)\s+"([^"]+)"/

export function parseTopology(src: string): Topology {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const groups: Group[] = []
  const clicks: Record<string, string> = {}
  let group = ''

  for (const line of src.split('\n')) {
    const subgraph = SUBGRAPH.exec(line)
    if (subgraph) {
      group = subgraph[1]
      groups.push({ id: group, label: subgraph[2] })
      continue
    }
    if (/^\s*end\s*$/.test(line)) {
      group = ''
      continue
    }
    const click = CLICK.exec(line)
    if (click) {
      clicks[click[1]] = click[2]
      continue
    }
    const edge = EDGE.exec(line)
    if (edge) {
      edges.push({ from: edge[1], to: edge[3], kind: edge[2] })
      continue
    }
    const node = NODE.exec(line)
    if (node) nodes.push({ id: node[1], label: node[2] || node[1], group })
  }
  return { nodes, edges, groups, clicks }
}

// Dropping a kind strands the nodes it connected and empties the groups that
// held them. Both go, or the drawing keeps boxes with nothing attached.
export function filterTopology(topology: Topology, kinds: readonly string[]): Topology {
  const enabled = new Set(kinds)
  const edges = topology.edges.filter(e => enabled.has(e.kind))
  const live = new Set(edges.flatMap(e => [e.from, e.to]))
  const nodes = topology.nodes.filter(n => live.has(n.id))
  const populated = new Set(nodes.map(n => n.group))
  return {
    ...topology,
    edges,
    nodes,
    groups: topology.groups.filter(g => populated.has(g.id)),
  }
}

// Groups whose nodes back a real container, plus the one container in a mixed
// group. Membership decides it rather than a list of ids, so a service added to
// the diagram joins without a second edit here, and a public name or a UI route
// never reports itself perpetually unknown.
const CONTAINER_GROUPS = new Set(['edge', 'apps', 'obs'])
const CONTAINER_NODES = new Set(['shared_postgres'])

export function containerIds(topology: Topology): Set<string> {
  return new Set(
    topology.nodes
      .filter(n => CONTAINER_GROUPS.has(n.group) || CONTAINER_NODES.has(n.id))
      .map(n => n.id)
  )
}

const SITE = 'https://muchq.com'

export function routeFor(href: string): string | null {
  return href.startsWith(SITE) ? href.slice(SITE.length) : null
}
