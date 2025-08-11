import * as THREE from 'three'
import { ProceduralSpace } from './proceduralSpace'

interface Laser {
  mesh: THREE.Object3D
  velocity: THREE.Vector3
  lifeTime: number
}

export class LaserSystem {
  private scene: THREE.Scene
  private lasers: Laser[] = []
  private laserGeometry: THREE.SphereGeometry
  private laserMaterial: THREE.MeshBasicMaterial
  private explosionParticles: THREE.Points[] = []
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
    
    // Make MUCH larger glowing spheres
    this.laserGeometry = new THREE.SphereGeometry(8, 16, 16)
    this.laserMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,  // Bright green for maximum visibility
      transparent: false,
      opacity: 1.0
    })
  }
  
  shoot(position: THREE.Vector3, direction: THREE.Vector3) {
    // Normalize direction
    const normalizedDir = direction.clone().normalize()
    
    // Create a group for the laser bolt with trail
    const laserGroup = new THREE.Group()
    
    // Main laser sphere
    const laser = new THREE.Mesh(this.laserGeometry.clone(), this.laserMaterial.clone())
    laserGroup.add(laser)
    
    // Add trail spheres - make them proportionally larger too
    for (let i = 1; i <= 3; i++) {
      const trailGeometry = new THREE.SphereGeometry(8 - i * 1.5, 8, 8)
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 1.0 - i * 0.25
      })
      const trail = new THREE.Mesh(trailGeometry, trailMaterial)
      trail.position.z = -i * 10  // Position behind the main sphere
      laserGroup.add(trail)
    }
    
    // Start the laser further in front of the ship due to its larger size
    laserGroup.position.copy(position)
    laserGroup.position.add(normalizedDir.clone().multiplyScalar(25))
    
    // Orient the group to face the direction of travel
    laserGroup.lookAt(laserGroup.position.clone().add(normalizedDir))
    
    // Add a VERY bright light to make the laser glow
    const laserLight = new THREE.PointLight(0x00ff00, 50, 100)
    laserGroup.add(laserLight)
    
    this.scene.add(laserGroup)
    
    this.lasers.push({
      mesh: laserGroup,
      velocity: normalizedDir.clone().multiplyScalar(50),
      lifeTime: 200
    })
    
    this.createMuzzleFlash(position, direction)
  }
  
  private createMuzzleFlash(position: THREE.Vector3, direction: THREE.Vector3) {
    const flashGeometry = new THREE.SphereGeometry(3, 8, 8)
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 1.0
    })
    const flash = new THREE.Mesh(flashGeometry, flashMaterial)
    flash.position.copy(position)
    flash.position.add(direction.clone().normalize().multiplyScalar(5))
    this.scene.add(flash)
    
    let flashTime = 0
    const animateFlash = () => {
      flashTime++
      flash.scale.multiplyScalar(1.1)
      flashMaterial.opacity -= 0.15
      
      if (flashTime < 6) {
        requestAnimationFrame(animateFlash)
      } else {
        this.scene.remove(flash)
        flashGeometry.dispose()
        flashMaterial.dispose()
      }
    }
    animateFlash()
  }
  
  update(spaceObjects: ReturnType<ProceduralSpace['getSpaceObjects']>) {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i]
      
      laser.mesh.position.add(laser.velocity)
      laser.lifeTime--
      
      let hit = false
      for (const spaceObject of spaceObjects) {
        const distance = laser.mesh.position.distanceTo(spaceObject.mesh.position)
        const hitRadius = spaceObject.type === 'planet' ? 
          ((spaceObject.mesh.children[0] as THREE.Mesh)?.geometry as THREE.SphereGeometry)?.parameters?.radius || 20 :
          spaceObject.type === 'asteroid' ? 5 : 8
        
        // Add laser radius (8) to hit detection
        if (distance < hitRadius + 8) {
          this.createExplosion(spaceObject.mesh.position.clone(), spaceObject.type)
          spaceObject.destroyed = true
          hit = true
          break
        }
      }
      
      if (hit || laser.lifeTime <= 0 || laser.mesh.position.length() > 2000) {
        this.scene.remove(laser.mesh)
        laser.mesh.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose()
            if (child.material instanceof THREE.Material) {
              child.material.dispose()
            }
          }
        })
        this.lasers.splice(i, 1)
      }
    }
    
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const particles = this.explosionParticles[i]
      const material = particles.material as THREE.PointsMaterial
      material.opacity -= 0.02
      particles.scale.multiplyScalar(1.05)
      
      if (material.opacity <= 0) {
        this.scene.remove(particles)
        particles.geometry.dispose()
        material.dispose()
        this.explosionParticles.splice(i, 1)
      }
    }
  }
  
  private createExplosion(position: THREE.Vector3, objectType: string) {
    const particleCount = objectType === 'planet' ? 200 : 100
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const speed = Math.random() * 2 + 1
      
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y
      positions[i * 3 + 2] = position.z
      
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
      velocities[i * 3 + 2] = Math.cos(phi) * speed
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.userData.velocities = velocities
    
    const material = new THREE.PointsMaterial({
      color: objectType === 'planet' ? 0xffaa00 : 0xff6600,
      size: objectType === 'planet' ? 3 : 2,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    })
    
    const particles = new THREE.Points(geometry, material)
    this.scene.add(particles)
    this.explosionParticles.push(particles)
    
    const explosionLight = new THREE.PointLight(0xffaa00, 5, 50)
    explosionLight.position.copy(position)
    this.scene.add(explosionLight)
    
    let lightTime = 0
    const animateLight = () => {
      lightTime++
      explosionLight.intensity *= 0.9
      
      if (lightTime < 10) {
        requestAnimationFrame(animateLight)
      } else {
        this.scene.remove(explosionLight)
      }
    }
    animateLight()
    
    const animateExplosion = () => {
      const positions = particles.geometry.attributes.position.array as Float32Array
      const velocities = particles.geometry.userData.velocities as Float32Array
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities[i * 3]
        positions[i * 3 + 1] += velocities[i * 3 + 1]
        positions[i * 3 + 2] += velocities[i * 3 + 2]
      }
      
      particles.geometry.attributes.position.needsUpdate = true
      
      if (material.opacity > 0) {
        requestAnimationFrame(animateExplosion)
      }
    }
    animateExplosion()
  }
  
  cleanup() {
    this.lasers.forEach(laser => {
      this.scene.remove(laser.mesh)
      laser.mesh.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          }
        }
      })
    })
    
    this.explosionParticles.forEach(particles => {
      this.scene.remove(particles)
      particles.geometry.dispose()
      if (particles.material instanceof THREE.Material) {
        particles.material.dispose()
      }
    })
    
    this.lasers = []
    this.explosionParticles = []
    
    this.laserGeometry.dispose()
    this.laserMaterial.dispose()
  }
}