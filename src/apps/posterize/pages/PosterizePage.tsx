import { useState } from 'react'
import styles from './PosterizePage.module.css'
import PosterizeNavigation from '../components/PosterizeNavigation'
import ImageUploader from '../components/ImageUploader'

interface BlurResponse {
  width: number
  height: number
  format: string
  image_data: string
  size_bytes: number
}

const PosterizePage = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [blurredImage, setBlurredImage] = useState<BlurResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gray, setGray] = useState(false)
  const [sigma, setSigma] = useState(8.0)

  const handleImageSelect = (base64: string) => {
    setSelectedImage(base64)
    setBlurredImage(null)
    setError(null)
  }

  const handleBlur = async () => {
    if (!selectedImage) return

    setIsLoading(true)
    setError(null)

    // Scroll to result section on mobile
    if (window.innerWidth <= 768) {
      const resultSection = document.querySelector('.resultSection')
      if (resultSection) {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    // Use environment variable for API URL, defaulting to production URL
    const apiUrl = import.meta.env.VITE_POSTERIZE_API_URL || 'https://api.muchq.com/v1/imagine/blur'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          b64_png: selectedImage,
          gray: gray,
          ...(gray ? {} : { sigma: sigma })
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data: BlurResponse = await response.json()
      setBlurredImage(data)

      // Auto-scroll to result after successful blur on mobile
      setTimeout(() => {
        if (window.innerWidth <= 768) {
          const resultImage = document.getElementById('result-image')
          if (resultImage) {
            resultImage.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to blur image')
      console.error('Blur error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadImage = () => {
    if (!blurredImage) return

    const link = document.createElement('a')
    link.href = `data:image/png;base64,${blurredImage.image_data}`
    link.download = 'blurred-image.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyToClipboard = async () => {
    if (!blurredImage) return

    try {
      // Convert base64 to blob
      const response = await fetch(`data:image/png;base64,${blurredImage.image_data}`)
      const blob = await response.blob()

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])

      // Show success feedback
      const button = document.getElementById('copy-button')
      if (button) {
        const originalText = button.textContent
        button.textContent = '✅ Copied!'
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to copy image: ', err)
      alert('Failed to copy image to clipboard. You can download it instead.')
    }
  }

  return (
    <div className={styles.container}>
      <PosterizeNavigation />

      <header className={styles.header}>
        <h1>Posterize</h1>
        <p>Upload a PNG image and get a beautiful blurred version</p>
      </header>

      <div className={styles.content}>
        <section className={styles.uploadSection}>
          <h2>Upload Image</h2>
          <ImageUploader onImageSelect={handleImageSelect} isLoading={isLoading} />

          {selectedImage && (
            <div className={styles.actions}>
              <div className={styles.controls}>
                <div className={styles.control}>
                  <label>
                    <input
                      type="checkbox"
                      checked={gray}
                      onChange={(e) => setGray(e.target.checked)}
                    />
                    Grayscale blur
                  </label>
                </div>

                {!gray && (
                  <div className={styles.control}>
                    <label>
                      Sigma: {sigma.toFixed(1)}
                      <input
                        type="range"
                        min="2.0"
                        max="20.0"
                        step="0.5"
                        value={sigma}
                        onChange={(e) => setSigma(parseFloat(e.target.value))}
                        className={styles.slider}
                      />
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={handleBlur}
                disabled={isLoading}
                className={styles.blurButton}
              >
                {isLoading ? '🔄 Processing...' : '✨ Blur Image'}
              </button>
            </div>
          )}
        </section>

        <section className={`${styles.resultSection} resultSection`}>
          <h2>Result</h2>

          <div className={styles.resultContainer}>
            {isLoading && (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinner}></div>
                <p>Blurring your image...</p>
              </div>
            )}

            {error && (
              <div className={styles.errorOverlay}>
                <div className={styles.errorContent}>
                  <p>❌ Error: {error}</p>
                  <button onClick={handleBlur} className={styles.retryButton}>
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {blurredImage && !isLoading && (
              <div className={styles.result}>
                <img
                  id="result-image"
                  src={`data:image/png;base64,${blurredImage.image_data}`}
                  alt="Blurred result"
                  className={styles.resultImage}
                />

                <div className={styles.resultActions}>
                  <button onClick={downloadImage} className={styles.downloadButton}>
                    📥 Download
                  </button>
                  <button
                    id="copy-button"
                    onClick={copyToClipboard}
                    className={styles.copyButton}
                  >
                    📋 Copy to Clipboard
                  </button>
                </div>

                <div className={styles.resultInfo}>
                  <p>Size: {blurredImage.width} × {blurredImage.height}</p>
                  <p>Format: {blurredImage.format}</p>
                  <p>File size: {(blurredImage.size_bytes / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            )}

            {!blurredImage && !isLoading && !error && (
              <div className={styles.placeholder}>
                <p>Your blurred image will appear here</p>
                <p className={styles.hint}>Upload an image and click "Blur Image" to get started</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default PosterizePage