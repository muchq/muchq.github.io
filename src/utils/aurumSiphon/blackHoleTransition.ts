import * as THREE from 'three'

export class BlackHoleTransition {
  private scene: THREE.Scene
  private particles: THREE.Points[] = []
  private vortexMesh: THREE.Mesh | null = null
  private transitionCallback: () => void
  private isTransitioning: boolean = false
  
  constructor(scene: THREE.Scene, _camera: THREE.Camera, callback: () => void) {
    this.scene = scene
    this.transitionCallback = callback
  }
  
  start() {
    if (this.isTransitioning) return
    this.isTransitioning = true
    
    // Create vortex geometry
    const vortexGeometry = new THREE.ConeGeometry(50, 100, 32, 1, true)
    const vortexMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    })
    
    this.vortexMesh = new THREE.Mesh(vortexGeometry, vortexMaterial)
    this.vortexMesh.position.set(0, 0, -50)
    this.scene.add(this.vortexMesh)
    
    // Create melting particles from screen edges
    this.createMeltingParticles()
    
    // Start animation sequence
    this.animateTransition()
  }
  
  private createMeltingParticles() {
    const particleCount = 5000
    
    for (let i = 0; i < 10; i++) {
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(particleCount * 3)
      const colors = new Float32Array(particleCount * 3)
      const velocities = new Float32Array(particleCount * 3)
      
      for (let j = 0; j < particleCount; j++) {
        // Start from screen edges
        const angle = Math.random() * Math.PI * 2
        const radius = 100 + Math.random() * 50
        
        positions[j * 3] = Math.cos(angle) * radius
        positions[j * 3 + 1] = (Math.random() - 0.5) * 200
        positions[j * 3 + 2] = -50 + Math.random() * 10
        
        // Rainbow colors
        const hue = (i / 10 + j / particleCount) % 1
        const color = new THREE.Color()
        color.setHSL(hue, 1, 0.5)
        
        colors[j * 3] = color.r
        colors[j * 3 + 1] = color.g
        colors[j * 3 + 2] = color.b
        
        // Spiral velocity toward center
        velocities[j * 3] = -positions[j * 3] * 0.01
        velocities[j * 3 + 1] = -positions[j * 3 + 1] * 0.01
        velocities[j * 3 + 2] = -1
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.userData.velocities = velocities
      
      const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      })
      
      const points = new THREE.Points(geometry, material)
      this.particles.push(points)
      this.scene.add(points)
    }
  }
  
  private animateTransition() {
    let phase = 0 // 0: melt, 1: vortex, 2: explosion, 3: clear
    let time = 0
    
    const animate = () => {
      time += 0.016
      
      if (phase === 0) {
        // Melting phase
        this.particles.forEach((points, index) => {
          const material = points.material as THREE.PointsMaterial
          material.opacity = Math.min(1, time * 0.5)
          
          const positions = points.geometry.attributes.position.array as Float32Array
          const velocities = points.geometry.userData.velocities as Float32Array
          
          for (let i = 0; i < positions.length; i += 3) {
            // Spiral inward
            const x = positions[i]
            const y = positions[i + 1]
            const angle = Math.atan2(y, x) + 0.05
            const radius = Math.sqrt(x * x + y * y) * 0.98
            
            positions[i] = Math.cos(angle) * radius
            positions[i + 1] = Math.sin(angle) * radius
            positions[i + 2] += velocities[i + 2]
          }
          
          points.geometry.attributes.position.needsUpdate = true
          points.rotation.z += 0.01 * (index + 1)
        })
        
        if (this.vortexMesh) {
          const material = this.vortexMesh.material as THREE.MeshBasicMaterial
          material.opacity = Math.min(0.8, time * 0.3)
          this.vortexMesh.rotation.z += 0.1
          this.vortexMesh.scale.setScalar(1 + Math.sin(time * 2) * 0.1)
        }
        
        if (time > 3) {
          phase = 1
          time = 0
        }
      } else if (phase === 1) {
        // Vortex collapse
        this.particles.forEach((points) => {
          const positions = points.geometry.attributes.position.array as Float32Array
          
          for (let i = 0; i < positions.length; i += 3) {
            positions[i] *= 0.9
            positions[i + 1] *= 0.9
            positions[i + 2] *= 0.9
          }
          
          points.geometry.attributes.position.needsUpdate = true
          points.rotation.z += 0.2
        })
        
        if (this.vortexMesh) {
          this.vortexMesh.scale.multiplyScalar(0.95)
        }
        
        if (time > 1) {
          phase = 2
          time = 0
        }
      } else if (phase === 2) {
        // Rainbow explosion
        this.particles.forEach((points, index) => {
          const positions = points.geometry.attributes.position.array as Float32Array
          const colors = points.geometry.attributes.color.array as Float32Array
          
          for (let i = 0; i < positions.length; i += 3) {
            // Explode outward
            const velocity = new THREE.Vector3(
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10
            )
            
            positions[i] += velocity.x
            positions[i + 1] += velocity.y
            positions[i + 2] += velocity.z
            
            // Brighten colors
            colors[i] = Math.min(1, colors[i] + 0.01)
            colors[i + 1] = Math.min(1, colors[i + 1] + 0.01)
            colors[i + 2] = Math.min(1, colors[i + 2] + 0.01)
          }
          
          points.geometry.attributes.position.needsUpdate = true
          points.geometry.attributes.color.needsUpdate = true
          
          const material = points.material as THREE.PointsMaterial
          material.size = 3 + Math.sin(time * 10 + index) * 2
        })
        
        if (time > 2) {
          phase = 3
          time = 0
        }
      } else if (phase === 3) {
        // Fade out
        this.particles.forEach((points) => {
          const material = points.material as THREE.PointsMaterial
          material.opacity *= 0.95
        })
        
        if (this.vortexMesh) {
          const material = this.vortexMesh.material as THREE.MeshBasicMaterial
          material.opacity *= 0.95
        }
        
        if (time > 1) {
          this.cleanup()
          this.transitionCallback()
          return
        }
      }
      
      requestAnimationFrame(animate)
    }
    
    animate()
  }
  
  private cleanup() {
    this.particles.forEach(points => {
      this.scene.remove(points)
      points.geometry.dispose()
      if (points.material instanceof THREE.Material) {
        points.material.dispose()
      }
    })
    
    if (this.vortexMesh) {
      this.scene.remove(this.vortexMesh)
      this.vortexMesh.geometry.dispose()
      if (this.vortexMesh.material instanceof THREE.Material) {
        this.vortexMesh.material.dispose()
      }
    }
    
    this.particles = []
    this.vortexMesh = null
    this.isTransitioning = false
  }
}