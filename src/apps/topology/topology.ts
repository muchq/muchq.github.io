// The deployment diagram, as data. The source is MoonBase's
// docs/DEPLOYMENT.md, copied here as topology.mmd.

export type Edge = { from: string; to: string; kind: string }

export type Topology = { nodes: string[]; edges: Edge[] }

const EDGE = /^\s*([\w-]+)\s*(?:-->|-\.->)\|(\w+)\|\s*([\w-]+)\s*$/
const NODE = /^\s*([\w-]+)[[(]/

export function parseTopology(src: string): Topology {
  const nodes: string[] = []
  const edges: Edge[] = []
  for (const line of src.split('\n')) {
    if (/^\s*subgraph\b/.test(line)) continue
    const edge = EDGE.exec(line)
    if (edge) {
      edges.push({ from: edge[1], to: edge[3], kind: edge[2] })
      continue
    }
    const node = NODE.exec(line)
    if (node) nodes.push(node[1])
  }
  return { nodes, edges }
}

// Filtering has to prune nodes as well as edges. Node declarations sit inside
// subgraphs, so dropping a kind otherwise leaves boxes with nothing attached —
// a sql-only view strands most of the diagram.
export function filterByKinds(src: string, kinds: readonly string[]): string {
  const enabled = new Set(kinds)
  const kept = parseTopology(src).edges.filter(e => enabled.has(e.kind))
  const live = new Set(kept.flatMap(e => [e.from, e.to]))

  return src
    .split('\n')
    .filter(line => {
      const edge = EDGE.exec(line)
      if (edge) return enabled.has(edge[2])
      const node = NODE.exec(line)
      if (node) return live.has(node[1])
      return true
    })
    .join('\n')
}

// Subgraphs whose nodes back a real container, plus the one container that
// lives in a mixed group. Membership decides the join rather than a list of
// node ids, so a service added to the diagram joins without a second edit —
// and a public name or UI route never reports itself perpetually unknown.
const CONTAINER_GROUPS = new Set(['apps', 'obs'])
const CONTAINER_NODES = new Set(['shared_postgres'])

const SUBGRAPH = /^\s*subgraph\s+([\w-]+)\b/

export function containerNodes(src: string): Set<string> {
  const containers = new Set<string>()
  let group = ''
  for (const line of src.split('\n')) {
    const subgraph = SUBGRAPH.exec(line)
    if (subgraph) {
      group = subgraph[1]
      continue
    }
    if (/^\s*end\s*$/.test(line)) {
      group = ''
      continue
    }
    const node = NODE.exec(line)
    if (!node) continue
    if (CONTAINER_GROUPS.has(group) || CONTAINER_NODES.has(node[1])) containers.add(node[1])
  }
  return containers
}

const SITE = 'https://muchq.com'

// Mermaid renders a click directive as a native anchor, which react-router
// does not intercept — without this the page reloads on every node click.
export function routeFor(href: string): string | null {
  return href.startsWith(SITE) ? href.slice(SITE.length) : null
}
