import styles from './Topology.module.css'

interface LayerTogglesProps {
  kinds: string[]
  enabled: ReadonlySet<string>
  onToggle: (kind: string) => void
}

const LayerToggles = ({ kinds, enabled, onToggle }: LayerTogglesProps) => (
  <div className={styles.toggles}>
    {kinds.map(kind => (
      <label key={kind} className={styles.toggle}>
        <input type="checkbox" checked={enabled.has(kind)} onChange={() => onToggle(kind)} />
        {kind}
      </label>
    ))}
  </div>
)

export default LayerToggles
