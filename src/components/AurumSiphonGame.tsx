import { useEffect, useRef } from 'react'
import { useAurumSiphonGame } from '@/hooks/useAurumSiphonGame'
import styles from './AurumSiphonGame.module.css'

interface AurumSiphonGameProps {
  onPlayerIdReceived: (playerId: string) => void
}

const AurumSiphonGame = ({ onPlayerIdReceived }: AurumSiphonGameProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { initializeGame } = useAurumSiphonGame()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const cleanup = initializeGame(container, onPlayerIdReceived)
    
    return cleanup
  }, [initializeGame, onPlayerIdReceived])

  return (
    <div className={styles.gameContainer}>
      <div ref={containerRef} className={styles.sceneContainer} />
      
      <div className={styles.hud}>
        <div className={styles.hudTop}>
          <div className={styles.levelIndicator}>
            <span className={styles.label}>Level</span>
            <span id="level-display" className={styles.value}>1</span>
          </div>
          <div className={styles.scoreDisplay}>
            <span className={styles.label}>Gold Collected</span>
            <span id="gold-display" className={styles.value}>0 mg</span>
          </div>
        </div>
        
        <div className={styles.resourceBar}>
          <div className={styles.resourceItem}>
            <span className={styles.resourceIcon}>⚡</span>
            <span id="power-display" className={styles.resourceValue}>100%</span>
          </div>
          <div className={styles.resourceItem}>
            <span className={styles.resourceIcon}>🧲</span>
            <span id="magnetic-display" className={styles.resourceValue}>100%</span>
          </div>
          <div className={styles.resourceItem}>
            <span className={styles.resourceIcon}>🛡️</span>
            <span id="shield-display" className={styles.resourceValue}>100%</span>
          </div>
        </div>
      </div>
      
      <div id="mini-map" className={styles.miniMap}>
        <canvas id="mini-map-canvas" className={styles.miniMapCanvas} />
      </div>
      
      <div className={styles.controls}>
        <button id="boost-button" className={styles.boostButton}>BOOST (B)</button>
        <button id="funnel-toggle" className={styles.funnelButton}>FUNNEL: ON</button>
      </div>
      
      <div id="left-joystick" className={`${styles.mobileJoystick} ${styles.leftJoystick}`}>
        <div className={styles.joystickKnob} id="left-knob"></div>
      </div>
      
      <div id="right-joystick" className={`${styles.mobileJoystick} ${styles.rightJoystick}`}>
        <div className={styles.joystickKnob} id="right-knob"></div>
      </div>
      
      <div id="level-complete" className={styles.levelComplete}>
        <h2>Level Complete!</h2>
        <p id="level-stats"></p>
        <button id="next-level-button">Next Level</button>
      </div>
      
      <button id="help-button" className={styles.helpButton}>?</button>
      
      <div id="help-screen" className={styles.helpScreen}>
        <div className={styles.helpContent}>
          <button id="help-close" className={styles.helpClose}>×</button>
          <h2>How to Play Aurum Siphon</h2>
          
          <div className={styles.helpSection}>
            <h3>🎮 Desktop Controls</h3>
            <div className={styles.controlsList}>
              <div><kbd>W</kbd> - Move forward</div>
              <div><kbd>S</kbd> - Move backward</div>
              <div><kbd>A</kbd> - Move left</div>
              <div><kbd>D</kbd> - Move right</div>
              <div><kbd>Q</kbd> - Move up</div>
              <div><kbd>E</kbd> - Move down</div>
              <div><kbd>↑</kbd> - Zoom in</div>
              <div><kbd>↓</kbd> - Zoom out</div>
              <div><kbd>←</kbd> - Rotate camera left</div>
              <div><kbd>→</kbd> - Rotate camera right</div>
              <div><kbd>Space</kbd> - Shoot laser</div>
              <div><kbd>B</kbd> - Boost (uses power)</div>
              <div><kbd>F</kbd> - Toggle magnetic funnel</div>
              <div><kbd>H</kbd> - Toggle this help screen</div>
              <div><kbd>ESC</kbd> - Close help</div>
            </div>
          </div>
          
          <div className={styles.helpSection}>
            <h3>📱 Mobile Controls</h3>
            <p>• Left joystick - Movement (forward/back/left/right)</p>
            <p>• Right joystick - Camera (up/down for zoom, left/right for rotation)</p>
            <p>• On-screen buttons for Boost & Funnel</p>
          </div>
          
          <div className={styles.helpSection}>
            <h3>🎯 Objective</h3>
            <p>Collect gold ions from the solar wind using your magnetic funnel. Reach the target amount to advance to the next level.</p>
          </div>
          
          <div className={styles.helpSection}>
            <h3>💡 Tips</h3>
            <ul>
              <li>Gold particles are golden, platinum is silver</li>
              <li>The magnetic funnel attracts heavier particles more strongly</li>
              <li>Boost helps catch fast particles but drains power</li>
              <li>Toggle the funnel off periodically to let it recharge</li>
              <li>Watch the minimap to track incoming particle streams</li>
              <li>Position yourself in the path of particle clusters</li>
              <li>Press Space to shoot lasers and destroy asteroids and planets!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AurumSiphonGame