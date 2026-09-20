import { useEffect, useMemo, useState } from 'react'
import Navigation from '@/shared/components/Navigation'
import type { ContainerState } from '@/apps/metrics-systems/api'
import { fetchNodeStates } from '../api'
import LayerToggles from '../components/LayerToggles'
import TopologyGraph from '../components/TopologyGraph'
import styles from '../components/Topology.module.css'
import { filterTopology, parseTopology } from '../topology'
import source from '../topology.mmd?raw'

// The deployed system, from MoonBase's docs/DEPLOYMENT.md. Node colour is live
// container state; unchecking a layer removes that kind of edge, the nodes it
// strands, and the groups they emptied.
const TopologyPage = () => {
  const topology = useMemo(() => parseTopology(source), [])
  const kinds = useMemo(
    () => [...new Set(topology.edges.map(e => e.kind))].sort(),
    [topology]
  )
  const [enabled, setEnabled] = useState<ReadonlySet<string>>(() => new Set(kinds))
  const [states, setStates] = useState<Map<string, ContainerState> | null>(null)
  const [asked, setAsked] = useState(false)

  useEffect(() => {
    let live = true
    void fetchNodeStates().then(next => {
      if (!live) return
      setStates(next)
      setAsked(true)
    })
    return () => {
      live = false
    }
  }, [])

  const shown = useMemo(() => filterTopology(topology, [...enabled]), [topology, enabled])

  const toggle = (kind: string) =>
    setEnabled(prev => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })

  return (
    <>
      <Navigation appName="Topology" />
      <main>
        <h1>Topology</h1>
        <LayerToggles kinds={kinds} enabled={enabled} onToggle={toggle} />
        {asked && states === null && <p className={styles.note}>Status unavailable</p>}
        <TopologyGraph topology={shown} states={states} />
      </main>
    </>
  )
}

export default TopologyPage
