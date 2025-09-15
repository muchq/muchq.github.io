import Navigation from '@/shared/components/Navigation'
import JuliaSetBackground from '@/shared/components/JuliaSetBackground'
import MathAnimations from '@/shared/components/MathAnimations'
import styles from './HomePage.module.css'
import './HomePage.css'

const HomePage = () => {
  return (
    <div className={styles.homePage}>
      <JuliaSetBackground />
      <Navigation className="homepage-nav" />
      
      <main className={styles.content}>
        <h1>Hello</h1>
        <MathAnimations />
      </main>
    </div>
  )
}

export default HomePage