import { useRef, useEffect, useState } from 'react'
import { usePartyGame } from '@/hooks/usePartyGame'
import styles from './PartyGame.module.css'

const PartyGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { gameState, startGame, restartGame, handleMobileInput } = usePartyGame(canvasRef)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 769
      setIsMobile(isMobileDevice)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      // Full screen minus nav height (approximately 60px)
      const navHeight = 60
      
      if (isMobile) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight - navHeight - 120 // Account for mobile UI and nav
      } else {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight - navHeight
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [isMobile])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear entire canvas first (fix motion trails)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Fill with soft pastel gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#FFE6F0')    // Light pastel pink at top
    gradient.addColorStop(0.5, '#FFF4E6')  // Light pastel peach in middle
    gradient.addColorStop(1, '#E6F3FF')    // Light pastel blue at bottom
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Apply camera transform
    ctx.save()
    ctx.translate(-gameState.camera.x, -gameState.camera.y)

    // Draw varied desert background only in visible area for performance
    const startX = Math.floor(gameState.camera.x / 200) * 200
    const endX = startX + canvas.width + 200
    const startY = Math.floor(gameState.camera.y / 200) * 200
    const endY = startY + canvas.height + 200

    // Pastel rainbow colors for each row (darker sand, lighter dunes)
    const pastelRainbow = [
      { h: 0, s: 60, l: 65 },    // Darker pastel red/pink
      { h: 30, s: 60, l: 65 },   // Darker pastel orange/peach
      { h: 60, s: 60, l: 65 },   // Darker pastel yellow
      { h: 120, s: 40, l: 65 },  // Darker pastel green
      { h: 180, s: 40, l: 65 },  // Darker pastel cyan
      { h: 240, s: 40, l: 65 },  // Darker pastel blue
      { h: 270, s: 40, l: 65 },  // Darker pastel purple
      { h: 300, s: 50, l: 65 },  // Darker pastel magenta
    ]

    // Draw sand dunes with pastel rainbow gradient
    for (let y = startY; y < endY && y < gameState.worldHeight; y += 200) {
      // Cycle through pastel rainbow colors
      const colorIndex = Math.floor(y / 200) % pastelRainbow.length
      const color = pastelRainbow[colorIndex]
      
      // Base sand color
      ctx.fillStyle = `hsl(${color.h}, ${color.s}%, ${color.l}%)`
      ctx.fillRect(Math.max(0, startX), y + 150, Math.min(gameState.worldWidth, endX) - Math.max(0, startX), 50)
    }

    // Draw dune shapes with complementary pastel colors
    for (let y = startY; y < endY && y < gameState.worldHeight; y += 200) {
      const colorIndex = Math.floor(y / 200) % pastelRainbow.length
      const baseColor = pastelRainbow[colorIndex]
      
      for (let x = startX; x < endX && x < gameState.worldWidth; x += 100) {
        // Add some randomness based on position
        const offset = ((x + y) % 7) * 10
        const size = 35 + ((x * y) % 5) * 3
        
        // Lighter/brighter version of the base color for dunes (inverted contrast)
        ctx.fillStyle = `hsl(${baseColor.h}, ${baseColor.s + 10}%, ${baseColor.l + 15}%)`
        ctx.beginPath()
        ctx.arc(x + offset, y + 170, size, 0, Math.PI, true)
        ctx.fill()
      }
    }

    // Add some rock formations for variety
    const rockSeed = gameState.worldWidth * gameState.worldHeight
    for (let i = 0; i < 20; i++) {
      const rockX = (rockSeed * (i + 1) * 7) % gameState.worldWidth
      const rockY = (rockSeed * (i + 1) * 13) % gameState.worldHeight
      
      // Only draw if visible
      if (rockX > gameState.camera.x - 100 && rockX < gameState.camera.x + canvas.width + 100 &&
          rockY > gameState.camera.y - 100 && rockY < gameState.camera.y + canvas.height + 100) {
        ctx.fillStyle = '#8B7355'
        ctx.fillRect(rockX, rockY, 40 + (i % 3) * 20, 30 + (i % 4) * 10)
        ctx.fillStyle = '#A0826D'
        ctx.fillRect(rockX + 5, rockY + 5, 30 + (i % 3) * 20, 20 + (i % 4) * 10)
      }
    }

    // Only draw visible obstacles
    gameState.obstacles.forEach(cactus => {
      // Check if cactus is visible
      if (cactus.x < gameState.camera.x - 50 || cactus.x > gameState.camera.x + canvas.width + 50 ||
          cactus.y < gameState.camera.y - 50 || cactus.y > gameState.camera.y + canvas.height + 50) {
        return
      }
      
      ctx.fillStyle = '#2D5016'
      ctx.fillRect(cactus.x - 10, cactus.y - cactus.size, 20, cactus.size)
      ctx.fillRect(cactus.x - 25, cactus.y - cactus.size + 20, 15, 20)
      ctx.fillRect(cactus.x + 10, cactus.y - cactus.size + 15, 15, 25)
    })

    // Only draw visible rescuables
    gameState.rescuables.forEach(r => {
      if (r.rescued) return
      
      // Check if rescuable is visible
      if (r.x < gameState.camera.x - 50 || r.x > gameState.camera.x + canvas.width + 50 ||
          r.y < gameState.camera.y - 50 || r.y > gameState.camera.y + canvas.height + 50) {
        return
      }

      ctx.save()
      ctx.translate(r.x, r.y)

      if (r.type === 'wreck') {
        ctx.fillStyle = '#654321'
        ctx.fillRect(-30, -15, 60, 30)
        ctx.fillStyle = '#8B4513'
        ctx.fillRect(-25, -10, 50, 20)

        ctx.fillStyle = '#FF0000'
        ctx.font = 'bold 12px Arial'
        ctx.fillText('SOS', -10, -20)
      } else {
        ctx.fillStyle = '#FDB863'
        ctx.beginPath()
        ctx.arc(0, 0, 8, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#FDB863'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(8, 0)
        ctx.lineTo(15, -5 + Math.sin(r.wave) * 5)
        ctx.stroke()

        ctx.fillStyle = '#FF0000'
        ctx.font = 'bold 10px Arial'
        ctx.fillText('HELP!', -15, -15)
      }

      ctx.restore()
    })

    // Draw barge
    const barge = gameState.barge
    ctx.save()
    ctx.translate(barge.x, barge.y)
    ctx.rotate(barge.angle)

    ctx.fillStyle = '#8B4513'
    ctx.fillRect(-barge.width/2, -barge.height/2, barge.width, barge.height)

    ctx.fillStyle = '#D2691E'
    ctx.fillRect(-barge.width/2 + 5, -barge.height/2 + 5, barge.width - 10, barge.height - 10)

    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF']
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i]
      ctx.beginPath()
      ctx.arc(-barge.width/2 + 15 + i * 20, 0, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.strokeStyle = '#666'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-barge.width/2 + 10, -barge.height/2)
    ctx.lineTo(-barge.width/2 + 10, -barge.height/2 - 15)
    ctx.moveTo(barge.width/2 - 10, -barge.height/2)
    ctx.lineTo(barge.width/2 - 10, -barge.height/2 - 15)
    ctx.stroke()

    ctx.fillStyle = '#FF6B6B'
    ctx.beginPath()
    ctx.arc(-barge.width/2 + 10, -barge.height/2 - 20, 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#4ECDC4'
    ctx.beginPath()
    ctx.arc(barge.width/2 - 10, -barge.height/2 - 20, 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    // Draw guests
    gameState.guests.forEach(guest => {
      ctx.save()
      ctx.translate(guest.x, guest.y)

      ctx.fillStyle = guest.color
      ctx.beginPath()
      ctx.arc(0, 0, 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#FFE66D'
      ctx.beginPath()
      ctx.moveTo(-4, -6)
      ctx.lineTo(0, -12)
      ctx.lineTo(4, -6)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    })

    // Draw particles
    gameState.particles.forEach(p => {
      // Check if particle is visible
      if (p.x < gameState.camera.x - 50 || p.x > gameState.camera.x + canvas.width + 50 ||
          p.y < gameState.camera.y - 50 || p.y > gameState.camera.y + canvas.height + 50) {
        return
      }
      
      ctx.save()
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })

    // Restore camera transform
    ctx.restore()

    // Draw mini-map (after restoring camera transform so it's in screen space)
    if (gameState.worldWidth > 0 && gameState.worldHeight > 0) {
      // Adjust mini-map size based on screen size (smaller on mobile)
      const miniMapSize = isMobile ? 80 : 150
      const miniMapPadding = isMobile ? 10 : 20
      const miniMapX = canvas.width - miniMapSize - miniMapPadding
      const miniMapY = isMobile ? 10 : 20
      
      // Calculate separate scales for width and height to maintain aspect ratio
      const worldAspect = gameState.worldWidth / gameState.worldHeight
      let miniMapWidth, miniMapHeight
      
      if (worldAspect > 1) {
        // World is wider than tall
        miniMapWidth = miniMapSize
        miniMapHeight = miniMapSize / worldAspect
      } else {
        // World is taller than wide
        miniMapWidth = miniMapSize * worldAspect
        miniMapHeight = miniMapSize
      }
      
      const miniMapScaleX = miniMapWidth / gameState.worldWidth
      const miniMapScaleY = miniMapHeight / gameState.worldHeight

      // Mini-map background (more transparent on mobile for less obstruction)
      ctx.fillStyle = isMobile ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(miniMapX, miniMapY, miniMapWidth, miniMapHeight)

      // Mini-map border
      ctx.strokeStyle = '#FFE66D'
      ctx.lineWidth = isMobile ? 1 : 2
      ctx.strokeRect(miniMapX, miniMapY, miniMapWidth, miniMapHeight)

      // Draw obstacles on mini-map
      ctx.fillStyle = '#2D5016'
      gameState.obstacles.forEach(cactus => {
        const x = miniMapX + cactus.x * miniMapScaleX
        const y = miniMapY + cactus.y * miniMapScaleY
        ctx.fillRect(x - 1, y - 1, 2, 2)
      })

      // Draw rescuables on mini-map
      gameState.rescuables.forEach(r => {
        if (r.rescued) return
        const x = miniMapX + r.x * miniMapScaleX
        const y = miniMapY + r.y * miniMapScaleY
        
        ctx.fillStyle = r.type === 'wreck' ? '#8B4513' : '#FDB863'
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw barge on mini-map (make it pulse, smaller on mobile)
      const basePulseSize = isMobile ? 2 : 3
      const pulseSize = basePulseSize + Math.sin(Date.now() * 0.005) * (isMobile ? 0.5 : 1)
      ctx.fillStyle = '#FF6B6B'
      const bargeX = miniMapX + barge.x * miniMapScaleX
      const bargeY = miniMapY + barge.y * miniMapScaleY
      ctx.beginPath()
      ctx.arc(bargeX, bargeY, pulseSize, 0, Math.PI * 2)
      ctx.fill()
      
      // Add a white dot in center for visibility
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(bargeX, bargeY, 1, 0, Math.PI * 2)
      ctx.fill()

      // Draw viewport rectangle on mini-map
      ctx.strokeStyle = '#4ECDC4'
      ctx.lineWidth = isMobile ? 1 : 2
      const viewX = miniMapX + gameState.camera.x * miniMapScaleX
      const viewY = miniMapY + gameState.camera.y * miniMapScaleY
      const viewW = canvas.width * miniMapScaleX
      const viewH = canvas.height * miniMapScaleY
      ctx.strokeRect(viewX, viewY, viewW, viewH)

      // Mini-map label (only on desktop to save space on mobile)
      if (!isMobile) {
        ctx.fillStyle = '#FFE66D'
        ctx.font = 'bold 10px Arial'
        ctx.fillText('MAP', miniMapX + miniMapWidth/2 - 15, miniMapY + miniMapHeight + 15)
      }
    }
  }, [gameState, isMobile])

  return (
    <div className={styles.gameContainer}>
      <canvas 
        ref={canvasRef}
        className={styles.gameCanvas}
      />

      <div className={styles.ui}>
        <div className={styles.stat}>
          <span className={styles.statIcon}>🎉</span>
          Fun Level: <span>{Math.round(gameState.funLevel)}%</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon}>👥</span>
          Guests: <span>{gameState.guests.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon}>⭐</span>
          Score: <span>{Math.round(gameState.score)}</span>
        </div>
      </div>

      {!isMobile && (
        <div className={styles.instructions}>
          <strong>Controls:</strong><br/>
          Arrow Keys or WASD to fly<br/>
          Space to boost party vibes!
        </div>
      )}

      {!gameState.gameRunning && !gameState.gameOver && (
        <div className={styles.startScreen}>
          <h1>🎉 Rescue Party 🎉</h1>
          <div className={styles.instructionsPanel}>
            <strong>Your Mission:</strong><br/>
            • Fly your party barge through the desert<br/>
            • Keep the fun level high with music boosts {isMobile ? '(🎉 button)' : '(SPACE)'}<br/>
            • Rescue stranded party-goers (fly into them)<br/>
            • Avoid crashes and keep everyone happy!<br/>
            • Fun decreases over time - keep the party alive!
            {isMobile && (
              <>
                <br/><br/>
                <strong>Mobile Controls:</strong><br/>
                • Use the arrow pad to fly<br/>
                • Tap 🎉 to boost party vibes!
              </>
            )}
          </div>
          <button onClick={startGame} className={styles.gameButton}>
            Start Party!
          </button>
        </div>
      )}

      {gameState.gameOver && (
        <div className={styles.gameOverScreen}>
          <h2>Party's Over!</h2>
          <div className={styles.finalScore}>
            Final Score: {Math.round(gameState.score)}<br/>
            Guests Rescued: {gameState.guests.length - 5}
          </div>
          <button onClick={restartGame} className={styles.gameButton}>
            Party Again!
          </button>
        </div>
      )}

      {isMobile && gameState.gameRunning && (
        <div className={styles.mobileControls}>
          <div className={styles.directionPad}>
            <button 
              className={`${styles.directionButton} ${styles.up}`}
              onTouchStart={() => handleMobileInput('up', true)}
              onTouchEnd={() => handleMobileInput('up', false)}
              onMouseDown={() => handleMobileInput('up', true)}
              onMouseUp={() => handleMobileInput('up', false)}
              onMouseLeave={() => handleMobileInput('up', false)}
            >
              ↑
            </button>
            <button 
              className={`${styles.directionButton} ${styles.left}`}
              onTouchStart={() => handleMobileInput('left', true)}
              onTouchEnd={() => handleMobileInput('left', false)}
              onMouseDown={() => handleMobileInput('left', true)}
              onMouseUp={() => handleMobileInput('left', false)}
              onMouseLeave={() => handleMobileInput('left', false)}
            >
              ←
            </button>
            <button 
              className={`${styles.directionButton} ${styles.right}`}
              onTouchStart={() => handleMobileInput('right', true)}
              onTouchEnd={() => handleMobileInput('right', false)}
              onMouseDown={() => handleMobileInput('right', true)}
              onMouseUp={() => handleMobileInput('right', false)}
              onMouseLeave={() => handleMobileInput('right', false)}
            >
              →
            </button>
            <button 
              className={`${styles.directionButton} ${styles.down}`}
              onTouchStart={() => handleMobileInput('down', true)}
              onTouchEnd={() => handleMobileInput('down', false)}
              onMouseDown={() => handleMobileInput('down', true)}
              onMouseUp={() => handleMobileInput('down', false)}
              onMouseLeave={() => handleMobileInput('down', false)}
            >
              ↓
            </button>
          </div>
          <button 
            className={styles.mobileControlButton}
            onTouchStart={() => handleMobileInput('boost', true)}
            onTouchEnd={() => handleMobileInput('boost', false)}
            onMouseDown={() => handleMobileInput('boost', true)}
            onMouseUp={() => handleMobileInput('boost', false)}
            onMouseLeave={() => handleMobileInput('boost', false)}
          >
            🎉
          </button>
        </div>
      )}
    </div>
  )
}

export default PartyGame