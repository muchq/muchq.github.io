import { useEffect, useRef } from 'react'
import { useWebGL } from '@/hooks/useWebGL'
import styles from './JuliaSetBackground.module.css'

const JuliaSetBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { initializeWebGL } = useWebGL()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2')
    if (!gl) {
      console.error('WebGL2 not supported')
      return
    }

    const cleanup = initializeWebGL(gl, canvas)
    
    return cleanup
  }, [initializeWebGL])

  return (
    <canvas 
      ref={canvasRef}
      className={styles.juliaCanvas}
      id="julia-canvas"
    />
  )
}

export default JuliaSetBackground