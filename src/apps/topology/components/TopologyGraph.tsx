import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ContainerState } from '@/apps/metrics-systems/api'
import { containerNodes, parseTopology, routeFor } from '../topology'
import styles from './Topology.module.css'

interface TopologyGraphProps {
  source: string
  states: Map<string, ContainerState> | null
}

// Plain names rather than CSS-module keys: these are written onto mermaid's
// own SVG, which the module's :global rules then style, and they stay
// assertable in a test run that does not process CSS.
const STATE_CLASS: Record<ContainerState, string> = {
  up: 'state-up',
  'crash looping': 'state-crash-looping',
  'not reporting': 'state-not-reporting',
}

const UNKNOWN = 'state-unknown'
const DIMMED = 'is-dimmed'

// Mermaid 12 builds a node's DOM id as `${renderId}-flowchart-${node}-${n}`.
// Both ends have to come off, and the render id has to be the one this draw
// used — it carries a timestamp, so a stale prefix matches nothing.
const nodeIdOf = (el: Element, renderId: string): string => {
  const prefix = `${renderId}-flowchart-`
  const id = el.id || ''
  return id.startsWith(prefix) ? id.slice(prefix.length).replace(/-\d+$/, '') : ''
}

const TopologyGraph = ({ source, states }: TopologyGraphProps) => {
  const host = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let live = true
    const draw = async () => {
      // Route-split: mermaid is large and only this page draws.
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
      const renderId = `topology-${Date.now()}`
      const { svg } = await mermaid.render(renderId, source)
      if (!live || !host.current) return
      host.current.innerHTML = svg
      paint(host.current, renderId)
    }

    const paint = (root: HTMLElement, renderId: string) => {
      const { edges } = parseTopology(source)
      const containers = containerNodes(source)
      for (const el of root.querySelectorAll('.node')) {
        const id = nodeIdOf(el, renderId)
        if (!containers.has(id)) continue
        const state = states?.get(id)
        el.classList.add(state ? STATE_CLASS[state] : UNKNOWN)
      }
      for (const el of root.querySelectorAll('.node')) {
        const id = nodeIdOf(el, renderId)
        const neighbours = new Set([id])
        for (const e of edges) {
          if (e.from === id) neighbours.add(e.to)
          if (e.to === id) neighbours.add(e.from)
        }
        el.addEventListener('mouseenter', () => {
          for (const other of root.querySelectorAll('.node')) {
            other.classList.toggle(DIMMED, !neighbours.has(nodeIdOf(other, renderId)))
          }
        })
        el.addEventListener('mouseleave', () => {
          for (const other of root.querySelectorAll('.node')) other.classList.remove(DIMMED)
        })
      }
    }

    void draw()
    return () => {
      live = false
    }
  }, [source, states])

  // Mermaid emits a native anchor, which the router does not intercept:
  // without this every node click is a full reload of the SPA.
  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as Element).closest('a')
    const href = anchor?.getAttribute('href')
    if (!href) return
    const route = routeFor(href)
    if (route === null) return
    event.preventDefault()
    navigate(route)
  }

  return <div ref={host} className={styles.graph} onClick={onClick} />
}

export default TopologyGraph
