import type { Status } from '../gate'
import styles from '../Proofs.module.css'

const STATUS_LABEL: Record<Status, string> = {
  new: 'not started',
  working: 'in progress',
  solved: 'solved',
  shaky: 'redo scheduled',
  due: 'redo due',
}

export function StatusChip({ status }: { status: Status }) {
  return <span className={`${styles.chip} ${styles[`chip-${status}`]}`}>{STATUS_LABEL[status]}</span>
}
