import styles from './NavStatus.module.css'

export type NavStatusTone = 'ok' | 'busy' | 'warn' | 'error' | 'neutral'

interface NavStatusProps {
  tone: NavStatusTone
  label: string
  onAction?: () => void
  actionLabel?: string
  actionTitle?: string
}

const NavStatus = ({ tone, label, onAction, actionLabel = '🔄', actionTitle }: NavStatusProps) => {
  return (
    <div className={styles.status}>
      <span className={`${styles.pill} ${styles[tone]}`}>{label}</span>
      {onAction && (
        <button className={styles.actionButton} onClick={onAction} title={actionTitle}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default NavStatus
