import Navigation from '@/components/Navigation'
import JuliaSetBackground from '@/components/JuliaSetBackground'
import MathAnimations from '@/components/MathAnimations'
import styles from './HomePage.module.css'
import './HomePage.css'

const HomePage = () => {
  return (
    <div className={styles.homePage}>
      <JuliaSetBackground />
      <Navigation className="homepage-nav" />
      <MathAnimations />
      
      <main className={styles.content}>
        <h1>Hello</h1>
        <p>Welcome to my portfolio</p>
      </main>
    </div>
  )
}

export default HomePage