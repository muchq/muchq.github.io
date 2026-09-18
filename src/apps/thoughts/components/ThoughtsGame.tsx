import { useEffect, useRef } from 'react'
import { useThoughtsGame } from '@/hooks/useThoughtsGame'
import type { HubWorldLink } from '@/utils/hubWorldLink'
import styles from './ThoughtsGame.module.css'

interface ThoughtsGameProps {
  onPlayerIdReceived?: (playerId: string) => void
  onConnectionStateChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'failed', error?: string) => void
  networkManagerRef?: React.MutableRefObject<{ reconnect: () => void } | null>
  // The lobby's way into the world; absent, the page dials its own.
  link?: HubWorldLink
  // Where the minimap and sound toggle sit: left by default, right when
  // a panel takes the left (the lobby).
  hudSide?: 'left' | 'right'
}

const ThoughtsGame = ({ onPlayerIdReceived, onConnectionStateChange, networkManagerRef, link, hudSide = 'left' }: ThoughtsGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { initializeGame } = useThoughtsGame()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const cleanup = initializeGame(canvas, onPlayerIdReceived, onConnectionStateChange, networkManagerRef, link)
    
    return cleanup
  }, [initializeGame, onPlayerIdReceived, onConnectionStateChange, networkManagerRef, link])

  return (
    <div className={`${styles.gameContainer} ${hudSide === 'right' ? styles.hudRight : ''}`}>
      <canvas ref={canvasRef} className={styles.sceneCanvas} id="scene-canvas" />
      
      <div id="tape-wall-container" className={styles.tapeWallContainer}></div>

      <div id="player-labels-container" className={styles.playerLabelsContainer}></div>
      
      <div id="fps-counter" className={styles.fpsCounter}>FPS: --</div>
      
      <div id="mini-map" className={styles.miniMap}>
        <div id="mini-map-content" className={styles.miniMapContent}>
          <div className={styles.miniMapGrid}></div>
          <div className={styles.miniMapBoundary}></div>
          {/* A globe turns with the player, so it needs landmarks to be
              read against: the poles and the prime meridian, in map
              units, which is what this viewBox is. Empty and hidden in
              a room that is a square. */}
          <svg id="mini-map-globe" className={styles.miniMapGlobe} viewBox="-1 -1 2 2" aria-hidden="true">
            <path id="mini-map-meridian" className={styles.miniMapMeridian} d="" />
            <circle id="mini-map-north" className={styles.miniMapNorth} r="0.07" cx="0" cy="0" />
            <circle id="mini-map-south" className={styles.miniMapSouth} r="0.07" cx="0" cy="0" />
            <text id="mini-map-north-label" className={styles.miniMapNorth} x="0" y="0">N</text>
            <text id="mini-map-south-label" className={styles.miniMapSouth} x="0" y="0">S</text>
          </svg>
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