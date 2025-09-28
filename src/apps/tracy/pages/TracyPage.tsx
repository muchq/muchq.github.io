import { useState } from 'react'
import styles from './TracyPage.module.css'
import TracySceneEditor from '../components/TracySceneEditor'
import TracyNavigation from '../components/TracyNavigation'

interface SceneData {
  scene: {
    backgroundColor: [number, number, number]
    backgroundStarProbability: number
    spheres: Array<{
      center: [number, number, number]
      radius: number
      color: [number, number, number]
      specular: number
      reflective: number
    }>
    lights: Array<{
      lightType: 'ambient' | 'point' | 'directional'
      intensity: number
      position: [number, number, number]
    }>
  }
  perspective: {
    cameraPosition: [number, number, number]
    cameraFocus: [number, number, number]
  }
  output: {
    width: number
    height: number
  }
}

const TracyPage = () => {
  const [imageData, setImageData] = useState<{ base64_png: string; width: number; height: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRender = async (sceneData: SceneData) => {
    setIsLoading(true)
    setError(null)

    // Scroll to canvas on mobile
    if (window.innerWidth <= 768) {
      const canvasSection = document.querySelector('.canvasSection')
      if (canvasSection) {
        canvasSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    // Use environment variable for API URL, defaulting to production URL
    const apiUrl = import.meta.env.VITE_TRACY_API_URL || 'https://api.muchq.com/v1/trace'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sceneData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setImageData(data)

      // Auto-scroll to result after successful render on mobile
      setTimeout(() => {
        if (window.innerWidth <= 768) {
          const canvas = document.getElementById('render-canvas')
          if (canvas) {
            canvas.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render scene')
      console.error('Render error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadImage = () => {
    if (!imageData) return

    const link = document.createElement('a')
    link.href = `data:image/png;base64,${imageData.base64_png}`
    link.download = 'traced-image.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyToClipboard = async () => {
    if (!imageData) return

    try {
      // Convert base64 to blob
      const response = await fetch(`data:image/png;base64,${imageData.base64_png}`)
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

  const blurImage = async () => {
    if (!imageData) return

    setIsLoading(true)
    setError(null)

    // Use environment variable for Posterize API URL, defaulting to production URL
    const posterizeApiUrl = import.meta.env.VITE_POSTERIZE_API_URL || 'https://api.muchq.com/v1/imagine/blur'

    try {
      const response = await fetch(posterizeApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          b64_png: imageData.base64_png
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const blurredData = await response.json()

      // Replace the current image with the blurred version
      setImageData({
        base64_png: blurredData.image_data,
        width: blurredData.width,
        height: blurredData.height
      })

      // Show success feedback
      const button = document.getElementById('blur-button')
      if (button) {
        const originalText = button.textContent
        button.textContent = '✅ Blurred!'
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to blur image')
      console.error('Blur error:', err)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className={styles.container}>
      <TracyNavigation />
      <header className={styles.header}>
        <h1>Tracy Ray Tracer</h1>
        <p>Interactive scene editor for ray tracing</p>
      </header>
      
      <div className={styles.content}>
        <div className={styles.editorSection}>
          <TracySceneEditor onRender={handleRender} isLoading={isLoading} />
        </div>
        
        <div className={styles.canvasSection}>
          <div className={styles.canvasWrapper}>
            {isLoading && (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinner}></div>
                <p>Rendering scene...</p>
              </div>
            )}
            
            {error && (
              <div className={styles.errorOverlay}>
                <div className={styles.errorContent}>
                  <p>Error: {error}</p>
                </div>
              </div>
            )}
            
            {imageData && !isLoading && (
              <div className={styles.result}>
                <canvas
                  id="render-canvas"
                  className={styles.canvas}
                  width={imageData.width}
                  height={imageData.height}
                  ref={(canvas) => {
                    if (canvas && imageData) {
                      const ctx = canvas.getContext('2d')
                      if (ctx) {
                        const img = new Image()
                        img.onload = () => {
                          ctx.clearRect(0, 0, canvas.width, canvas.height)
                          ctx.drawImage(img, 0, 0)
                        }
                        img.src = `data:image/png;base64,${imageData.base64_png}`
                      }
                    }
                  }}
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
                  <button
                    id="blur-button"
                    onClick={blurImage}
                    disabled={isLoading}
                    className={styles.blurButton}
                  >
                    🌊 Blur
                  </button>
                </div>
              </div>
            )}
            
            {!imageData && !isLoading && !error && (
              <div className={styles.placeholder}>
                <p>Rendered image will appear here</p>
                <p className={styles.hint}>Edit the scene and click "Render" to generate an image</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TracyPage