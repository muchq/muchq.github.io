import * as THREE from 'three'
import { CameraController } from '../shared/cameraController'

export class SpaceshipController {
  private spaceship: THREE.Group
  private velocity: THREE.Vector3
  private scene: THREE.Scene
  private cameraController: CameraController
  public power: number = 100
  public shield: number = 100
  private boostActive: boolean = false
  private boostCooldown: number = 0
  private engineLight: THREE.PointLight
  private trailParticles: THREE.Points

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene
    this.cameraController = new CameraController(camera, {
      minDistance: 15,
      maxDistance: 50,
      minPolarAngle: Math.PI / 3,  // Don't let camera go too high (above)
      maxPolarAngle: Math.PI / 2 - 0.1,  // Keep camera mostly behind (almost horizontal)
      offsetY: 5,  // Slight elevation to see over the ship
      followSpeed: 0.15  // Slightly smoother following
    })
    this.velocity = new THREE.Vector3()
    this.spaceship = this.createSpaceship()
    this.scene.add(this.spaceship)
    
    this.engineLight = new THREE.PointLight(0x00aaff, 1, 20)
    this.engineLight.position.set(0, 0, 3)
    this.spaceship.add(this.engineLight)

    this.trailParticles = this.createTrailParticles()
    this.scene.add(this.trailParticles)
  }

  private createSpaceship(): THREE.Group {
    const group = new THREE.Group()

    // Main fuselage - sleeker design
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 2, 6, 8)
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x3366cc,
      emissive: 0x001122,
      shininess: 150,
      specular: 0x4488ff
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.rotation.x = Math.PI / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    // Angular wings
    const wingShape = new THREE.Shape()
    wingShape.moveTo(0, 0)
    wingShape.lineTo(4, 0)
    wingShape.lineTo(3, 2)
    wingShape.lineTo(0, 1)
    
    const wingGeometry = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3
    })
    
    const wingMaterial = new THREE.MeshPhongMaterial({
      color: 0x5588ff,
      emissive: 0x001133,
      shininess: 100
    })
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial)
    leftWing.position.set(-0.15, 0, 0)
    leftWing.rotation.z = Math.PI / 2
    leftWing.castShadow = true
    group.add(leftWing)
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial)
    rightWing.position.set(0.15, 0, 0)
    rightWing.rotation.z = -Math.PI / 2
    rightWing.scale.x = -1
    rightWing.castShadow = true
    group.add(rightWing)

    // Cockpit with glass effect
    const cockpitGeometry = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6)
    const cockpitMaterial = new THREE.MeshPhongMaterial({
      color: 0x001155,
      emissive: 0x0088ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7,
      shininess: 200
    })
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial)
    cockpit.position.z = -2
    cockpit.rotation.x = -Math.PI / 2
    group.add(cockpit)

    // Triple engines
    const engineGroup = new THREE.Group()
    for (let i = 0; i < 3; i++) {
      const engineGeometry = new THREE.ConeGeometry(0.4, 2, 6)
      const engineMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        emissive: 0xff3300,
        emissiveIntensity: 0.6
      })
      const engine = new THREE.Mesh(engineGeometry, engineMaterial)
      engine.rotation.x = -Math.PI / 2
      engine.position.x = (i - 1) * 0.8
      engine.position.z = 3
      engineGroup.add(engine)
    }
    group.add(engineGroup)

    // Add detail panels
    const panelGeometry = new THREE.BoxGeometry(0.5, 0.1, 1)
    const panelMaterial = new THREE.MeshPhongMaterial({
      color: 0x223366,
      emissive: 0x001122
    })
    
    for (let i = 0; i < 4; i++) {
      const panel = new THREE.Mesh(panelGeometry, panelMaterial)
      const angle = (i / 4) * Math.PI * 2
      panel.position.x = Math.cos(angle) * 1.5
      panel.position.y = Math.sin(angle) * 1.5
      panel.position.z = (Math.random() - 0.5) * 2
      panel.lookAt(0, 0, panel.position.z)
      group.add(panel)
    }

    return group
  }

  private createTrailParticles(): THREE.Points {
    const geometry = new THREE.BufferGeometry()
    const material = new THREE.PointsMaterial({
      color: 0x00aaff,
      size: 0.3,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })

    const positions = new Float32Array(300)
    for (let i = 0; i < 100; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return new THREE.Points(geometry, material)
  }

  update(moveInput: { x: number; y: number; z: number }, cameraInput: { zoom: number; rotate: number }) {
    const speed = this.boostActive ? 3.0 : 1.5  // Increased speed significantly
    const verticalSpeed = speed * 0.8
    
    // Calculate movement relative to camera angle
    const cameraForward = new THREE.Vector3()
    const cameraRight = new THREE.Vector3()
    
    // Get camera's forward direction from the camera controller's camera
    const camera = this.cameraController.getCamera()
    const cameraDir = new THREE.Vector3()
    camera.getWorldDirection(cameraDir)
    cameraForward.set(cameraDir.x, 0, cameraDir.z).normalize()
    
    // Get camera's right direction
    cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize()
    
    // Apply movement relative to camera view
    this.velocity.set(0, 0, 0)
    
    // Add forward/backward movement
    this.velocity.addScaledVector(cameraForward, moveInput.z * speed)
    
    // Add left/right movement
    this.velocity.addScaledVector(cameraRight, moveInput.x * speed)
    
    // Add vertical movement (independent of camera)
    this.velocity.y = moveInput.y * verticalSpeed

    // Apply velocity to position
    this.spaceship.position.add(this.velocity)

    // Larger world bounds
    this.spaceship.position.x = THREE.MathUtils.clamp(this.spaceship.position.x, -200, 200)
    this.spaceship.position.y = THREE.MathUtils.clamp(this.spaceship.position.y, -50, 50)
    this.spaceship.position.z = THREE.MathUtils.clamp(this.spaceship.position.z, -200, 200)

    // Add banking/tilting when moving for visual feedback
    const targetBankZ = -moveInput.x * 0.5 // Bank when moving left/right (increased)
    const targetPitchX = moveInput.z * 0.4 // Pitch when moving forward/back (increased)
    
    this.spaceship.rotation.z = THREE.MathUtils.lerp(this.spaceship.rotation.z, targetBankZ, 0.15)
    this.spaceship.rotation.x = THREE.MathUtils.lerp(this.spaceship.rotation.x, targetPitchX, 0.15)

    // Update camera controller
    this.cameraController.handleInput({
      rotate: cameraInput.rotate,
      zoom: cameraInput.zoom
    })
    this.cameraController.followTarget(this.spaceship.position)
    this.cameraController.update()

    this.updateTrail()

    if (this.boostActive) {
      this.power -= 0.5
      if (this.power <= 0) {
        this.power = 0
        this.boostActive = false
      }
    } else {
      this.power = Math.min(100, this.power + 0.1)
    }

    if (this.boostCooldown > 0) {
      this.boostCooldown--
    }

    // Engine light intensity based on speed
    const speedFactor = this.velocity.length() / 3
    this.engineLight.intensity = this.boostActive ? 4 : (1 + speedFactor)
  }

  private updateTrail() {
    const positions = this.trailParticles.geometry.attributes.position.array as Float32Array
    
    // Shift existing trail positions
    for (let i = positions.length - 3; i >= 3; i -= 3) {
      positions[i] = positions[i - 3]
      positions[i + 1] = positions[i - 2]
      positions[i + 2] = positions[i - 1]
    }
    
    // Add new trail position behind the ship with more spread when moving
    const trailSpread = Math.max(0.5, this.velocity.length() * 0.3)
    positions[0] = this.spaceship.position.x - this.velocity.x * 0.5 + (Math.random() - 0.5) * trailSpread
    positions[1] = this.spaceship.position.y - this.velocity.y * 0.5 + (Math.random() - 0.5) * trailSpread
    positions[2] = this.spaceship.position.z - this.velocity.z * 0.5 + 3
    
    this.trailParticles.geometry.attributes.position.needsUpdate = true
    
    // Update trail opacity based on speed
    const trailMaterial = this.trailParticles.material as THREE.PointsMaterial
    trailMaterial.opacity = Math.min(0.8, 0.3 + this.velocity.length() * 0.1)
  }

  activateBoost() {
    if (this.power > 20 && this.boostCooldown === 0) {
      this.boostActive = true
      this.boostCooldown = 60
      setTimeout(() => {
        this.boostActive = false
      }, 2000)
    }
  }

  getPosition(): THREE.Vector3 {
    return this.spaceship.position.clone()
  }
  
  getVelocity(): THREE.Vector3 {
    return this.velocity.clone()
  }

  getSpaceship(): THREE.Group {
    return this.spaceship
  }

  takeDamage(amount: number) {
    this.shield -= amount
    if (this.shield < 0) this.shield = 0
  }

  repair(amount: number) {
    this.shield = Math.min(100, this.shield + amount)
  }
  
  cleanup() {
    this.scene.remove(this.spaceship)
    this.spaceship.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        }
      }
    })
  }
}