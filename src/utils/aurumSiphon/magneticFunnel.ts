import * as THREE from 'three'
import { SpaceshipController } from './spaceshipController'

export class MagneticFunnel {
  private scene: THREE.Scene
  private spaceship: SpaceshipController
  private funnelMesh: THREE.Mesh
  private fieldLines: THREE.LineSegments
  public isActive: boolean = true
  public efficiency: number = 1.0
  private attractionRadius: number = 40  // Doubled attraction range
  private collectionRadius: number = 8   // Increased collection range
  private fieldStrength: number = 1.0    // Doubled field strength

  constructor(scene: THREE.Scene, spaceship: SpaceshipController) {
    this.scene = scene
    this.spaceship = spaceship
    this.funnelMesh = this.createFunnelMesh()
    this.fieldLines = this.createFieldLines()
    this.scene.add(this.funnelMesh)
    this.scene.add(this.fieldLines)
  }

  private createFunnelMesh(): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(
      this.attractionRadius,
      this.attractionRadius * 1.5,
      32,
      1,
      true
    )
    
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      wireframe: true
    })

    const mesh = new THREE.Mesh(geometry, material)
    // Orient toward the sun (negative X direction)
    mesh.rotation.z = -Math.PI / 2  // Point cone toward -X (where sun is)
    return mesh
  }

  private createFieldLines(): THREE.LineSegments {
    const geometry = new THREE.BufferGeometry()
    const material = new THREE.LineBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.3,
      linewidth: 2
    })

    const positions: number[] = []
    const numLines = 8
    const numSegments = 10

    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2
      
      for (let j = 0; j < numSegments; j++) {
        const t = j / numSegments
        const radius = this.attractionRadius * (1 - t * 0.8)
        const height = -this.attractionRadius * 1.5 * t
        
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        
        positions.push(x, height, z)
        
        if (j < numSegments - 1) {
          const nextT = (j + 1) / numSegments
          const nextRadius = this.attractionRadius * (1 - nextT * 0.8)
          const nextHeight = -this.attractionRadius * 1.5 * nextT
          const nextX = Math.cos(angle) * nextRadius
          const nextZ = Math.sin(angle) * nextRadius
          
          positions.push(nextX, nextHeight, nextZ)
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return new THREE.LineSegments(geometry, material)
  }

  update() {
    const shipPos = this.spaceship.getPosition()
    
    // Position funnel in front of ship pointing toward sun
    // The funnel should extend from the ship toward the sun (negative X)
    this.funnelMesh.position.copy(shipPos)
    this.funnelMesh.position.x -= 15  // Position it extending toward sun
    
    // Keep the funnel oriented toward the sun (along -X axis)
    // Reset rotation to base orientation
    this.funnelMesh.rotation.set(0, 0, -Math.PI / 2)  // Point cone toward -X (sun direction)
    
    this.fieldLines.position.copy(this.funnelMesh.position)
    
    if (this.isActive) {
      // Rotate field lines around the cone's axis (which is along X after rotation)
      const time = Date.now() * 0.001
      this.fieldLines.rotation.set(
        time * 0.5,  // Rotate around X axis (along the cone)
        0,
        -Math.PI / 2  // Keep base orientation toward sun
      )
      
      const pulseFactor = Math.sin(time) * 0.1 + 1
      this.funnelMesh.scale.setScalar(pulseFactor)
      
      // Also pulse the field lines slightly
      this.fieldLines.scale.setScalar(pulseFactor * 0.95)
      
      this.efficiency = Math.max(0.3, this.efficiency - 0.001)
    } else {
      // Keep field lines aligned when inactive
      this.fieldLines.rotation.copy(this.funnelMesh.rotation)
    }
    
    this.funnelMesh.visible = this.isActive
    this.fieldLines.visible = this.isActive
  }

  checkCollection(particles: THREE.Mesh[]): THREE.Mesh[] {
    if (!this.isActive) return []

    const collected: THREE.Mesh[] = []
    const shipPos = this.spaceship.getPosition()

    particles.forEach(particle => {
      const distance = particle.position.distanceTo(shipPos)
      
      if (distance < this.attractionRadius) {
        const direction = new THREE.Vector3()
          .subVectors(shipPos, particle.position)
          .normalize()
        
        const particleType = particle.userData.type
        const mass = this.getParticleMass(particleType)
        const attractionForce = (this.fieldStrength * this.efficiency) / (mass * 0.1)
        
        particle.position.add(direction.multiplyScalar(attractionForce))
        
        if (distance < this.collectionRadius) {
          if (particleType === 'gold' || particleType === 'platinum' || particleType === 'iron') {
            collected.push(particle)
          }
        }
      }
    })

    return collected
  }

  private getParticleMass(type: string): number {
    switch (type) {
      case 'gold': return 197
      case 'platinum': return 195
      case 'iron': return 56
      case 'helium': return 4
      case 'hydrogen': return 1
      default: return 1
    }
  }

  toggle() {
    this.isActive = !this.isActive
    if (this.isActive) {
      this.efficiency = 1.0
    }
  }

  setFieldStrength(strength: number) {
    this.fieldStrength = Math.max(0.1, Math.min(2.0, strength))
  }

  recharge() {
    this.efficiency = Math.min(1.0, this.efficiency + 0.1)
  }
  
  cleanup() {
    this.scene.remove(this.funnelMesh)
    this.scene.remove(this.fieldLines)
    this.funnelMesh.geometry.dispose()
    if (this.funnelMesh.material instanceof THREE.Material) {
      this.funnelMesh.material.dispose()
    }
    this.fieldLines.geometry.dispose()
    if (this.fieldLines.material instanceof THREE.Material) {
      this.fieldLines.material.dispose()
    }
  }
}