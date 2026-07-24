import { useState } from 'react'
import styles from './PosterizePage.module.css'
import Navigation from '@/shared/components/Navigation'
import NavTagline from '@/shared/components/nav/NavTagline'
import ImageUploader from '../components/ImageUploader'
import { handleApiResponse } from '@/utils/apiUtils'
import { formatToMime, formatToExtension } from '../imageFormat'

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
  const [operation, setOperation] = useState<'blur' | 'edges'>('blur')

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
    const apiUrl = import.meta.env.VITE_POSTERIZE_API_URL || 'https://api.muchq.com/imagine/v1'

    try {
      const response = await fetch(`${apiUrl}/blur`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          b64_png: selectedImage,
          gray: gray,
          sigma: sigma
        }),
      })

      const data: BlurResponse = await handleApiResponse<BlurResponse>(response)
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

  const handleEdges = async () => {
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
    const apiUrl = import.meta.env.VITE_POSTERIZE_API_URL || 'https://api.muchq.com/imagine/v1'

    try {
      const response = await fetch(`${apiUrl}/edges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          b64_png: selectedImage
        }),
      })

      const data: BlurResponse = await handleApiResponse<BlurResponse>(response)
      setBlurredImage(data)

      // Auto-scroll to result after successful edge detection on mobile
      setTimeout(() => {
        if (window.innerWidth <= 768) {
          const resultImage = document.getElementById('result-image')
          if (resultImage) {
            resultImage.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect edges')
      console.error('Edge detection error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadImage = () => {
    if (!blurredImage) return

    const mime = formatToMime(blurredImage.format)
    const extension = formatToExtension(blurredImage.format)
    const link = document.createElement('a')
    link.href = `data:${mime};base64,${blurredImage.image_data}`
    link.download = `posterized-image.${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyToClipboard = async () => {
    if (!blurredImage) return

    try {
      // Browser clipboard image support is effectively PNG-only, so re-encode
      // whatever format the API returned to PNG via a canvas before copying.
      const mime = formatToMime(blurredImage.format)
      const image = new Image()
      image.src = `data:${mime};base64,${blurredImage.image_data}`
      await image.decode()

      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas is not supported')
      ctx.drawImage(image, 0, 0)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) throw new Error('Failed to encode image')

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
      <Navigation appName="Posterize" context={<NavTagline text="Blur your images with ease" />} />

      <header className={styles.header}>
        <h1>Posterize</h1>
        <p>Transform your images with creative effects</p>
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
                    Operation:
                    <select
                      value={operation}
                      onChange={(e) => setOperation(e.target.value as 'blur' | 'edges')}
                      className={styles.select}
                    >
                      <option value="blur">Blur</option>
                      <option value="edges">Edge Detection</option>
                    </select>
                  </label>
                </div>

                {operation === 'blur' && (
                  <>
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
                  </>
                )}
              </div>

              <button
                onClick={operation === 'blur' ? handleBlur : handleEdges}
                disabled={isLoading}
                className={styles.blurButton}
              >
                {isLoading ? '🔄 Processing...' : operation === 'blur' ? '✨ Blur Image' : '🔍 Detect Edges'}
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
                <p>Processing your image...</p>
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
                  src={`data:${formatToMime(blurredImage.format)};base64,${blurredImage.image_data}`}
                  alt="Processed result"
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
                <p>Your processed image will appear here</p>
                <p className={styles.hint}>Upload an image and choose an effect to get started</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default PosterizePage
