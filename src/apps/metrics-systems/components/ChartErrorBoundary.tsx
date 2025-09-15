import { Component, ErrorInfo, ReactNode } from 'react'
import styles from './MetricsDashboard.module.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chart error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      return (
        <div className={styles.chartError}>
          <div className={styles.chartErrorIcon}>⚠️</div>
          <div className={styles.chartErrorMessage}>
            Chart failed to render
            <div className={styles.chartErrorDetails}>
              Data formatting issue detected
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ChartErrorBoundary