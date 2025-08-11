import * as THREE from 'three'

interface Bird {
  mesh: THREE.Group
  velocity: THREE.Vector3
  targetPoint: THREE.Vector3
  wingPhase: number
  type: 'raven' | 'owl' | 'bat' | 'phoenix'
  collected: boolean
}

export class BirdSystem {
  private scene: THREE.Scene
  private birds: Bird[] = []
  private maxBirds: number = 20
  private spawnTimer: number = 0
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
  }
  
  private createBird(type: Bird['type']): THREE.Group {
    const group = new THREE.Group()
    
    // Bird body
    const bodyGeometry = new THREE.SphereGeometry(2, 8, 6)
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: type === 'raven' ? 0x111111 :
             type === 'owl' ? 0x8b7355 :
             type === 'bat' ? 0x2a1810 :
             0xff4500, // phoenix
      emissive: type === 'phoenix' ? 0xff2200 : 0x000000,
      emissiveIntensity: type === 'phoenix' ? 0.5 : 0
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    group.add(body)
    
    // Wings
    const wingGeometry = new THREE.PlaneGeometry(8, 3)
    const wingMaterial = new THREE.MeshPhongMaterial({
      color: bodyMaterial.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    })
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial)
    leftWing.position.set(-3, 0, 0)
    leftWing.rotation.y = -0.3
    group.add(leftWing)
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial.clone())
    rightWing.position.set(3, 0, 0)
    rightWing.rotation.y = 0.3
    group.add(rightWing)
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.3, 6, 6)
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: type === 'owl' ? 0xffff00 : 0xff0000
    })
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.7, 0.5, 1.5)
    group.add(leftEye)
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.7, 0.5, 1.5)
    group.add(rightEye)
    
    // Phoenix fire effect
    if (type === 'phoenix') {
      const fireLight = new THREE.PointLight(0xff6600, 3, 20)
      group.add(fireLight)
      
      // Fire particles
      const particleCount = 20
      const particleGeometry = new THREE.BufferGeometry()
      const positions = new Float32Array(particleCount * 3)
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 4
        positions[i * 3 + 1] = (Math.random() - 0.5) * 4
        positions[i * 3 + 2] = (Math.random() - 0.5) * 4
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      
      const particleMaterial = new THREE.PointsMaterial({
        color: 0xff6600,
        size: 1,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      })
      
      const particles = new THREE.Points(particleGeometry, particleMaterial)
      group.add(particles)
    }
    
    return group
  }
  
  spawnBird() {
    if (this.birds.length >= this.maxBirds) return
    
    const types: Bird['type'][] = ['raven', 'owl', 'bat', 'phoenix']
    const type = types[Math.floor(Math.random() * types.length)]
    
    const bird: Bird = {
      mesh: this.createBird(type),
      velocity: new THREE.Vector3(),
      targetPoint: new THREE.Vector3(
        (Math.random() - 0.5) * 200,
        50 + Math.random() * 100,
        (Math.random() - 0.5) * 200
      ),
      wingPhase: Math.random() * Math.PI * 2,
      type,
      collected: false
    }
    
    // Random spawn position
    bird.mesh.position.set(
      (Math.random() - 0.5) * 300,
      50 + Math.random() * 100,
      (Math.random() - 0.5) * 300
    )
    
    this.birds.push(bird)
    this.scene.add(bird.mesh)
  }
  
  update(deltaTime: number, playerPosition: THREE.Vector3) {
    this.spawnTimer += deltaTime
    if (this.spawnTimer > 2) {
      this.spawnBird()
      this.spawnTimer = 0
    }
    
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i]
      
      if (bird.collected) {
        // Fly up and fade when collected
        bird.mesh.position.y += 2
        bird.mesh.scale.multiplyScalar(0.95)
        
        if (bird.mesh.scale.x < 0.01) {
          this.scene.remove(bird.mesh)
          this.birds.splice(i, 1)
        }
        continue
      }
      
      // Flocking behavior
      const separation = new THREE.Vector3()
      const alignment = new THREE.Vector3()
      const cohesion = new THREE.Vector3()
      let neighbors = 0
      
      this.birds.forEach(other => {
        if (other === bird || other.collected) return
        
        const distance = bird.mesh.position.distanceTo(other.mesh.position)
        if (distance < 30) {
          // Separation
          const diff = bird.mesh.position.clone().sub(other.mesh.position)
          diff.normalize()
          diff.divideScalar(distance)
          separation.add(diff)
          
          // Alignment
          alignment.add(other.velocity)
          
          // Cohesion
          cohesion.add(other.mesh.position)
          neighbors++
        }
      })
      
      if (neighbors > 0) {
        separation.divideScalar(neighbors)
        alignment.divideScalar(neighbors)
        cohesion.divideScalar(neighbors)
        cohesion.sub(bird.mesh.position)
      }
      
      // Move toward target point
      const toTarget = bird.targetPoint.clone().sub(bird.mesh.position)
      toTarget.normalize()
      
      // Avoid player if too close
      const toPlayer = bird.mesh.position.clone().sub(playerPosition)
      const playerDistance = toPlayer.length()
      if (playerDistance < 30) {
        toPlayer.normalize()
        toPlayer.multiplyScalar(2)
        bird.velocity.add(toPlayer)
      }
      
      // Combine all forces
      bird.velocity.add(separation.multiplyScalar(1.5))
      bird.velocity.add(alignment.multiplyScalar(0.5))
      bird.velocity.add(cohesion.multiplyScalar(0.01))
      bird.velocity.add(toTarget.multiplyScalar(0.2))
      
      // Limit speed
      const speed = bird.type === 'phoenix' ? 15 : 
                   bird.type === 'owl' ? 8 :
                   bird.type === 'bat' ? 12 : 10
      
      if (bird.velocity.length() > speed) {
        bird.velocity.normalize()
        bird.velocity.multiplyScalar(speed)
      }
      
      // Update position
      bird.mesh.position.add(bird.velocity.clone().multiplyScalar(deltaTime))
      
      // Face direction of movement
      if (bird.velocity.length() > 0.1) {
        bird.mesh.lookAt(bird.mesh.position.clone().add(bird.velocity))
      }
      
      // Animate wings
      bird.wingPhase += deltaTime * 5
      const wingAngle = Math.sin(bird.wingPhase) * 0.5
      
      const leftWing = bird.mesh.children[1] as THREE.Mesh
      const rightWing = bird.mesh.children[2] as THREE.Mesh
      
      if (leftWing) leftWing.rotation.z = wingAngle
      if (rightWing) rightWing.rotation.z = -wingAngle
      
      // Update phoenix particles
      if (bird.type === 'phoenix') {
        const particles = bird.mesh.children.find(child => child instanceof THREE.Points) as THREE.Points
        if (particles) {
          const positions = particles.geometry.attributes.position.array as Float32Array
          for (let j = 0; j < positions.length; j += 3) {
            positions[j + 1] -= 0.1
            if (positions[j + 1] < -2) {
              positions[j] = (Math.random() - 0.5) * 4
              positions[j + 1] = 2
              positions[j + 2] = (Math.random() - 0.5) * 4
            }
          }
          particles.geometry.attributes.position.needsUpdate = true
        }
      }
      
      // Pick new target occasionally
      if (Math.random() < 0.01) {
        bird.targetPoint = new THREE.Vector3(
          (Math.random() - 0.5) * 200,
          50 + Math.random() * 100,
          (Math.random() - 0.5) * 200
        )
      }
    }
  }
  
  checkCollection(playerPosition: THREE.Vector3, collectionRadius: number = 10): Bird['type'][] {
    const collected: Bird['type'][] = []
    
    this.birds.forEach(bird => {
      if (!bird.collected) {
        const distance = bird.mesh.position.distanceTo(playerPosition)
        if (distance < collectionRadius) {
          bird.collected = true
          collected.push(bird.type)
        }
      }
    })
    
    return collected
  }
  
  cleanup() {
    this.birds.forEach(bird => {
      this.scene.remove(bird.mesh)
      bird.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          }
        }
      })
    })
    this.birds = []
  }
}