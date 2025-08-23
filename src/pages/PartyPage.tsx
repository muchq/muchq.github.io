import PartyNavigation from '@/components/PartyNavigation'
import PartyGame from '@/components/PartyGame'
import styles from './PartyPage.module.css'

const PartyPage = () => {
  return (
    <div className={styles.partyPage}>
      <PartyNavigation />
      <main className={styles.content}>
        <PartyGame />
      </main>
    </div>
  )
}

export default PartyPage