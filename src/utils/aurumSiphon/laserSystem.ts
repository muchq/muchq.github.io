import * as THREE from 'three'
import { ProceduralSpace } from './proceduralSpace'

interface Laser {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  lifeTime: number
}

export class LaserSystem {
  private scene: THREE.Scene
  private lasers: Laser[] = []
  private laserGeometry: THREE.CylinderGeometry
  private laserMaterial: THREE.MeshBasicMaterial
  private explosionParticles: THREE.Points[] = []
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
    
    this.laserGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8)
    this.laserMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9
    })
  }
  
  shoot(position: THREE.Vector3, direction: THREE.Vector3) {
    const laser = new THREE.Mesh(this.laserGeometry.clone(), this.laserMaterial.clone())
    
    laser.position.copy(position)
    laser.position.add(direction.clone().multiplyScalar(5))
    
    laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
    
    const laserLight = new THREE.PointLight(0xff0000, 2, 10)
    laser.add(laserLight)
    
    this.scene.add(laser)
    
    this.lasers.push({
      mesh: laser,
      velocity: direction.clone().multiplyScalar(5),
      lifeTime: 100
    })
    
    this.createMuzzleFlash(position, direction)
  }
  
  private createMuzzleFlash(position: THREE.Vector3, direction: THREE.Vector3) {
    const flashGeometry = new THREE.SphereGeometry(1, 8, 8)
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8
    })
    const flash = new THREE.Mesh(flashGeometry, flashMaterial)
    flash.position.copy(position)
    flash.position.add(direction.clone().multiplyScalar(3))
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
        
        if (distance < hitRadius) {
          this.createExplosion(spaceObject.mesh.position.clone(), spaceObject.type)
          spaceObject.destroyed = true
          hit = true
          break
        }
      }
      
      if (hit || laser.lifeTime <= 0 || laser.mesh.position.length() > 500) {
        this.scene.remove(laser.mesh)
        laser.mesh.traverse((child) => {
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
      laser.mesh.traverse((child) => {
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