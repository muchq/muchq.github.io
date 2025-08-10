import { useCallback } from 'react'
import * as THREE from 'three'
import { GameState } from '@/utils/aurumSiphon/gameState'
import { SpaceshipController } from '@/utils/aurumSiphon/spaceshipController'
import { SolarWindSystem } from '@/utils/aurumSiphon/solarWindSystem'
import { MagneticFunnel } from '@/utils/aurumSiphon/magneticFunnel'
import { NetworkManager } from '@/utils/aurumSiphon/networkManager'
import { VirtualJoystick } from '@/utils/virtualJoystick'
import { LevelManager } from '@/utils/aurumSiphon/levelManager'
import { ProceduralSpace } from '@/utils/aurumSiphon/proceduralSpace'
import { LaserSystem } from '@/utils/aurumSiphon/laserSystem'

export const useAurumSiphonGame = () => {
  const initializeGame = useCallback((container: HTMLDivElement, onPlayerIdReceived?: (playerId: string) => void) => {
    // Initializing Aurum Siphon game

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x000033, 100, 1500)
    
    const camera = new THREE.PerspectiveCamera(
      60, // Wider FOV for more dramatic perspective
      container.clientWidth / container.clientHeight,
      0.1,
      3000
    )
    // Start with a more dynamic angle
    camera.position.set(20, 25, 40)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // Brighter ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0x606080, 1.2)  // Blueish ambient, brighter
    scene.add(ambientLight)

    // Main sun light - brighter and warmer
    const sunLight = new THREE.DirectionalLight(0xffffaa, 3)  // Increased intensity
    sunLight.position.set(-1000, 100, 0)  // Slightly above for better shadows
    sunLight.castShadow = true
    sunLight.shadow.camera.left = -100
    sunLight.shadow.camera.right = 100
    sunLight.shadow.camera.top = 100
    sunLight.shadow.camera.bottom = -100
    scene.add(sunLight)
    
    // Add a secondary fill light from above
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5)
    fillLight.position.set(0, 500, 0)
    scene.add(fillLight)
    
    // Add some rim lighting from behind
    const rimLight = new THREE.DirectionalLight(0x4466ff, 0.8)
    rimLight.position.set(500, 200, 500)
    scene.add(rimLight)

    // Create multi-layer parallax starfield with hyperspace effect
    const starLayers: THREE.Points[] = []
    const createStarfield = () => {
      // Create multiple layers for parallax effect
      for (let layer = 0; layer < 3; layer++) {
        const starsGeometry = new THREE.BufferGeometry()
        const starCount = layer === 0 ? 5000 : layer === 1 ? 3000 : 2000
        const size = layer === 0 ? 0.3 : layer === 1 ? 0.6 : 1.0
        const spread = 1000 + layer * 500
        
        const starsMaterial = new THREE.PointsMaterial({
          color: layer === 0 ? 0x8888ff : layer === 1 ? 0xaaaaff : 0xffffff,
          size: size,
          transparent: true,
          opacity: 0.6 + layer * 0.2,
          blending: THREE.AdditiveBlending
        })

        const starsVertices = []
        for (let i = 0; i < starCount; i++) {
          const x = (Math.random() - 0.5) * spread * 2
          const y = (Math.random() - 0.5) * spread * 2
          const z = (Math.random() - 0.5) * spread * 2
          starsVertices.push(x, y, z)
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3))
        const starField = new THREE.Points(starsGeometry, starsMaterial)
        scene.add(starField)
        starLayers.push(starField)
      }
      
      // Add hyperspace streaks
      const streakGeometry = new THREE.BufferGeometry()
      const streakMaterial = new THREE.PointsMaterial({
        color: 0x4488ff,
        size: 2,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      })
      
      const streakPositions = []
      const streakColors = []
      for (let i = 0; i < 500; i++) {
        const angle = Math.random() * Math.PI * 2
        const radius = 100 + Math.random() * 900
        const x = Math.cos(angle) * radius
        const y = (Math.random() - 0.5) * 500
        const z = Math.sin(angle) * radius
        streakPositions.push(x, y, z)
        
        // Color variation for streaks
        const intensity = Math.random() * 0.5 + 0.5
        streakColors.push(intensity * 0.4, intensity * 0.6, intensity)
      }
      
      streakGeometry.setAttribute('position', new THREE.Float32BufferAttribute(streakPositions, 3))
      streakGeometry.setAttribute('color', new THREE.Float32BufferAttribute(streakColors, 3))
      const streaks = new THREE.Points(streakGeometry, streakMaterial)
      scene.add(streaks)
      starLayers.push(streaks)
    }
    createStarfield()

    // Note: Using ProceduralSpace for asteroids instead of static debris

    // Add distant space stations or structures
    const createSpaceStructures = () => {
      // Large space station in the distance
      const stationGroup = new THREE.Group()
      
      // Main ring structure
      const ringGeometry = new THREE.TorusGeometry(30, 5, 8, 20)
      const ringMaterial = new THREE.MeshPhongMaterial({
        color: 0x445566,
        emissive: 0x112233,
        emissiveIntensity: 0.3
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.PI / 2
      stationGroup.add(ring)
      
      // Central hub
      const hubGeometry = new THREE.SphereGeometry(8, 16, 16)
      const hubMaterial = new THREE.MeshPhongMaterial({
        color: 0x556677,
        emissive: 0x223344,
        emissiveIntensity: 0.4
      })
      const hub = new THREE.Mesh(hubGeometry, hubMaterial)
      stationGroup.add(hub)
      
      // Add some lights to the station
      const stationLight = new THREE.PointLight(0x6699ff, 0.5, 100)
      stationGroup.add(stationLight)
      
      stationGroup.position.set(150, 30, -200)
      scene.add(stationGroup)
      
      // Animate the station
      const animateStation = () => {
        stationGroup.rotation.y += 0.0005
        ring.rotation.z += 0.001
      }
      
      return animateStation
    }
    const animateStation = createSpaceStructures()

    const createSun = () => {
      const sunGeometry = new THREE.SphereGeometry(50, 32, 32)
      const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff88
      })
      const sun = new THREE.Mesh(sunGeometry, sunMaterial)
      sun.position.set(-1000, 0, 0)
      scene.add(sun)

      // Brighter, larger corona
      const coronaGeometry = new THREE.SphereGeometry(80, 32, 32)
      const coronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.5
      })
      const corona = new THREE.Mesh(coronaGeometry, coronaMaterial)
      corona.position.copy(sun.position)
      scene.add(corona)
      
      // Add sun glow effect
      const glowGeometry = new THREE.SphereGeometry(120, 16, 16)
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.2
      })
      const glow = new THREE.Mesh(glowGeometry, glowMaterial)
      glow.position.copy(sun.position)
      scene.add(glow)
      
      // Add point light at sun position for actual lighting
      const sunPointLight = new THREE.PointLight(0xffffaa, 2, 2000)
      sunPointLight.position.copy(sun.position)
      scene.add(sunPointLight)
    }
    createSun()

    const gameState = new GameState()
    const networkManager = new NetworkManager(gameState)
    const levelManager = new LevelManager(gameState)
    
    if (onPlayerIdReceived) {
      networkManager.onPlayerIdReceived = onPlayerIdReceived
    }

    const spaceshipController = new SpaceshipController(scene, camera)
    const solarWindSystem = new SolarWindSystem(scene)
    const magneticFunnel = new MagneticFunnel(scene, spaceshipController)
    const proceduralSpace = new ProceduralSpace(scene)
    const laserSystem = new LaserSystem(scene)

    const leftJoystickElement = document.getElementById('left-joystick') as HTMLElement
    const leftKnobElement = document.getElementById('left-knob') as HTMLElement
    const rightJoystickElement = document.getElementById('right-joystick') as HTMLElement
    const rightKnobElement = document.getElementById('right-knob') as HTMLElement

    let leftJoystick: VirtualJoystick | null = null
    let rightJoystick: VirtualJoystick | null = null

    if (leftJoystickElement && leftKnobElement) {
      leftJoystick = new VirtualJoystick(leftJoystickElement, leftKnobElement)
    }

    if (rightJoystickElement && rightKnobElement) {
      rightJoystick = new VirtualJoystick(rightJoystickElement, rightKnobElement)
    }

    const boostButton = document.getElementById('boost-button')
    const funnelToggle = document.getElementById('funnel-toggle')
    const nextLevelButton = document.getElementById('next-level-button')
    const helpButton = document.getElementById('help-button')
    const helpScreen = document.getElementById('help-screen')
    const helpClose = document.getElementById('help-close')

    boostButton?.addEventListener('click', () => {
      spaceshipController.activateBoost()
    })

    funnelToggle?.addEventListener('click', () => {
      magneticFunnel.toggle()
      funnelToggle.textContent = magneticFunnel.isActive ? 'FUNNEL: ON' : 'FUNNEL: OFF'
    })

    nextLevelButton?.addEventListener('click', () => {
      levelManager.nextLevel()
      solarWindSystem.setLevel(levelManager.currentLevel)
      const levelCompleteDiv = document.getElementById('level-complete')
      if (levelCompleteDiv) {
        levelCompleteDiv.style.display = 'none'
      }
    })

    helpButton?.addEventListener('click', () => {
      if (helpScreen) {
        helpScreen.style.display = 'block'
      }
    })

    helpClose?.addEventListener('click', () => {
      if (helpScreen) {
        helpScreen.style.display = 'none'
      }
    })

    const keys: Record<string, boolean> = {}
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Store both the lowercase version and the original key
      const key = e.key
      keys[key] = true
      keys[key.toLowerCase()] = true
      
      // Prevent default for arrow keys to avoid scrolling
      if (key.startsWith('Arrow')) {
        e.preventDefault()
      }
      
      if (key === ' ') {
        e.preventDefault()
        // Shoot laser instead of boost
        const shipPos = spaceshipController.getPosition()
        const cameraDir = new THREE.Vector3()
        camera.getWorldDirection(cameraDir)
        laserSystem.shoot(shipPos, cameraDir)
      }
      
      if (key.toLowerCase() === 'b') {
        spaceshipController.activateBoost()
      }
      
      if (key.toLowerCase() === 'f') {
        magneticFunnel.toggle()
        if (funnelToggle) {
          funnelToggle.textContent = magneticFunnel.isActive ? 'FUNNEL: ON' : 'FUNNEL: OFF'
        }
      }
      
      if (key.toLowerCase() === 'h') {
        if (helpScreen) {
          helpScreen.style.display = helpScreen.style.display === 'block' ? 'none' : 'block'
        }
      }
      
      if (key === 'Escape' && helpScreen) {
        helpScreen.style.display = 'none'
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key
      keys[key] = false
      keys[key.toLowerCase()] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    const updateHUD = () => {
      const levelDisplay = document.getElementById('level-display')
      const goldDisplay = document.getElementById('gold-display')
      const powerDisplay = document.getElementById('power-display')
      const magneticDisplay = document.getElementById('magnetic-display')
      const shieldDisplay = document.getElementById('shield-display')

      if (levelDisplay) levelDisplay.textContent = levelManager.currentLevel.toString()
      if (goldDisplay) {
        const pos = spaceshipController.getPosition()
        goldDisplay.textContent = `${gameState.goldCollected.toFixed(2)} mg | Pos: ${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)}`
      }
      if (powerDisplay) powerDisplay.textContent = `${Math.round(spaceshipController.power)}%`
      if (magneticDisplay) magneticDisplay.textContent = `${Math.round(magneticFunnel.efficiency * 100)}%`
      if (shieldDisplay) shieldDisplay.textContent = `${Math.round(spaceshipController.shield)}%`
    }

    const updateMiniMap = () => {
      const canvas = document.getElementById('mini-map-canvas') as HTMLCanvasElement
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = 150
      canvas.height = 150

      ctx.fillStyle = '#001122'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = '#0066cc'
      ctx.strokeRect(0, 0, canvas.width, canvas.height)

      const shipPos = spaceshipController.getPosition()
      const mapX = (shipPos.x / 200) * canvas.width / 2 + canvas.width / 2
      const mapZ = (shipPos.z / 200) * canvas.height / 2 + canvas.height / 2

      ctx.fillStyle = '#00ff00'
      ctx.beginPath()
      ctx.arc(mapX, mapZ, 3, 0, Math.PI * 2)
      ctx.fill()

      solarWindSystem.getParticles().forEach(particle => {
        const pX = (particle.position.x / 200) * canvas.width / 2 + canvas.width / 2
        const pZ = (particle.position.z / 200) * canvas.height / 2 + canvas.height / 2
        
        ctx.fillStyle = particle.userData.type === 'gold' ? '#ffdd00' : '#4488ff'
        ctx.fillRect(pX - 1, pZ - 1, 2, 2)
      })
    }

    let animationId: number

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      const moveInput = {
        x: 0,
        y: 0,
        z: 0
      }

      const cameraInput = {
        zoom: 0,
        rotate: 0
      }

      // Check for joystick input first (mobile)
      if (leftJoystick && leftJoystick.active) {
        moveInput.x = leftJoystick.getInput().x
        moveInput.z = -leftJoystick.getInput().y
      } 
      
      // Always check keyboard input (can override joystick)
      if (keys['a']) moveInput.x = -1
      if (keys['d']) moveInput.x = 1
      if (keys['w']) moveInput.z = 1   // W should move forward (positive Z in camera space)
      if (keys['s']) moveInput.z = -1  // S should move backward (negative Z in camera space)
      if (keys['q']) moveInput.y = 1  // Fixed: Q should go up (positive Y)
      if (keys['e']) moveInput.y = -1  // Fixed: E should go down (negative Y)

      // Camera control with right joystick or arrow keys
      if (rightJoystick) {
        cameraInput.zoom = -rightJoystick.getInput().y
        cameraInput.rotate = rightJoystick.getInput().x
      }
      
      // Arrow keys override joystick for camera
      if (keys['ArrowUp']) cameraInput.zoom = -1
      if (keys['ArrowDown']) cameraInput.zoom = 1
      if (keys['ArrowLeft']) cameraInput.rotate = 1   // Left arrow rotates camera left (positive rotation)
      if (keys['ArrowRight']) cameraInput.rotate = -1  // Right arrow rotates camera right (negative rotation)

      spaceshipController.update(moveInput, cameraInput)
      solarWindSystem.update()
      magneticFunnel.update()
      proceduralSpace.update(spaceshipController.getPosition())
      laserSystem.update(proceduralSpace.getSpaceObjects())
      animateStation()
      
      // Animate parallax star layers
      const shipVel = spaceshipController.getVelocity()
      starLayers.forEach((layer, index) => {
        const parallaxSpeed = 0.1 * (index + 1) * 0.3  // Different speeds for each layer
        layer.position.x -= shipVel.x * parallaxSpeed
        layer.position.z -= shipVel.z * parallaxSpeed
        
        // Wrap around when too far
        if (Math.abs(layer.position.x) > 1000) layer.position.x *= -0.9
        if (Math.abs(layer.position.z) > 1000) layer.position.z *= -0.9
        
        // Rotate slowly for hyperspace effect
        if (index === 3) { // Streaks layer
          layer.rotation.z += 0.0002
        }
      })

      const collectedParticles = magneticFunnel.checkCollection(solarWindSystem.getParticles())
      collectedParticles.forEach(particle => {
        if (particle.userData.type === 'gold') {
          gameState.goldCollected += 0.01
          gameState.score += 100
        } else if (particle.userData.type === 'platinum') {
          gameState.platinumCollected += 0.005
          gameState.score += 200
        } else {
          gameState.otherMetalsCollected += 0.02
          gameState.score += 50
        }
        solarWindSystem.removeParticle(particle)
      })

      if (levelManager.checkLevelComplete()) {
        const levelCompleteDiv = document.getElementById('level-complete')
        const levelStats = document.getElementById('level-stats')
        if (levelCompleteDiv && levelStats) {
          levelCompleteDiv.style.display = 'block'
          levelStats.textContent = `Gold collected: ${gameState.goldCollected.toFixed(2)} mg | Score: ${gameState.score}`
        }
      }

      updateHUD()
      updateMiniMap()

      renderer.render(scene, camera)
    }

    animate()

    const cleanup = () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', handleResize)
      
      if (animationId) {
        cancelAnimationFrame(animationId)
      }

      // Event listeners are automatically cleaned up when elements are removed

      leftJoystick?.destroy()
      rightJoystick?.destroy()
      
      laserSystem.cleanup()

      renderer.dispose()
      renderer.domElement.remove()

      networkManager.disconnect()
    }

    return cleanup
  }, [])

  return { initializeGame }
}