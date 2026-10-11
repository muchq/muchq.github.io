import { useState, useCallback } from 'react'
import styles from './PermalinkDisplay.module.css'

export interface PermalinkDisplayProps {
  label: string
  url: string
  onCopy?: () => void
  // The button's own class, for a row of buttons it should match; the
  // padded box around it is dropped too.
  className?: string
}

const PermalinkDisplay = ({ label, url, onCopy, className }: PermalinkDisplayProps) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle')

  const copyToClipboard = useCallback(async () => {
    if (copyStatus === 'copying') return

    setCopyStatus('copying')

    try {
      await navigator.clipboard.writeText(url)
      setCopyStatus('success')
      onCopy?.()
    } catch (error) {
      console.error('Failed to copy permalink:', error)
      setCopyStatus('error')
    }

    // Reset status after 2 seconds
    setTimeout(() => {
      setCopyStatus('idle')
    }, 2000)
  }, [url, onCopy, copyStatus])

  const getButtonText = () => {
    switch (copyStatus) {
      case 'copying':
        return 'Copying...'
      case 'success':
        return 'Copied!'
      case 'error':
        return 'Failed'
      default:
        return label
    }
  }

  const getButtonClass = () => {
    switch (copyStatus) {
      case 'copying':
        return `${styles.copyButton} ${styles.copying}`
      case 'success':
        return `${styles.copyButton} ${styles.success}`
      case 'error':
        return `${styles.copyButton} ${styles.error}`
      default:
        return styles.copyButton
    }
  }

  const button = (
    <button
      type="button"
      onClick={copyToClipboard}
      disabled={copyStatus === 'copying'}
      className={className ?? getButtonClass()}
      aria-label={`Copy ${label.toLowerCase()}`}
    >
      {getButtonText()}
    </button>
  )
  return className === undefined ? <div className={styles.permalinkDisplay}>{button}</div> : button
}

export default PermalinkDisplay