import * as THREE from 'three'
import { CameraController } from '../shared/cameraController'

export class BroomstickController {
  private scene: THREE.Scene
  private cameraController: CameraController
  private broomstick: THREE.Group
  private witch: THREE.Group
  private position: THREE.Vector3
  private velocity: THREE.Vector3
  private rotation: THREE.Euler
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene
    this.cameraController = new CameraController(camera, {
      minDistance: 15,
      maxDistance: 60,
      minPolarAngle: 0.1,
      maxPolarAngle: Math.PI / 2.5,
      offsetY: 10
    })
    this.position = new THREE.Vector3(0, 50, 0)
    this.velocity = new THREE.Vector3(0, 0, -10)
    this.rotation = new THREE.Euler(0, 0, 0)
    
    this.broomstick = this.createBroomstick()
    this.witch = this.createWitch()
    
    this.broomstick.add(this.witch)
    this.scene.add(this.broomstick)
    
    this.setupCamera()
  }
  
  private createBroomstick(): THREE.Group {
    const group = new THREE.Group()
    
    // Broomstick handle
    const handleGeometry = new THREE.CylinderGeometry(0.5, 0.3, 20, 8)
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: 0x4a2c17,
      emissive: 0x2a1c07,
      emissiveIntensity: 0.2
    })
    const handle = new THREE.Mesh(handleGeometry, handleMaterial)
    handle.rotation.z = Math.PI / 2
    group.add(handle)
    
    // Broom bristles
    const bristlesGeometry = new THREE.ConeGeometry(3, 8, 16)
    const bristlesMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b7355,
      emissive: 0x4b3315,
      emissiveIntensity: 0.1
    })
    const bristles = new THREE.Mesh(bristlesGeometry, bristlesMaterial)
    bristles.position.x = -12
    bristles.rotation.z = -Math.PI / 2
    group.add(bristles)
    
    // Magical glow
    const glowLight = new THREE.PointLight(0x9400d3, 2, 20)
    glowLight.position.set(0, -2, 0)
    group.add(glowLight)
    
    // Particle trail
    this.createMagicalTrail(group)
    
    return group
  }
  
  private createWitch(): THREE.Group {
    const group = new THREE.Group()
    
    // Witch body (simplified)
    const bodyGeometry = new THREE.CapsuleGeometry(2, 6, 4, 8)
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x2c1810,
      emissive: 0x1c0800,
      emissiveIntensity: 0.1
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 3
    group.add(body)
    
    // Witch hat
    const hatConeGeometry = new THREE.ConeGeometry(3, 6, 8)
    const hatMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a0033,
      emissive: 0x2a0043,
      emissiveIntensity: 0.3
    })
    const hatCone = new THREE.Mesh(hatConeGeometry, hatMaterial)
    hatCone.position.y = 9
    group.add(hatCone)
    
    const hatBrimGeometry = new THREE.CylinderGeometry(5, 5, 0.5, 16)
    const hatBrim = new THREE.Mesh(hatBrimGeometry, hatMaterial)
    hatBrim.position.y = 6
    group.add(hatBrim)
    
    // Cape
    const capeGeometry = new THREE.PlaneGeometry(8, 10)
    const capeMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a0033,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    })
    const cape = new THREE.Mesh(capeGeometry, capeMaterial)
    cape.position.set(-2, 2, 0)
    cape.rotation.y = Math.PI / 2
    group.add(cape)
    
    return group
  }
  
  private createMagicalTrail(parent: THREE.Group) {
    const particleCount = 100
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2
      positions[i * 3 + 2] = Math.random() * 10
      
      // Purple to pink gradient
      const t = i / particleCount
      colors[i * 3] = 0.6 + t * 0.4
      colors[i * 3 + 1] = 0
      colors[i * 3 + 2] = 0.8 - t * 0.3
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })
    
    const particles = new THREE.Points(geometry, material)
    parent.add(particles)
  }
  
  private setupCamera() {
    this.cameraController.setTarget(this.position)
    this.cameraController.update()
  }
  
  update(input: { move: THREE.Vector2, rotate: number, zoom: number, boost: boolean }) {
    // Banking and turning - A/D turns the witch
    const targetBank = -input.move.x * 0.5
    this.rotation.z += (targetBank - this.rotation.z) * 0.1
    
    // Turn/yaw based on A/D input
    this.rotation.y += input.move.x * 0.02
    
    // Pitch control - W/S controls forward/backward tilt
    const targetPitch = input.move.y * 0.3
    this.rotation.x += (targetPitch - this.rotation.x) * 0.1
    
    // Variable speed - slower base speed, boost with shift
    const forwardSpeed = input.boost ? 8 : 4 // Much slower, boost available
    
    // Calculate movement based on rotation
    this.velocity.x = Math.sin(this.rotation.y) * forwardSpeed
    this.velocity.z = -Math.cos(this.rotation.y) * forwardSpeed
    
    // Vertical movement based on pitch
    this.velocity.y = -Math.sin(this.rotation.x) * forwardSpeed * 0.5
    
    // Update position with delta time
    this.position.add(this.velocity.clone().multiplyScalar(0.016))
    
    // Keep within bounds
    this.position.y = Math.max(20, Math.min(200, this.position.y))
    
    // Update broomstick transform
    this.broomstick.position.copy(this.position)
    this.broomstick.rotation.copy(this.rotation)
    
    // Animate witch cape
    const cape = this.witch.children.find(child => 
      child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry
    )
    if (cape) {
      cape.rotation.x = Math.sin(Date.now() * 0.002) * 0.1 - 0.2
      cape.rotation.z = Math.sin(Date.now() * 0.003) * 0.05
    }
    
    // Update camera controller
    this.cameraController.handleInput({
      rotate: input.rotate,
      zoom: input.zoom
    })
    this.cameraController.followTarget(this.position)
    this.cameraController.update()
    
    // Update magical trail
    const particles = this.broomstick.children.find(child => child instanceof THREE.Points) as THREE.Points
    if (particles) {
      const positions = particles.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] += 0.5
        if (positions[i + 2] > 10) {
          positions[i + 2] = 0
          positions[i] = (Math.random() - 0.5) * 2
          positions[i + 1] = (Math.random() - 0.5) * 2
        }
      }
      particles.geometry.attributes.position.needsUpdate = true
    }
  }
  
  getPosition(): THREE.Vector3 {
    return this.position.clone()
  }
  
  cleanup() {
    this.scene.remove(this.broomstick)
    // Dispose of geometries and materials
    this.broomstick.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        }
      }
    })
  }
}