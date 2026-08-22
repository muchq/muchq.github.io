import { useState } from 'react'
import { shorten, shortLink, shortLinkLabel } from '../api'
import { DEFAULT_EXPIRY, describeExpiry, EXPIRY_OPTIONS, type ExpiryOption } from '../expiry'
import type { RecentLink } from '../recent'
import { normalizeUrl, validateUrl } from '../urlInput'
import CopyButton from './CopyButton'
import styles from './ShortenCard.module.css'

const ShortenCard = ({ onMinted }: { onMinted: (link: RecentLink) => void }) => {
  const [input, setInput] = useState('')
  const [expiry, setExpiry] = useState<ExpiryOption>(DEFAULT_EXPIRY)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [minted, setMinted] = useState<RecentLink | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (pending) return
    const submitted = input
    const longUrl = normalizeUrl(submitted)
    const problem = validateUrl(longUrl)
    if (problem) {
      setError(problem)
      setMinted(null)
      return
    }
    setPending(true)
    setError(null)
    const expiresAt = Date.now() + expiry.ms
    try {
      const { slug } = await shorten(longUrl, expiresAt)
      const link = { slug, longUrl, expiresAt }
      setMinted(link)
      // Keep anything typed while the request was in flight.
      setInput(current => (current === submitted ? '' : current))
      onMinted(link)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setMinted(null)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className={styles.card}>
      <form onSubmit={handleSubmit} noValidate>
        <label className={styles.fieldLabel} htmlFor="long-url">
          Long link
        </label>
        <div className={styles.fieldRow}>
          <input
            id="long-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://example.com/somewhere/very/deep"
            value={input}
            onChange={event => setInput(event.target.value)}
          />
          {/* Never disabled: disabling the focused button dumps keyboard
              focus on <body>. Re-entry is guarded in handleSubmit. */}
          <button type="submit" className={styles.submitBtn} aria-busy={pending}>
            {pending ? 'Shortening…' : 'Shorten'}
          </button>
        </div>

        <div className={styles.expiry} role="group" aria-labelledby="expiry-label">
          <span className={styles.expiryLabel} id="expiry-label">
            Expires after
          </span>
          {EXPIRY_OPTIONS.map(option => (
            <button
              key={option.label}
              type="button"
              aria-pressed={option === expiry}
              className={option === expiry ? `${styles.chip} ${styles.chipOn}` : styles.chip}
              onClick={() => setExpiry(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </form>

      {/* Live regions stay mounted; a region injected together with its
          content is unreliably announced. */}
      <p className={error ? styles.errorMessage : styles.liveSlot} role="alert">
        {error}
      </p>

      <div className={minted ? styles.result : styles.liveSlot} role="status">
        {minted && (
          <>
            <div className={styles.resultRow}>
              <a
                className={styles.resultLink}
                href={shortLink(minted.slug)}
                target="_blank"
                rel="noreferrer"
              >
                {shortLinkLabel(minted.slug)}
              </a>
              <CopyButton text={shortLink(minted.slug)} />
            </div>
            <p className={styles.resultNote}>
              <span className={styles.resultTarget}>{minted.longUrl}</span>
              <span>· expires {describeExpiry(minted.expiresAt - Date.now())}</span>
            </p>
          </>
        )}
      </div>
    </section>
  )
}

export default ShortenCard
