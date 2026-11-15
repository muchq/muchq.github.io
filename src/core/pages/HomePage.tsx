import Navigation from '@/shared/components/Navigation'
import JuliaSetBackground from '@/shared/components/JuliaSetBackground'
import MathAnimations from '@/shared/components/MathAnimations'
import styles from './HomePage.module.css'

const HomePage = () => {
  return (
    <div className={styles.homePage}>
      <JuliaSetBackground />
      <Navigation floating />

      <main className={styles.content}>
        <h1 className={styles.greeting} aria-label="Hello">
          {'Hello'.split('').map((letter, index) => (
            <span key={index} aria-hidden="true">{letter}</span>
          ))}
        </h1>
        <MathAnimations />
      </main>
    </div>
  )
}

export default HomePage
