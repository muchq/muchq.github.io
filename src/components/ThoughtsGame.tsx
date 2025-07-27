import { useEffect, useRef } from 'react'
import { useThoughtsGame } from '@/hooks/useThoughtsGame'
import styles from './ThoughtsGame.module.css'

const ThoughtsGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { initializeGame } = useThoughtsGame()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const cleanup = initializeGame(canvas)
    
    return cleanup
  }, [initializeGame])

  return (
    <div className={styles.gameContainer}>
      <canvas ref={canvasRef} className={styles.sceneCanvas} id="scene-canvas" />
      
      <div id="fps-counter" className={styles.fpsCounter}>FPS: --</div>
      
      <div id="mini-map" className={styles.miniMap}>
        <div id="mini-map-content" className={styles.miniMapContent}>
          <div className={styles.miniMapGrid}></div>
          <div className={styles.miniMapBoundary}></div>
          <div className={styles.miniMapPlayer} id="mini-map-player"></div>
        </div>
      </div>
      
      <button id="sound-toggle" className={styles.soundToggle}>🔇 Sound: OFF</button>
      
      <div id="left-joystick" className={`${styles.mobileJoystick} ${styles.leftJoystick}`}>
        <div className={styles.joystickKnob} id="left-knob"></div>
      </div>
      
      <div id="right-joystick" className={`${styles.mobileJoystick} ${styles.rightJoystick}`}>
        <div className={styles.joystickKnob} id="right-knob"></div>
      </div>
    </div>
  )
}

export default ThoughtsGame