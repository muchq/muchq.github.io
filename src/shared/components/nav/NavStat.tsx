import styles from './NavStat.module.css'

interface NavStatProps {
  label?: string
  value: string
}

const NavStat = ({ label, value }: NavStatProps) => {
  return (
    <div className={styles.stat}>
      {label ? `${label}: ` : ''}
      {value}
    </div>
  )
}

export default NavStat
