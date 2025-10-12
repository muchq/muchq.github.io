import { useState, useCallback } from 'react'
import styles from './PermalinkDisplay.module.css'

export interface PermalinkDisplayProps {
  label: string
  url: string
  onCopy?: () => void
}

const PermalinkDisplay = ({ label, url, onCopy }: PermalinkDisplayProps) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle')

  const copyToClipboard = useCallback(async () => {
    if (copyStatus === 'copying') return

    setCopyStatus('copying')

    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
        setCopyStatus('success')
        onCopy?.()
      } else {
        // Fallback method for older browsers or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = url
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (successful) {
          setCopyStatus('success')
          onCopy?.()
        } else {
          throw new Error('Fallback copy method failed')
        }
      }
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

  return (
    <div className={styles.permalinkDisplay}>
      <button
        onClick={copyToClipboard}
        disabled={copyStatus === 'copying'}
        className={getButtonClass()}
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {getButtonText()}
      </button>
    </div>
  )
}

export default PermalinkDisplay