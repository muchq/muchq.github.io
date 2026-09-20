import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ContainerState } from '@/apps/metrics-systems/api'
import { layout } from '../layout'
import { containerIds, routeFor, type Topology } from '../topology'
import styles from './Topology.module.css'

interface TopologyGraphProps {
  topology: Topology
  states: Map<string, ContainerState> | null
}

const STATE_ATTR: Record<ContainerState, string> = {
  up: 'up',
  'crash looping': 'crash-looping',
  'not reporting': 'not-reporting',
}

const pathOf = (points: { x: number; y: number }[]) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

const TopologyGraph = ({ topology, states }: TopologyGraphProps) => {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState<string | null>(null)

  const placed = useMemo(() => layout(topology), [topology])
  const containers = useMemo(() => containerIds(topology), [topology])

  // Everything the hovered node touches, itself included. Null means no hover,
  // which is not the same as an empty set: an isolated node dims the rest.
  const lit = useMemo(() => {
    if (hovered === null) return null
    const near = new Set([hovered])
    for (const e of placed.edges) {
      if (e.from === hovered) near.add(e.to)
      if (e.to === hovered) near.add(e.from)
    }
    return near
  }, [hovered, placed.edges])

  const open = (id: string) => {
    const target = topology.clicks[id]
    if (!target) return
    const route = routeFor(target)
    if (route === null) return
    navigate(route)
  }

  return (
    <svg
      className={styles.graph}
      viewBox={`0 0 ${placed.width} ${placed.height}`}
      role="img"
      aria-label="Deployment topology"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" className={styles.arrowHead} />
        </marker>
      </defs>

      {placed.clusters.map(cluster => (
        <g key={cluster.id} className={styles.cluster}>
          <rect x={cluster.x} y={cluster.y} width={cluster.width} height={cluster.height} rx={8} />
          <text x={cluster.x + 10} y={cluster.y + 16}>
            {cluster.label}
          </text>
        </g>
      ))}

      {placed.edges.map(edge => (
        <path
          key={`${edge.from}-${edge.kind}-${edge.to}`}
          d={pathOf(edge.points)}
          className={styles.edge}
          data-kind={edge.kind}
          data-dimmed={lit !== null && !(lit.has(edge.from) && lit.has(edge.to))}
          markerEnd="url(#arrow)"
        />
      ))}

      {placed.nodes.map(node => {
        const isContainer = containers.has(node.id)
        const state = isContainer ? (states?.get(node.id) ?? null) : null
        const clickable = Boolean(topology.clicks[node.id])
        return (
          <g
            key={node.id}
            data-node={node.id}
            data-state={isContainer ? (state ? STATE_ATTR[state] : 'unknown') : undefined}
            data-dimmed={lit !== null && !lit.has(node.id)}
            className={clickable ? styles.clickable : styles.node}
            role={clickable ? 'link' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => open(node.id)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') open(node.id)
            }}
          >
            <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={5} />
            <text x={node.x + node.width / 2} y={node.y + node.height / 2}>
              {node.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default TopologyGraph
