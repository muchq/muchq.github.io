import { useCallback } from 'react'
import { vertexShaderSource, fragmentShaderSource } from '@/utils/shaders'
import { GameState, GAME_CONFIG } from '@/utils/gameClasses'
import { generateRandomColor, generateRandomSpawnPosition, createShader, createProgram } from '@/utils/gameUtils'
import { VirtualJoystick } from '@/utils/virtualJoystick'
import { AudioSystem } from '@/utils/audioSystem'
import { NetworkManager, FakeServer } from '@/utils/networkSystem'
import { ShapeType } from '@/types/game'

export const useThoughtsGame = () => {
  const initializeGame = useCallback((canvas: HTMLCanvasElement, onPlayerIdReceived?: (playerId: string) => void) => {
    // eslint-disable-next-line no-console
    console.log('Starting game initialization...')

    // Initialize game systems
    const gameState = new GameState()
    const audioSystem = new AudioSystem()
    const networkManager = new NetworkManager(gameState)

    // Set callback for when player ID is received
    if (onPlayerIdReceived) {
      networkManager.onPlayerIdReceived = onPlayerIdReceived
    }

    // Create fake server if in simulated mode
    const isSimulated = import.meta.env.VITE_THOUGHTS_SIMULATED === 'false' ? false : 
                       import.meta.env.VITE_THOUGHTS_SIMULATED === 'true' ? true : 
                       import.meta.env.DEV
    if (isSimulated) {
      const fakeServer = new FakeServer(networkManager)
      networkManager.setFakeServer(fakeServer)
      // Enable simulation mode
      networkManager.isSimulated = true
    }

    // Prepare local player data (but don't add to game state yet - wait for server ID)
    const randomSpawnPosition = generateRandomSpawnPosition(GAME_CONFIG.worldBoundary)
    const randomColor = generateRandomColor()

    // Store initial player data for when we receive the welcome message
    networkManager.pendingPlayerData = {
      position: randomSpawnPosition,
      color: randomColor,
      shape: ShapeType.SPHERE
    }

    // Input tracking
    const keys: Record<string, boolean> = {}

    // Track player label elements (needs to be accessible in cleanup)
    const playerLabelElements = new Map<string, HTMLElement>()

    // Initialize virtual joysticks
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

    // Setup audio system
    const soundToggle = document.getElementById('sound-toggle')
    soundToggle?.addEventListener('click', () => {
      audioSystem.toggleSound()
    })

    // Function to cycle through shapes
    function cyclePlayerShape() {
      const localPlayer = gameState.getLocalPlayer()
      if (!localPlayer) return

      // Cycle to next shape
      const shapeValues = [ShapeType.SPHERE, ShapeType.CUBE, ShapeType.PYRAMID]
      const currentIndex = shapeValues.indexOf(localPlayer.shape)
      const nextIndex = (currentIndex + 1) % shapeValues.length
      localPlayer.shape = shapeValues[nextIndex]

      // Get shape name for console
      const shapeNames = ['Sphere', 'Cube', 'Pyramid']
      // eslint-disable-next-line no-console
      console.log(`🔄 Shape changed to: ${shapeNames[localPlayer.shape]}`)

      // Send shape update to server
      if (networkManager.isConnected) {
        const message = {
          type: 'shape_update' as const,
          shape: localPlayer.shape,
          timestamp: Date.now()
        }
        networkManager.sendMessage(message)
      }
    }

    // Event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true

      // Handle spacebar for shape cycling
      if (e.key === ' ') {
        e.preventDefault()
        cyclePlayerShape()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    // Setup mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle') as HTMLElement
    const navMenu = document.querySelector('.nav-menu') as HTMLElement

    const handleMobileMenuToggle = () => {
      navMenu?.classList.toggle('active')
    }

    mobileMenuToggle?.addEventListener('click', handleMobileMenuToggle)

    // Setup WebGL2 ray tracer
    const gl = canvas.getContext('webgl2')
    let animationId: number

    if (!gl) {
      console.error('WebGL2 not supported')
      // Fallback to regular WebGL
      const gl1 = canvas.getContext('webgl')
      if (!gl1) {
        console.error('WebGL not supported at all')
        // Set a fallback background
        canvas.style.background = 'linear-gradient(to bottom, #b3d9ff 0%, #6bb6ff 100%)'
        return () => {}
      }
    } else {
      // Create and compile shaders
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

      if (!vertexShader || !fragmentShader) {
        console.error('Failed to create shaders')
        return () => {}
      }

      const program = createProgram(gl, vertexShader, fragmentShader)

      if (!program) {
        console.error('Failed to create program')
        return () => {}
      }

      // Create fullscreen quad
      const quadVertices = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
      ])

      const quadBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW)

      const quadVAO = gl.createVertexArray()
      gl.bindVertexArray(quadVAO)

      const positionLocation = gl.getAttribLocation(program, 'a_position')
      if (positionLocation !== -1) {
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
      }

      // Get uniform locations for ray tracing
      const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
      const cameraPosLocation = gl.getUniformLocation(program, 'u_cameraPos')
      const cameraTargetLocation = gl.getUniformLocation(program, 'u_cameraTarget')
      const timeLocation = gl.getUniformLocation(program, 'u_time')
      const worldBoundaryLocation = gl.getUniformLocation(program, 'u_worldBoundary')

      // Multiple objects support
      const numObjectsLocation = gl.getUniformLocation(program, 'u_numObjects')
      const objectCentersLocation = gl.getUniformLocation(program, 'u_objectCenters')
      const objectColorsLocation = gl.getUniformLocation(program, 'u_objectColors')
      const objectShapesLocation = gl.getUniformLocation(program, 'u_objectShapes')

      // Type guard to ensure gl is not null for the rest of the function
      const webglContext = gl

      // Resize function
      const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1
        canvas.width = window.innerWidth * dpr
        canvas.height = window.innerHeight * dpr
        canvas.style.width = window.innerWidth + 'px'
        canvas.style.height = window.innerHeight + 'px'
        webglContext.viewport(0, 0, canvas.width, canvas.height)
      }

      window.addEventListener('resize', resizeCanvas)
      resizeCanvas()

      // Player update function
      const updateLocalPlayer = () => {
        const localPlayer = gameState.getLocalPlayer()
        if (!localPlayer) return // Skip if no local player yet

        // Calculate camera-relative movement directions
        const forward = [Math.sin(gameState.camera.angle), 0, Math.cos(gameState.camera.angle)]
        const right = [Math.cos(gameState.camera.angle), 0, -Math.sin(gameState.camera.angle)]

        // Store current position for boundary checking and network updates
        const oldPosition: [number, number, number] = [...localPlayer.position]

        // Combine keyboard and joystick input for movement
        let moveX = 0, moveZ = 0

        // WASD keyboard input
        if (keys['w']) moveZ -= 1
        if (keys['s']) moveZ += 1
        if (keys['a']) moveX -= 1
        if (keys['d']) moveX += 1

        // Left joystick input (WASD equivalent)
        if (leftJoystick) {
          moveX += leftJoystick.x
          moveZ += leftJoystick.y // Match WASD behavior
        }

        // Apply movement relative to camera direction
        if (moveX !== 0 || moveZ !== 0) {
          localPlayer.position[0] += (forward[0] * moveZ + right[0] * moveX) * GAME_CONFIG.moveSpeed
          localPlayer.position[2] += (forward[2] * moveZ + right[2] * moveX) * GAME_CONFIG.moveSpeed
        }

        // Boundary collision detection
        if (Math.abs(localPlayer.position[0]) > GAME_CONFIG.worldBoundary) {
          localPlayer.position[0] = oldPosition[0] // Revert X movement
        }
        if (Math.abs(localPlayer.position[2]) > GAME_CONFIG.worldBoundary) {
          localPlayer.position[2] = oldPosition[2] // Revert Z movement
        }

        // Check if position changed and send network update
        const positionChanged = (
          Math.abs(localPlayer.position[0] - oldPosition[0]) > 0.01 ||
          Math.abs(localPlayer.position[2] - oldPosition[2]) > 0.01
        )

        if (positionChanged && networkManager.isConnected) {
          networkManager.sendPositionUpdate(localPlayer.position)
        }

        // Combine keyboard and joystick input for camera control
        let cameraRotate = 0, cameraZoom = 0

        // Arrow key input
        if (keys['arrowleft']) cameraRotate += 1
        if (keys['arrowright']) cameraRotate -= 1
        if (keys['arrowup']) cameraZoom -= 1
        if (keys['arrowdown']) cameraZoom += 1

        // Right joystick input (arrow key equivalent)
        if (rightJoystick) {
          cameraRotate -= rightJoystick.x // Invert X for correct rotation direction
          cameraZoom += rightJoystick.y
        }

        // Apply camera changes
        if (cameraRotate !== 0) {
          gameState.camera.angle += cameraRotate * GAME_CONFIG.rotateSpeed
        }
        if (cameraZoom !== 0) {
          gameState.camera.distance = Math.max(2, Math.min(15, gameState.camera.distance + cameraZoom * GAME_CONFIG.zoomSpeed))
        }
      }

      // Track other player elements on minimap (moved outside updateMiniMap to persist between frames)
      const otherPlayerElements = new Map<string, HTMLElement>()

      // Mini-map update function
      const updateMiniMap = () => {
        const localPlayer = gameState.getLocalPlayer()
        if (!localPlayer) return

        // Convert world coordinates to mini-map coordinates
        // Check if we're on mobile (width < 1024px)
        const isMobile = window.innerWidth < 1024
        const mapSize = isMobile ? 65 : 130 // Mobile uses smaller boundary
        const mapMargin = isMobile ? 5 : 10  // Mobile uses smaller margin
        const mapCenter = mapSize / 2 + mapMargin

        // Helper function to convert world position to minimap position
        function worldToMiniMap(worldPos: [number, number, number]): [number, number] {
          const mapX = mapCenter + (worldPos[0] / GAME_CONFIG.worldBoundary) * (mapSize / 2)
          const mapZ = mapCenter + (worldPos[2] / GAME_CONFIG.worldBoundary) * (mapSize / 2)
          return [mapX, mapZ]
        }

        // Update local player position and rotation
        const [localMapX, localMapZ] = worldToMiniMap(localPlayer.position)
        const directionDegrees = -gameState.camera.angle * 180 / Math.PI // Convert to degrees, pointing forward
        const miniMapPlayer = document.getElementById('mini-map-player')
        if (miniMapPlayer) {
          miniMapPlayer.style.left = `${localMapX}px`
          miniMapPlayer.style.top = `${localMapZ}px`
          miniMapPlayer.style.transform = `translate(-50%, -50%) rotate(${directionDegrees}deg)`
        }

        // Update other players
        const allPlayers = Array.from(gameState.players.values())
        const miniMapContent = document.getElementById('mini-map-content')
        const currentOtherPlayerIds = new Set<string>()

        allPlayers.forEach(player => {
          if (player.id === gameState.localPlayerId) return // Skip local player

          currentOtherPlayerIds.add(player.id)

          // Get or create element for this player
          let playerElement = otherPlayerElements.get(player.id)
          if (!playerElement) {
            playerElement = document.createElement('div')
            playerElement.className = 'mini-map-other-player'
            miniMapContent?.appendChild(playerElement)
            otherPlayerElements.set(player.id, playerElement)
          }

          // Update position and color
          const [otherMapX, otherMapZ] = worldToMiniMap(player.position)
          playerElement.style.left = `${otherMapX}px`
          playerElement.style.top = `${otherMapZ}px`

          // Set player color
          const [r, g, b] = player.color
          playerElement.style.backgroundColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
          playerElement.style.boxShadow = `0 0 6px rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.8)`
        })

        // Remove elements for players who are no longer present
        otherPlayerElements.forEach((element, playerId) => {
          if (!currentOtherPlayerIds.has(playerId)) {
            element.remove()
            otherPlayerElements.delete(playerId)
          }
        })
      }

      // Update player labels function
      const updatePlayerLabels = (cameraPosition: [number, number, number], cameraTarget: [number, number, number], time: number) => {
        const localPlayer = gameState.getLocalPlayer()
        if (!localPlayer) return

        const labelsContainer = document.getElementById('player-labels-container')
        if (!labelsContainer) return

        // Camera vectors for projection
        const forward = [
          cameraTarget[0] - cameraPosition[0],
          cameraTarget[1] - cameraPosition[1],
          cameraTarget[2] - cameraPosition[2]
        ]
        const forwardLength = Math.sqrt(forward[0]**2 + forward[1]**2 + forward[2]**2)
        forward[0] /= forwardLength
        forward[1] /= forwardLength
        forward[2] /= forwardLength

        // Calculate right vector by crossing forward with world up [0, 1, 0]
        const worldUp = [0, 1, 0]
        const right = [
          forward[1] * worldUp[2] - forward[2] * worldUp[1], // forward.y * 0 - forward.z * 1 = -forward.z
          forward[2] * worldUp[0] - forward[0] * worldUp[2], // forward.z * 0 - forward.x * 0 = 0
          forward[0] * worldUp[1] - forward[1] * worldUp[0]  // forward.x * 1 - forward.y * 0 = forward.x
        ]
        // Normalize right vector
        const rightLength = Math.sqrt(right[0]**2 + right[1]**2 + right[2]**2)
        if (rightLength > 0) {
          right[0] /= rightLength
          right[1] /= rightLength
          right[2] /= rightLength
        }

        // Calculate up vector by crossing right with forward
        const up = [
          right[1] * forward[2] - right[2] * forward[1],
          right[2] * forward[0] - right[0] * forward[2],
          right[0] * forward[1] - right[1] * forward[0]
        ]

        const allPlayers = Array.from(gameState.players.values())
        const currentOtherPlayerIds = new Set<string>()

        allPlayers.forEach(player => {
          if (player.id === gameState.localPlayerId) return // Skip local player

          currentOtherPlayerIds.add(player.id)

          // Calculate distance to player
          const dx = player.position[0] - localPlayer.position[0]
          const dz = player.position[2] - localPlayer.position[2]
          const distance = Math.sqrt(dx * dx + dz * dz)

          // Only show labels within 20 units
          const maxLabelDistance = 20

          if (distance <= maxLabelDistance) {
            // Get or create label element
            let labelElement = playerLabelElements.get(player.id)
            if (!labelElement) {
              labelElement = document.createElement('div')
              labelElement.className = 'player-label'
              labelElement.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: "Lexend Deca", sans-serif;
                font-size: 12px;
                font-weight: 300;
                white-space: nowrap;
                transform: translate(-50%, -100%);
                margin-top: -10px;
                pointer-events: none;
                transition: opacity 0.2s ease;
              `
              labelElement.textContent = player.id
              labelsContainer.appendChild(labelElement)
              playerLabelElements.set(player.id, labelElement)
            }

            // Get player's Y position with bounce
            const playerY = player.getBouncingY(time) + 1.5 // Add offset above player


            // Project 3D position to 2D screen
            const relPos = [
              player.position[0] - cameraPosition[0],
              playerY - cameraPosition[1],
              player.position[2] - cameraPosition[2]
            ]

            const dotForward = relPos[0] * forward[0] + relPos[1] * forward[1] + relPos[2] * forward[2]

            if (dotForward > 0.1) { // Only show if in front of camera
              // Match the exact projection used in the shader
              const aspectRatio = canvas.width / canvas.height
              const shaderFov = 0.8 // This matches the shader's fov value

              // Project to camera space (matching shader's calculation)
              const rightDot = relPos[0] * right[0] + relPos[1] * right[1] + relPos[2] * right[2]
              const upDot = relPos[0] * up[0] + relPos[1] * up[1] + relPos[2] * up[2]

              // Calculate normalized device coordinates (matching shader)
              const ndcX = (rightDot / dotForward) / shaderFov
              const ndcY = (upDot / dotForward) / shaderFov

              // Convert to screen coordinates
              const screenX = (ndcX * aspectRatio + 1) * 0.5 * window.innerWidth
              const screenY = (1 - ndcY) * 0.5 * window.innerHeight

              labelElement.style.left = screenX + 'px'
              labelElement.style.top = screenY + 'px'

              // Fade based on distance
              const opacity = Math.max(0, 1 - (distance / maxLabelDistance) * 0.5)
              labelElement.style.opacity = opacity.toString()
            } else {
              labelElement.style.opacity = '0'
            }
          } else {
            // Hide label if too far
            const labelElement = playerLabelElements.get(player.id)
            if (labelElement) {
              labelElement.style.opacity = '0'
            }
          }
        })

        // Remove labels for players who left
        playerLabelElements.forEach((element, playerId) => {
          if (!currentOtherPlayerIds.has(playerId)) {
            element.remove()
            playerLabelElements.delete(playerId)
          }
        })
      }

      // FPS tracking
      let lastTime = performance.now()
      let frameCount = 0

      // Game loop
      const render = (time: number) => {
        updateLocalPlayer()
        updateMiniMap()

        // FPS calculation
        frameCount++
        if (time - lastTime >= 1000) { // Update FPS every second
          const fps = Math.round((frameCount * 1000) / (time - lastTime))
          const fpsElement = document.getElementById('fps-counter')
          if (fpsElement) {
            fpsElement.textContent = `FPS: ${fps}`
          }
          frameCount = 0
          lastTime = time
        }

        // Clear with a different color to verify canvas is working
        webglContext.clearColor(0.2, 0.2, 0.8, 1.0)
        webglContext.clear(webglContext.COLOR_BUFFER_BIT | webglContext.DEPTH_BUFFER_BIT)

        webglContext.enable(webglContext.DEPTH_TEST)
        webglContext.useProgram(program)

        const localPlayer = gameState.getLocalPlayer()

        // Calculate camera position - use default position if no local player yet
        const fixedSphereY = -1.0 // Keep camera at a fixed height relative to sphere's center position
        const playerPos = localPlayer ? localPlayer.position : [0, 0, 0] as [number, number, number]
        const cameraPosition: [number, number, number] = [
          playerPos[0] + Math.sin(gameState.camera.angle) * gameState.camera.distance,
          fixedSphereY + gameState.camera.height,
          playerPos[2] + Math.cos(gameState.camera.angle) * gameState.camera.distance
        ]

        // Physics simulation for bouncing (used for visual feedback and sound triggers)

        // Detect ground impact for sound (when sphere is at its lowest point) - only if local player exists
        if (localPlayer) {
          const cycle = (time * 0.001 * GAME_CONFIG.bounceSpeed) % (2 * Math.PI)
          const normalizedTime = cycle / (2 * Math.PI)
          const bounceY = 4 * GAME_CONFIG.bounceHeight * normalizedTime * (1 - normalizedTime)
          const isAtGround = bounceY < 0.05 // Very close to ground
          const timeSinceLastBounce = time - localPlayer.lastBounceTime

          if (isAtGround && timeSinceLastBounce > 200) { // Prevent multiple triggers, min 200ms between bounces
            audioSystem.playBoingSound()
            localPlayer.lastBounceTime = time
          }
        }

        // Prepare object data for all players
        const allPlayers = Array.from(gameState.players.values())
        const objectCenters: number[] = []
        const objectColors: number[] = []
        const objectShapes: number[] = []

        // Add all players' object data (including local player if it exists)
        for (let i = 0; i < Math.min(allPlayers.length, 10); i++) {
          const player = allPlayers[i]
          const playerBobbingY = player.getBouncingY(time)

          // Add object center using direct position
          objectCenters.push(player.position[0], playerBobbingY, player.position[2])

          // Add object color
          objectColors.push(player.color[0], player.color[1], player.color[2])

          // Add object shape
          objectShapes.push(player.shape)
        }

        // Pad arrays to size 10 if needed
        while (objectCenters.length < 30) objectCenters.push(0.0) // 10 objects * 3 components
        while (objectColors.length < 30) objectColors.push(0.0) // 10 objects * 3 components
        while (objectShapes.length < 10) objectShapes.push(0) // 10 objects * 1 component

        // Set uniforms for ray tracing
        const sphereZenith = (GAME_CONFIG.groundLevel + GAME_CONFIG.sphereRadius) + (GAME_CONFIG.bounceHeight / 2) // Midpoint of bounce
        const cameraTargetPos: [number, number, number] = [playerPos[0], sphereZenith, playerPos[2]]

        webglContext.uniform2f(resolutionLocation, canvas.width, canvas.height)
        webglContext.uniform3f(cameraPosLocation, cameraPosition[0], cameraPosition[1], cameraPosition[2])
        webglContext.uniform3f(cameraTargetLocation, cameraTargetPos[0], cameraTargetPos[1], cameraTargetPos[2])
        webglContext.uniform1f(timeLocation, time * 0.001)
        webglContext.uniform1f(worldBoundaryLocation, GAME_CONFIG.worldBoundary)

        // Update player labels after setting up camera
        updatePlayerLabels(cameraPosition, cameraTargetPos, time)

        // Set multiple object data
        webglContext.uniform1i(numObjectsLocation, Math.min(allPlayers.length, 10))
        webglContext.uniform3fv(objectCentersLocation, objectCenters)
        webglContext.uniform3fv(objectColorsLocation, objectColors)
        webglContext.uniform1iv(objectShapesLocation, objectShapes)

        webglContext.drawArrays(webglContext.TRIANGLE_STRIP, 0, 4)

        animationId = requestAnimationFrame(render)
      }

      animationId = requestAnimationFrame(render)
    }

    // Connect to server (or simulate connection)
    const websocketUrl = import.meta.env.VITE_THOUGHTS_WEBSOCKET_URL || 'wss://thoughts.muchq.com/ws'
    networkManager.connect(websocketUrl)

    // Handle page unload - notify server when player leaves
    const handleBeforeUnload = () => {
      if (networkManager.isConnected) {
        const localPlayer = gameState.getLocalPlayer()
        if (localPlayer) {
          const message = {
            type: 'player_leave' as const,
            timestamp: Date.now()
          }
          networkManager.sendMessage(message)
        }
        networkManager.disconnect()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      mobileMenuToggle?.removeEventListener('click', handleMobileMenuToggle)
      soundToggle?.removeEventListener('click', () => {})
      window.removeEventListener('resize', () => {})
      window.removeEventListener('beforeunload', handleBeforeUnload)

      if (animationId) {
        cancelAnimationFrame(animationId)
      }

      // Clean up player labels
      playerLabelElements.forEach(element => element.remove())
      playerLabelElements.clear()

      // Clean up game systems
      audioSystem.cleanup()
      networkManager.disconnect()
      if (networkManager.fakeServer) {
        networkManager.fakeServer.stop()
      }
    }
  }, [])

  return { initializeGame }
}
