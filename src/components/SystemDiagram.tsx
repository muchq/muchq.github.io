import { useEffect, useRef } from 'react'
import styles from './SystemDiagram.module.css'

interface SystemMetrics {
  latency: number
  throughput: number
  errorRate: number
  saturation: number
}

interface SystemState {
  rps: number
  serverCpu: number
  serverMemory: number
  dbCpu: number
  dbConnections: number
  isRunning: boolean
}

interface SystemArchitecture {
  servers: number
  databases: number
  readReplicas: number
  loadBalancer: boolean
  cache: boolean
}

interface SystemDiagramProps {
  systemState: SystemState
  serverMetrics?: SystemMetrics
  dbMetrics?: SystemMetrics
  architecture: SystemArchitecture
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  maxAge: number
  isError: boolean
  isRead: boolean
  targetX?: number
  targetY?: number
  progress: number // 0 to 1 along the current path segment
  stage: 'client-to-lb' | 'lb-to-server' | 'server-to-db' | 'server-to-replica' | 'direct-to-server' | 'direct-to-db'
  serverId?: number // which server this particle is targeting
  replicaId?: number // which replica this particle is targeting
}

export const SystemDiagram = ({ 
  systemState, 
  serverMetrics, 
  dbMetrics,
  architecture 
}: SystemDiagramProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationIdRef = useRef<number | undefined>(undefined)
  const spawnCounterRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = rect.width
    const height = rect.height

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height)
      
      // Draw background
      ctx.fillStyle = '#0a0a1a'
      ctx.fillRect(0, 0, width, height)

      // Component positions
      const clientX = 50
      const lbX = architecture.loadBalancer ? 150 : clientX
      const serverX = architecture.loadBalancer ? 250 : 150
      const dbX = serverX + 150
      const centerY = height / 2

      // Draw client
      drawClient(ctx, clientX, centerY - 20)

      // Draw load balancer if present
      if (architecture.loadBalancer) {
        const intensity = (serverMetrics?.saturation || 0) / 100
        drawLoadBalancer(ctx, lbX, centerY, intensity)
      }

      // Draw servers with adaptive spacing
      const maxServerHeight = height * 0.6 // Use 60% of canvas height for servers
      const idealServerSpacing = 40
      const minServerSpacing = 25
      const totalServerHeight = architecture.servers > 1 ? (architecture.servers - 1) * idealServerSpacing : 0
      const serverSpacing = architecture.servers > 1 && totalServerHeight > maxServerHeight ? 
        Math.max(minServerSpacing, maxServerHeight / (architecture.servers - 1)) : idealServerSpacing
      const startY = centerY - ((architecture.servers - 1) * serverSpacing) / 2
      
      for (let i = 0; i < architecture.servers; i++) {
        const y = startY + i * serverSpacing
        const intensity = (serverMetrics?.saturation || 0) / 100
        const scale = serverSpacing < idealServerSpacing ? serverSpacing / idealServerSpacing : 1
        drawServer(ctx, serverX, y, intensity, serverMetrics?.errorRate || 0, scale)
      }

      // Draw databases (primary + read replicas) with adaptive spacing
      const dbIntensity = (dbMetrics?.saturation || 0) / 100
      const totalDatabases = 1 + architecture.readReplicas // primary + replicas
      const maxDbHeight = height * 0.7 // Use 70% of canvas height for databases
      const idealDbSpacing = 60
      const minDbSpacing = 35
      const totalDbHeight = totalDatabases > 1 ? (totalDatabases - 1) * idealDbSpacing : 0
      const dbSpacing = totalDatabases > 1 && totalDbHeight > maxDbHeight ? 
        Math.max(minDbSpacing, maxDbHeight / (totalDatabases - 1)) : idealDbSpacing
      const dbStartY = centerY - ((totalDatabases - 1) * dbSpacing) / 2
      const dbScale = dbSpacing < idealDbSpacing ? dbSpacing / idealDbSpacing : 1
      
      // Draw primary database
      const primaryY = totalDatabases === 1 ? centerY : dbStartY
      drawDatabase(ctx, dbX, primaryY, dbIntensity, false, dbMetrics?.errorRate || 0, dbScale)

      // Draw read replicas
      for (let i = 0; i < architecture.readReplicas; i++) {
        const replicaY = dbStartY + (i + 1) * dbSpacing
        drawDatabase(ctx, dbX, replicaY, dbIntensity * 0.5, true, (dbMetrics?.errorRate || 0) * 0.3, dbScale)
      }

      // Calculate connection offsets for scaled components
      const serverScale = serverSpacing < idealServerSpacing ? serverSpacing / idealServerSpacing : 1
      const serverConnectionOffset = 15 * serverScale // Scaled server half-width
      const dbConnectionOffset = 20 * dbScale // Scaled database half-width

      // Draw connections
      drawConnection(ctx, clientX + 30, centerY, lbX - 15, centerY)
      if (architecture.loadBalancer) {
        // LB to servers (with scaled connection points)
        for (let i = 0; i < architecture.servers; i++) {
          const y = startY + i * serverSpacing
          drawConnection(ctx, lbX + 15, centerY, serverX - serverConnectionOffset, y)
        }
      }
      // Servers to databases (with scaled connection points)
      
      for (let i = 0; i < architecture.servers; i++) {
        const serverY = startY + i * serverSpacing
        // Connection to primary database
        const primaryDbY = totalDatabases === 1 ? centerY : dbStartY
        drawConnection(ctx, serverX + serverConnectionOffset, serverY, dbX - dbConnectionOffset, primaryDbY)
        
        // Each server to read replicas (read traffic)
        for (let j = 0; j < architecture.readReplicas; j++) {
          const replicaY = dbStartY + (j + 1) * dbSpacing
          drawConnection(ctx, serverX + serverConnectionOffset, serverY, dbX - dbConnectionOffset, replicaY, true)
        }
      }

      // Handle particles
      if (systemState.isRunning) {
        updateParticles(width, height, clientX, lbX, serverX, dbX, centerY, startY, serverSpacing, dbStartY, dbSpacing, totalDatabases, serverScale, dbScale)
        drawParticles(ctx)
      }

      // Draw labels
      drawLabels(ctx, clientX, lbX, serverX, dbX, centerY, architecture)

      animationIdRef.current = requestAnimationFrame(animate)
    }

    const drawClient = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.fillStyle = '#666'
      ctx.fillRect(x, y, 30, 40)
      ctx.fillStyle = '#999'
      ctx.fillRect(x + 5, y + 5, 20, 15)
      ctx.fillStyle = '#fff'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Client', x + 15, y + 55)
    }

    const drawLoadBalancer = (ctx: CanvasRenderingContext2D, x: number, y: number, intensity: number) => {
      const hue = Math.max(240 - intensity * 60, 180) // Blue to purple based on load
      ctx.fillStyle = `hsl(${hue}, 80%, 60%)`
      
      // Draw diamond shape
      ctx.beginPath()
      ctx.moveTo(x, y - 20)
      ctx.lineTo(x + 15, y)
      ctx.lineTo(x, y + 20)
      ctx.lineTo(x - 15, y)
      ctx.closePath()
      ctx.fill()
      
      ctx.fillStyle = '#fff'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('LB', x, y + 35)
    }

    const drawServer = (ctx: CanvasRenderingContext2D, x: number, y: number, intensity: number, errorRate: number, scale: number = 1) => {
      const hue = Math.max(120 - intensity * 120, 0) // Green to red based on load
      const brightness = errorRate > 5 ? 40 : 60 // Dimmer if high error rate
      ctx.fillStyle = `hsl(${hue}, 80%, ${brightness}%)`
      
      const size = 30 * scale
      const halfSize = size / 2
      ctx.fillRect(x - halfSize, y - halfSize, size, size)
      
      // Server details (scaled)
      ctx.fillStyle = '#000'
      const detailSize = 20 * scale
      const detailHalf = detailSize / 2
      ctx.fillRect(x - detailHalf, y - detailHalf, detailSize, 5 * scale)
      ctx.fillRect(x - detailHalf, y - 2 * scale, detailSize, 5 * scale)
      ctx.fillRect(x - detailHalf, y + 6 * scale, detailSize, 5 * scale)
      
      ctx.fillStyle = '#fff'
      ctx.font = `${Math.max(6, 8 * scale)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('Server', x, y + 25 * scale)
    }

    const drawDatabase = (ctx: CanvasRenderingContext2D, x: number, y: number, intensity: number, isReplica: boolean, errorRate: number, scale: number = 1) => {
      const baseHue = isReplica ? 30 : 300 // Orange for replicas, purple for primary
      const hue = Math.max(baseHue - intensity * 60, isReplica ? 0 : 240)
      const brightness = errorRate > 5 ? 40 : 60
      ctx.fillStyle = `hsl(${hue}, 80%, ${brightness}%)`
      
      // Draw scaled cylinder
      const width = 40 * scale
      const height = 30 * scale
      const ellipseRadiusX = 20 * scale
      const ellipseRadiusY = 8 * scale
      
      ctx.fillRect(x - width/2, y - height/2, width, height)
      ctx.beginPath()
      ctx.ellipse(x, y - height/2, ellipseRadiusX, ellipseRadiusY, 0, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x, y + height/2, ellipseRadiusX, ellipseRadiusY, 0, 0, 2 * Math.PI)
      ctx.fill()
      
      ctx.fillStyle = '#fff'
      ctx.font = `${Math.max(6, 8 * scale)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(isReplica ? 'Replica' : 'Database', x, y + 35 * scale)
    }

    const drawConnection = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, isRead = false) => {
      ctx.strokeStyle = isRead ? 'rgba(255, 165, 0, 0.4)' : '#444' // Much lighter for read replicas
      ctx.lineWidth = isRead ? 1 : 2 // Thinner for read replicas
      ctx.setLineDash(isRead ? [3, 3] : []) // Smaller dash pattern for read replicas
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const drawLabels = (ctx: CanvasRenderingContext2D, _clientX: number, _lbX: number, _serverX: number, _dbX: number, _centerY: number, arch: SystemArchitecture) => {
      ctx.fillStyle = '#888'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'left'
      
      let y = 20
      ctx.fillText(`Traffic: ${systemState.rps} RPS`, 10, y)
      y += 15
      ctx.fillText(`Servers: ${arch.servers}`, 10, y)
      y += 15
      if (arch.loadBalancer) {
        ctx.fillText('Load Balancer: ✓', 10, y)
        y += 15
      }
      if (arch.readReplicas > 0) {
        ctx.fillText(`Read Replicas: ${arch.readReplicas}`, 10, y)
      }
    }

    const updateParticles = (_width: number, _height: number, clientX: number, lbX: number, serverX: number, dbX: number, centerY: number, _startY: number, serverSpacing: number, dbStartY: number, dbSpacing: number, totalDatabases: number, serverScale: number, dbScale: number) => {
      const particles = particlesRef.current
      const targetParticlesPerSecond = Math.max(systemState.rps / 3, 4)
      const framesPerParticle = 60 / targetParticlesPerSecond
      
      spawnCounterRef.current += 1
      
      // Spawn new particles
      if (spawnCounterRef.current >= framesPerParticle) {
        spawnCounterRef.current = 0
        
        const isError = Math.random() < (serverMetrics?.errorRate || 0) / 100
        const isRead = Math.random() < 0.8 // 80% read traffic
        
        particles.push({
          x: clientX + 30,
          y: centerY,
          vx: 2,
          vy: 0,
          age: 0,
          maxAge: 200,
          isError,
          isRead,
          progress: 0,
          stage: architecture.loadBalancer ? 'client-to-lb' : 'direct-to-server'
        })
      }
      
      // Update existing particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.age++
        
        if (p.age > p.maxAge) {
          particles.splice(i, 1)
          continue
        }
        
        // Update progress along current path segment
        p.progress += 0.02
        
        // Define path endpoints based on stage
        let startX: number, startY: number, endX: number, endY: number
        
        switch (p.stage) {
          case 'client-to-lb':
            startX = clientX + 30
            startY = centerY
            endX = lbX - 15
            endY = centerY
            break
            
          case 'lb-to-server': {
            startX = lbX + 15
            startY = centerY
            const targetServerY = centerY - ((architecture.servers - 1) * serverSpacing) / 2 + (p.serverId || 0) * serverSpacing
            endX = serverX - (15 * serverScale)
            endY = targetServerY
            break
          }
            
          case 'direct-to-server':
            startX = clientX + 30
            startY = centerY
            endX = serverX - (15 * serverScale)
            endY = centerY
            break
            
          case 'server-to-db':
            startX = serverX + (15 * serverScale)
            startY = centerY - ((architecture.servers - 1) * serverSpacing) / 2 + (p.serverId || 0) * serverSpacing
            endX = dbX - (20 * dbScale)
            endY = totalDatabases === 1 ? centerY : dbStartY
            break
            
          case 'server-to-replica':
            startX = serverX + (15 * serverScale)
            startY = centerY - ((architecture.servers - 1) * serverSpacing) / 2 + (p.serverId || 0) * serverSpacing
            endX = dbX - (20 * dbScale)
            endY = dbStartY + ((p.replicaId || 0) + 1) * dbSpacing
            break
            
          default:
            startX = p.x
            startY = p.y
            endX = p.x
            endY = p.y
        }
        
        // Linear interpolation along the path
        p.x = startX + (endX - startX) * p.progress
        p.y = startY + (endY - startY) * p.progress
        
        // Check if particle reached the end of current segment
        if (p.progress >= 1) {
          p.progress = 0
          
          switch (p.stage) {
            case 'client-to-lb':
              // Reached load balancer, route to random server
              p.stage = 'lb-to-server'
              p.serverId = Math.floor(Math.random() * architecture.servers)
              break
              
            case 'lb-to-server':
            case 'direct-to-server':
              // Reached server, route to database or replica
              // Ensure serverId is set for direct-to-server case
              if (p.stage === 'direct-to-server') {
                p.serverId = 0 // Single server case
              }
              
              if (p.isRead && architecture.readReplicas > 0 && Math.random() < 0.7) {
                p.stage = 'server-to-replica'
                p.replicaId = Math.floor(Math.random() * architecture.readReplicas)
              } else {
                p.stage = 'server-to-db'
              }
              break
              
            case 'server-to-db':
            case 'server-to-replica':
              // Reached database, extend lifetime briefly to show arrival
              p.maxAge = p.age + 30 // Show for 0.5 seconds at database
              break
          }
        }
      }
    }

    const drawParticles = (ctx: CanvasRenderingContext2D) => {
      const particles = particlesRef.current
      
      particles.forEach(p => {
        if (p.isError) {
          ctx.fillStyle = 'rgba(255, 100, 100, 1)'
        } else if (p.isRead) {
          ctx.fillStyle = 'rgba(100, 255, 100, 1)'
        } else {
          ctx.fillStyle = 'rgba(100, 150, 255, 1)'
        }
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.5, 0, 2 * Math.PI)
        ctx.fill()
      })
    }

    animate()

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [systemState, serverMetrics, dbMetrics, architecture])

  return (
    <canvas 
      ref={canvasRef} 
      className={styles.canvas}
    />
  )
}