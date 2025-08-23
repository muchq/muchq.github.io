import { useRef, useEffect } from 'react'
import { usePartyGame } from '@/hooks/usePartyGame'
import styles from './PartyGame.module.css'

const PartyGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { gameState, startGame, restartGame } = usePartyGame(canvasRef)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = Math.min(window.innerWidth - 40, 1200)
      canvas.height = Math.min(window.innerHeight - 200, 800)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'rgba(255, 228, 181, 0.1)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#F4A460'
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50)

    ctx.fillStyle = '#DEB887'
    for (let i = 0; i < canvas.width; i += 100) {
      ctx.beginPath()
      ctx.arc(i, canvas.height - 30, 40, 0, Math.PI, true)
      ctx.fill()
    }

    gameState.obstacles.forEach(cactus => {
      ctx.fillStyle = '#2D5016'
      ctx.fillRect(cactus.x - 10, cactus.y - cactus.size, 20, cactus.size)
      ctx.fillRect(cactus.x - 25, cactus.y - cactus.size + 20, 15, 20)
      ctx.fillRect(cactus.x + 10, cactus.y - cactus.size + 15, 15, 25)
    })

    gameState.rescuables.forEach(r => {
      if (r.rescued) return

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

    gameState.particles.forEach(p => {
      ctx.save()
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }, [gameState])

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

      <div className={styles.instructions}>
        <strong>Controls:</strong><br/>
        Arrow Keys or WASD to fly<br/>
        Space to boost party vibes!
      </div>

      {!gameState.gameRunning && !gameState.gameOver && (
        <div className={styles.startScreen}>
          <h1>🎉 Rescue Party 🎉</h1>
          <div className={styles.instructionsPanel}>
            <strong>Your Mission:</strong><br/>
            • Fly your party barge through the desert<br/>
            • Keep the fun level high with music boosts (SPACE)<br/>
            • Rescue stranded party-goers (fly into them)<br/>
            • Avoid crashes and keep everyone happy!<br/>
            • Fun decreases over time - keep the party alive!
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
    </div>
  )
}

export default PartyGame