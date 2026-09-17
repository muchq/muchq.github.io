import { useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { GameState, GAME_CONFIG } from '@/utils/gameClasses'
import { generateRandomColor, generateRandomSpawnPosition } from '@/utils/gameUtils'
import { RoomResources } from '@/utils/roomResources'
import { DEFAULT_ROOM, roomForGeometry, type RoomGeometry, type RoomGeometryId } from '@/utils/roomGeometry'
import { cameraView, frameAt, sameGeometry, sphereRadiusOf, surfaceFor, turn, walk, type Frame, type Geometry } from '@/utils/surface'
import { mapHeadingDegrees, mapIsRound, mapPoint } from '@/utils/miniMap'
import { bindRoomHotkey, bindRoomTaps, bindShapeHotkey } from '@/utils/hotkeys'
import { AvatarTrails } from '@/utils/avatarTrails'
import { TapeWall } from '@/utils/tapeWall'
import { projectToNdc, viewProjection } from '@/utils/projection'
import { VirtualJoystick } from '@/utils/virtualJoystick'
import { AudioSystem } from '@/utils/audioSystem'
import { isTypingTarget } from '@/utils/keyboard'
import { NetworkManager, thoughtsPlayUrl } from '@/utils/networkSystem'
import type { WorldLink } from '@/utils/worldSync'
import type { HubWorldLink } from '@/utils/hubWorldLink'
import { ShapeType } from '@/types/game'

// The world renderer. On its own it dials the hub (NetworkManager, the
// thoughts page); handed a HubWorldLink it rides the lobby's stream
// instead (MoonBase#1490), attaching once the local player exists.
export const useThoughtsGame = () => {
  const initializeGame = useCallback((canvas: HTMLCanvasElement, onPlayerIdReceived?: (playerId: string) => void, onConnectionStateChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'failed', error?: string) => void, networkManagerRef?: MutableRefObject<{ reconnect: () => void } | null>, link?: HubWorldLink) => {
    // eslint-disable-next-line no-console
    console.log('Starting game initialization...')

    // Initialize game systems
    const gameState = new GameState()
    const audioSystem = new AudioSystem()

    // Prepare local player data
    const randomSpawnPosition = generateRandomSpawnPosition(GAME_CONFIG.worldBoundary)
    const randomColor = generateRandomColor()

    // Create a local player ID immediately (will be replaced by server ID if connected)
    const localPlayerId = 'local-' + Math.random().toString(36).substr(2, 9)
    gameState.localPlayerId = localPlayerId

    // Add local player to the game immediately so it renders
    gameState.addPlayer(
      localPlayerId,
      randomSpawnPosition,
      randomColor,
      ShapeType.SPHERE
    )

    // The way into the world, with the local player already spawned for
    // a link's join to carry.
    const networkManager: WorldLink = link ? link.attach(gameState) : new NetworkManager(gameState)

    // Set callback for when player ID is received
    if (onPlayerIdReceived) {
      networkManager.onPlayerIdReceived = onPlayerIdReceived
    }

    // Set callback for connection state changes
    if (onConnectionStateChange) {
      networkManager.onConnectionStateChange = onConnectionStateChange
    }

    // Store network manager reference for reconnect functionality
    if (networkManagerRef) {
      networkManagerRef.current = {
        reconnect: () => networkManager.reconnect()
      }
    }

    // Notify that we have a player ID (even if offline)
    if (onPlayerIdReceived) {
      onPlayerIdReceived(localPlayerId)
    }

    // Input tracking
    const keys: Record<string, boolean> = {}

    // Track player label elements (needs to be accessible in cleanup)
    const playerLabelElements = new Map<string, HTMLElement>()

    // deja's tape on the glass, drawn over the canvas: the ray tracer
    // has no glyphs, and a splat is a token. Absent its container there
    // is simply no wall to draw on.
    const tapeContainer = document.getElementById('tape-wall-container')
    const tapeWall = tapeContainer ? new TapeWall(tapeContainer) : null

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
    const handleSoundToggle = () => audioSystem.toggleSound()
    soundToggle?.addEventListener('click', handleSoundToggle)
    // Set once the canvas is up; cleanup removes the same reference.
    let resizeCanvas: (() => void) | null = null
    let unbindRoomHotkey: (() => void) | null = null
    let unbindRoomTaps: (() => void) | null = null
    let disposeRooms: (() => void) | null = null

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
        networkManager.sendShapeUpdate(localPlayer.shape)
      }
    }

    // Event listeners: movement keys are read per frame; the one-key
    // commands are bound through the hotkey seam.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      keys[e.key.toLowerCase()] = true
    }
    const unbindShapeHotkey = bindShapeHotkey(document, cyclePlayerShape)

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
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
      // The room decides the ray tracer; the hotkey walks the registry,
      // stepping past any room that will not build.
      const rooms = new RoomResources(gl)
      disposeRooms = () => rooms.dispose()
      let room = DEFAULT_ROOM
      const first = rooms.get(room)

      if (!first) {
        console.error('Failed to create program')
        return () => {}
      }
      let built = first
      let trails = room.trailLength > 0 ? new AvatarTrails(room.trailLength) : null
      audioSystem.setProfile(room.sound)

      // Where the local player stands and which way the camera sits from
      // them, on the surface the hub keeps the room on. One frame carries
      // what a plane position and a camera angle used to: on a sphere
      // there is no angle that means anything everywhere.
      let surface = surfaceFor(room.geometry)
      // The shape of the world itself, which is not the surface it is
      // walked on: the glasshouse walks as the plane does, so the
      // surface cannot say which of the two the hub put the room in.
      let geometry: Geometry = room.geometry
      let frame: Frame = frameAt(surface, randomSpawnPosition)
      gameState.getLocalPlayer()?.updatePosition(frame.position)
      // The room this client asked for, so the hub's answer comes back as
      // the skin it wanted rather than the first that fits the surface.
      let wanted: RoomGeometryId = room.id

      // `next` is how the world is drawn; `shape` is what the hub says it
      // is, and the two are not the same — the hub may put the room on a
      // sphere no room was written for.
      const drawRoom = (next: RoomGeometry, shape: Geometry = next.geometry): boolean => {
        const nextBuilt = rooms.get(next)
        if (!nextBuilt) return false
        room = next
        built = nextBuilt
        geometry = shape
        surface = surfaceFor(shape)
        trails = next.trailLength > 0 ? new AvatarTrails(next.trailLength) : null
        audioSystem.setProfile(next.sound)
        const localPlayer = gameState.getLocalPlayer()
        if (localPlayer) {
          frame = frameAt(surface, localPlayer.position, frame.toCamera)
          localPlayer.updatePosition(frame.position)
        }
        const map = document.getElementById('mini-map')
        // A globe has no corners, and its stylesheet rounds the map, what
        // it clips and the line round it; the plane's map is the square
        // it was.
        if (map) map.dataset.map = mapIsRound(surface) ? 'globe' : 'square'
        // eslint-disable-next-line no-console
        console.log(`🏠 Room: ${room.label}`)
        return true
      }

      // The room's shape is the room's, not this client's: the hub names
      // it on the snapshot a join answers and again whenever a member
      // reshapes it, and everyone standing there redraws together.
      networkManager.onGeometryChange = (shape: Geometry) => {
        if (sameGeometry(geometry, shape)) return
        drawRoom(roomForGeometry(shape, wanted), shape)
      }

      const cycleRoom = () => {
        const next = rooms.next(room.id)
        if (!next) return
        // The room's shape is the hub's: every room is a surface it
        // knows by name, and off the wire there is nobody to ask.
        if (sameGeometry(next.geometry, geometry) || !networkManager.isConnected) {
          if (drawRoom(next)) wanted = next.id
          return
        }
        wanted = next.id
        networkManager.sendSetGeometry(next.geometry)
      }
      unbindRoomHotkey = bindRoomHotkey(document, cycleRoom)
      // The phone's way in to the same command; there is no `g` there.
      // Bound to the canvas's container rather than the canvas, which
      // is pointer-events: none behind the whole page and never sees a
      // touch. The container is what the world is tapped through.
      const world = canvas.parentElement
      if (world) unbindRoomTaps = bindRoomTaps(world, cycleRoom)

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

      // a_position is pinned to location 0 in the vertex shader every
      // room's program links against.
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

      // The ray tracer writes the sky at the far end of depth, which
      // LESS would reject against the cleared buffer.
      gl.depthFunc(gl.LEQUAL)

      // Type guard to ensure gl is not null for the rest of the function
      const webglContext = gl

      // Resize function
      resizeCanvas = () => {
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

        // Anything but a keypress that moved us — the snapshot a join
        // answers, or a reshape placing everyone — replaced the position
        // array, and the hub's word wins. Keep facing where we faced.
        if (localPlayer.position !== frame.position) {
          frame = frameAt(surface, localPlayer.position, frame.toCamera)
          localPlayer.position = frame.position
        }

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

        // A step along the surface: the plane's square stops you at its
        // edge, a sphere has no edge to stop you at.
        if (moveX !== 0 || moveZ !== 0) {
          const before = frame.position
          frame = walk(surface, frame, moveX * GAME_CONFIG.moveSpeed, moveZ * GAME_CONFIG.moveSpeed)
          localPlayer.position = frame.position
          const moved = Math.hypot(
            frame.position[0] - before[0],
            frame.position[1] - before[1],
            frame.position[2] - before[2]
          )
          if (moved > 0.01 && networkManager.isConnected) {
            networkManager.sendPositionUpdate(frame.position)
          }
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
          frame = turn(surface, frame, cameraRotate * GAME_CONFIG.rotateSpeed)
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

        // The square for a plane; for a sphere a globe seen from over
        // the local player, with the far side of the world on the rim.
        function worldToMiniMap(worldPos: [number, number, number]): [number, number] {
          const [x, y] = mapPoint(surface, frame, worldPos)
          return [mapCenter + x * (mapSize / 2), mapCenter + y * (mapSize / 2)]
        }

        // Update local player position and rotation
        const [localMapX, localMapZ] = worldToMiniMap(localPlayer.position)
        const directionDegrees = mapHeadingDegrees(surface, frame)
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
      const updatePlayerLabels = (cameraPosition: [number, number, number], cameraTarget: [number, number, number], cameraUp: [number, number, number]) => {
        const localPlayer = gameState.getLocalPlayer()
        if (!localPlayer) return

        const labelsContainer = document.getElementById('player-labels-container')
        if (!labelsContainer) return

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
                margin-top: -5px;
                pointer-events: none;
                transition: opacity 0.2s ease;
              `
              labelElement.textContent = player.id
              labelsContainer.appendChild(labelElement)
              playerLabelElements.set(player.id, labelElement)
            }

            // Use fixed height matching camera target instead of bouncing position
            const sphereZenith = (GAME_CONFIG.groundLevel + GAME_CONFIG.sphereRadius) + (GAME_CONFIG.bounceHeight / 2)
            const playerY = sphereZenith + GAME_CONFIG.sphereRadius + 0.3 // Position above sphere at fixed height


            // Project 3D position to 2D screen, through the camera the
            // shader casts its rays from. Only shown in front of the camera.
            const projected = projectToNdc(
              surface.place(player.position, playerY - GAME_CONFIG.groundLevel),
              cameraPosition,
              cameraTarget,
              canvas.width / canvas.height,
              cameraUp
            )

            if (projected && projected.forward > 0.1) {
              const screenX = (projected.x + 1) * 0.5 * window.innerWidth
              const screenY = (1 - projected.y) * 0.5 * window.innerHeight

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
        webglContext.useProgram(built.program)
        webglContext.bindVertexArray(quadVAO)
        const u = built.uniforms

        const localPlayer = gameState.getLocalPlayer()

        // The camera stands its distance behind the avatar along the
        // surface and rises from there, so it is never under the floor.
        const playerPos = localPlayer ? localPlayer.position : frame.position
        const waist = (GAME_CONFIG.groundLevel + GAME_CONFIG.sphereRadius) + GAME_CONFIG.bounceHeight / 2
        const view = cameraView(surface, frame, playerPos, gameState.camera, GAME_CONFIG.groundLevel, waist)
        const cameraPosition = view.eye
        const cameraUp = view.up

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
        // Where a wake is drawn: the middle of the bounce, so it leaves
        // the avatar at its waist however high it happens to be.
        const wakeHeight = GAME_CONFIG.sphereRadius + GAME_CONFIG.bounceHeight / 2
        const allPlayers = Array.from(gameState.players.values())
        const objectCenters: number[] = []
        const objectColors: number[] = []
        const objectShapes: number[] = []
        const objectUps: number[] = []

        // Add all players' object data (including local player if it exists)
        for (let i = 0; i < Math.min(allPlayers.length, 10); i++) {
          const player = allPlayers[i]
          const playerBobbingY = player.getBouncingY(time)

          // Add object center where the room draws this plane point
          const center = surface.place(player.position, playerBobbingY - GAME_CONFIG.groundLevel)
          objectCenters.push(center[0], center[1], center[2])
          // The wake follows where the avatar went, not how it bobbed:
          // a steady height, so the ribbon is a path and not a zigzag.
          trails?.record(player.id, surface.place(player.position, wakeHeight))
          const up = surface.up(player.position)
          objectUps.push(up[0], up[1], up[2])

          // Add object color
          objectColors.push(player.color[0], player.color[1], player.color[2])

          // Add object shape
          objectShapes.push(player.shape)
        }

        // Pad arrays to size 10 if needed
        while (objectCenters.length < 30) objectCenters.push(0.0) // 10 objects * 3 components
        while (objectColors.length < 30) objectColors.push(0.0) // 10 objects * 3 components
        while (objectShapes.length < 10) objectShapes.push(0) // 10 objects * 1 component
        while (objectUps.length < 30) objectUps.push(0.0, 1.0, 0.0)

        // Set uniforms for ray tracing
        const cameraTargetPos = view.target

        webglContext.uniform2f(u.u_resolution, canvas.width, canvas.height)
        webglContext.uniform3f(u.u_cameraPos, cameraPosition[0], cameraPosition[1], cameraPosition[2])
        webglContext.uniform3f(u.u_cameraTarget, cameraTargetPos[0], cameraTargetPos[1], cameraTargetPos[2])
        webglContext.uniform3f(u.u_cameraUp, cameraUp[0], cameraUp[1], cameraUp[2])
        webglContext.uniform1f(u.u_time, time * 0.001)
        webglContext.uniform1f(u.u_worldBoundary, GAME_CONFIG.worldBoundary)
        webglContext.uniform1f(u.u_surfaceRadius, sphereRadiusOf(surface.geometry) ?? 0)

        // Update player labels after setting up camera
        updatePlayerLabels(cameraPosition, cameraTargetPos, cameraUp)

        // Only a room with glass has anywhere to put deja's tape; the
        // others hand the wall nothing and it comes down.
        tapeWall?.draw(room.wallHeight > 0 ? gameState.tape.splats : [], {
          cameraPos: cameraPosition,
          cameraTarget: cameraTargetPos,
          cameraUp,
          aspect: canvas.width / canvas.height,
          width: window.innerWidth,
          height: window.innerHeight,
          wall: { boundary: GAME_CONFIG.worldBoundary, base: GAME_CONFIG.groundLevel, height: room.wallHeight },
          now: Date.now() / 1000,
        })

        // Set multiple object data
        webglContext.uniform1i(u.u_numObjects, Math.min(allPlayers.length, 10))
        webglContext.uniform3fv(u.u_objectCenters, objectCenters)
        webglContext.uniform3fv(u.u_objectColors, objectColors)
        webglContext.uniform1iv(u.u_objectShapes, objectShapes)
        webglContext.uniform3fv(u.u_objectUps, objectUps)

        webglContext.drawArrays(webglContext.TRIANGLE_STRIP, 0, 4)

        // What the room hangs outside its walls and trails behind its
        // avatars, over the frame and behind whatever the ray tracer put
        // nearer.
        if (built.lines) {
          trails?.prune(gameState.players.keys())
          built.lines.draw(
            viewProjection(cameraPosition, cameraTargetPos, canvas.width / canvas.height, cameraUp),
            cameraPosition,
            time * 0.001,
            room.behindGlass,
            trails?.strips(id => gameState.players.get(id)?.color ?? [1, 1, 1], cameraPosition) ?? []
          )
        }

        animationId = requestAnimationFrame(render)
      }

      animationId = requestAnimationFrame(render)
    }

    // Dialled here, not from a timer: cleanup's disconnect() retires this
    // dial, so nothing joins the world after teardown. A link is already
    // on the lobby's stream.
    if (networkManager instanceof NetworkManager) networkManager.connect(thoughtsPlayUrl())

    // Handle page unload - notify server when player leaves
    const handleBeforeUnload = () => {
      if (networkManager.isConnected) {
        if (gameState.getLocalPlayer()) {
          networkManager.sendLeave()
        }
        networkManager.disconnect()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      unbindShapeHotkey()
      mobileMenuToggle?.removeEventListener('click', handleMobileMenuToggle)
      soundToggle?.removeEventListener('click', handleSoundToggle)
      if (resizeCanvas) window.removeEventListener('resize', resizeCanvas)
      unbindRoomHotkey?.()
      unbindRoomTaps?.()
      disposeRooms?.()
      window.removeEventListener('beforeunload', handleBeforeUnload)

      if (animationId) {
        cancelAnimationFrame(animationId)
      }

      // Clean up player labels
      playerLabelElements.forEach(element => element.remove())
      playerLabelElements.clear()
      tapeWall?.clear()

      // Clean up game systems
      audioSystem.cleanup()
      networkManager.disconnect()
    }
  }, [])

  return { initializeGame }
}
