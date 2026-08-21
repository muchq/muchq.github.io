import { useEffect, useState } from 'react'
import Navigation from '@/shared/components/Navigation'
import NavTagline from '@/shared/components/nav/NavTagline'
import ShortenCard from '../components/ShortenCard'
import RecentLinks from '../components/RecentLinks'
import { addRecent, clearRecent, loadRecent, type RecentLink } from '../recent'
import styles from './R3drPage.module.css'

const R3drPage = () => {
  const [recent, setRecent] = useState<RecentLink[]>(() => loadRecent(Date.now()))

  // Re-render each minute so "expires in …" stays true in a tab left open,
  // and dead links drop out. In-memory prune, not a storage reload — the
  // list must survive when storage doesn't.
  useEffect(() => {
    const id = window.setInterval(
      () => setRecent(prev => prev.filter(link => link.expiresAt > Date.now())),
      60_000
    )
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={styles.container}>
      <Navigation appName="r3dr" context={<NavTagline text="URL Shortener" />} />
      <header className={styles.header}>
        <h1 className={styles.wordmark}>
          r<span className={styles.blossom}>3</span>dr
        </h1>
        <p className={styles.tagline}>
          Shorten a link. Share it anywhere. It expires on your schedule.
        </p>
      </header>
      <main className={styles.content}>
        <ShortenCard onMinted={link => setRecent(prev => addRecent(prev, link))} />
        <RecentLinks
          links={recent}
          onClear={() => {
            clearRecent()
            setRecent([])
          }}
        />
      </main>
      <footer className={styles.footer}>Links always expire — 30 days max.</footer>
    </div>
  )
}

export default R3drPage
