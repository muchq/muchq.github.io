import { useEffect, useMemo, useState } from 'react'
import Navigation from '@/shared/components/Navigation'
import type { ContainerState } from '@/apps/metrics-systems/api'
import { fetchNodeStates } from '../api'
import LayerToggles from '../components/LayerToggles'
import TopologyGraph from '../components/TopologyGraph'
import styles from '../components/Topology.module.css'
import { filterByKinds, parseTopology } from '../topology'
import source from '../topology.mmd?raw'

// The deployed system, from MoonBase's docs/DEPLOYMENT.md. Node colour is live
// container state; unchecking a layer removes that kind of edge, and the nodes
// it leaves stranded.
const TopologyPage = () => {
  const kinds = useMemo(
    () => [...new Set(parseTopology(source).edges.map(e => e.kind))].sort(),
    []
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

  const shown = useMemo(() => filterByKinds(source, [...enabled]), [enabled])

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
        <TopologyGraph source={shown} states={states} />
      </main>
    </>
  )
}

export default TopologyPage
