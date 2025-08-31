import { useState } from 'react'
import styles from './TracyPage.module.css'
import TracySceneEditor from '../components/TracySceneEditor'
import TracyNavigation from '@/components/TracyNavigation'

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render scene')
      console.error('Render error:', err)
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
              <div className={styles.error}>
                <p>Error: {error}</p>
              </div>
            )}
            
            {imageData && !isLoading && (
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