import styles from './NavTagline.module.css'

interface NavTaglineProps {
  text: string
}

const NavTagline = ({ text }: NavTaglineProps) => {
  return <div className={styles.tagline}>{text}</div>
}

export default NavTagline
