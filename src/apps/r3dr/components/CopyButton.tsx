import { useEffect, useRef, useState } from 'react'
import styles from './CopyButton.module.css'

// clipboard.writeText needs a secure context; the textarea/execCommand path
// covers plain-http dev and older mobile browsers.
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.left = '-9999px'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

const CopyButton = ({ text, compact = false }: { text: string; compact?: boolean }) => {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    setState((await copyText(text)) ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2000)
  }

  const visible = state === 'idle' ? 'Copy' : state === 'copied' ? 'Copied ✓' : 'Copy failed'
  const classes = [
    styles.copyBtn,
    compact ? styles.compact : '',
    state === 'copied' ? styles.copied : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <>
      <button
        type="button"
        className={classes}
        onClick={copy}
        aria-label={state === 'idle' ? `Copy ${text}` : visible.replace(' ✓', '')}
      >
        {visible}
      </button>
      {/* The label swap alone is silent to screen readers. */}
      <span className={styles.srOnly} aria-live="polite">
        {state === 'idle' ? '' : state === 'copied' ? 'Copied' : 'Copy failed'}
      </span>
    </>
  )
}

export default CopyButton
