import { Link } from 'react-router-dom'
import JuliaSetBackground from '@/components/JuliaSetBackground'
import styles from './NotFoundPage.module.css'

const NotFoundPage = () => {
  return (
    <div className={styles.notFoundPage}>
      <JuliaSetBackground />
      <main className={styles.content}>
        <div className={styles.errorContainer}>
          <h1 className={styles.errorCode}>404</h1>
          <h2 className={styles.errorMessage}>Page Not Found</h2>
          <p className={styles.errorDescription}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/" className={styles.homeButton}>
            Return Home
          </Link>
        </div>
      </main>
    </div>
  )
}

export default NotFoundPage