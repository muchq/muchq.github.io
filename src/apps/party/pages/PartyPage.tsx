import Navigation from '@/shared/components/Navigation'
import PartyGame from '../components/PartyGame'
import styles from './PartyPage.module.css'

const PartyPage = () => {
  return (
    <div className={styles.partyPage}>
      <Navigation appName="Rescue Party" />
      <main className={styles.content}>
        <PartyGame />
      </main>
    </div>
  )
}

export default PartyPage
