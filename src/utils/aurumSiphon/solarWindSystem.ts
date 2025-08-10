import * as THREE from 'three'

interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  type: 'gold' | 'platinum' | 'iron' | 'helium' | 'hydrogen'
  mass: number
}

export class SolarWindSystem {
  private scene: THREE.Scene
  private particles: Particle[] = []
  private particlePool: THREE.Mesh[] = []
  private maxParticles: number = 500
  private spawnRate: number = 5
  private windSpeed: number = 1
  private currentLevel: number = 1

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.initializeParticlePool()
  }

  private initializeParticlePool() {
    const geometries = {
      gold: new THREE.SphereGeometry(0.4, 8, 8),
      platinum: new THREE.SphereGeometry(0.35, 8, 8),
      iron: new THREE.SphereGeometry(0.3, 6, 6),
      helium: new THREE.SphereGeometry(0.25, 6, 6),
      hydrogen: new THREE.SphereGeometry(0.2, 6, 6)
    }

    const materials = {
      gold: new THREE.MeshPhongMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.5,
        shininess: 100
      }),
      platinum: new THREE.MeshPhongMaterial({
        color: 0xe5e4e2,
        emissive: 0xaaaaaa,
        emissiveIntensity: 0.3,
        shininess: 80
      }),
      iron: new THREE.MeshPhongMaterial({
        color: 0x888888,
        emissive: 0x444444,
        emissiveIntensity: 0.2
      }),
      helium: new THREE.MeshPhongMaterial({
        color: 0xffcccc,
        emissive: 0xff8888,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8
      }),
      hydrogen: new THREE.MeshPhongMaterial({
        color: 0xccccff,
        emissive: 0x8888ff,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.7
      })
    }

    for (let i = 0; i < this.maxParticles; i++) {
      const type = this.getRandomParticleType()
      const mesh = new THREE.Mesh(geometries[type], materials[type])
      mesh.visible = false
      mesh.userData.type = type
      this.scene.add(mesh)
      this.particlePool.push(mesh)
    }
  }

  private getRandomParticleType(): 'gold' | 'platinum' | 'iron' | 'helium' | 'hydrogen' {
    const rand = Math.random() * 100
    
    const goldChance = 0.2 * this.currentLevel
    const platinumChance = 0.1 * this.currentLevel
    const ironChance = 5
    const heliumChance = 20
    
    if (rand < goldChance) return 'gold'
    if (rand < goldChance + platinumChance) return 'platinum'
    if (rand < goldChance + platinumChance + ironChance) return 'iron'
    if (rand < goldChance + platinumChance + ironChance + heliumChance) return 'helium'
    return 'hydrogen'
  }

  private spawnParticle() {
    if (this.particles.length >= this.maxParticles) return

    const availableMesh = this.particlePool.find(mesh => !mesh.visible)
    if (!availableMesh) return

    const x = -100
    const y = (Math.random() - 0.5) * 80
    const z = (Math.random() - 0.5) * 80

    availableMesh.position.set(x, y, z)
    availableMesh.visible = true

    const particle: Particle = {
      mesh: availableMesh,
      velocity: new THREE.Vector3(
        this.windSpeed + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ),
      type: availableMesh.userData.type,
      mass: this.getParticleMass(availableMesh.userData.type)
    }

    this.particles.push(particle)
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

  update() {
    for (let i = 0; i < this.spawnRate; i++) {
      if (Math.random() < 0.3) {
        this.spawnParticle()
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      
      particle.mesh.position.add(particle.velocity)
      
      particle.mesh.rotation.x += 0.01
      particle.mesh.rotation.y += 0.02
      
      if (particle.mesh.position.x > 100 || 
          Math.abs(particle.mesh.position.y) > 100 ||
          Math.abs(particle.mesh.position.z) > 100) {
        particle.mesh.visible = false
        this.particles.splice(i, 1)
      }
    }
  }

  getParticles(): THREE.Mesh[] {
    return this.particles.map(p => p.mesh)
  }

  removeParticle(mesh: THREE.Mesh) {
    const index = this.particles.findIndex(p => p.mesh === mesh)
    if (index !== -1) {
      mesh.visible = false
      this.particles.splice(index, 1)
    }
  }

  setLevel(level: number) {
    this.currentLevel = level
    this.spawnRate = Math.min(5 + level * 2, 20)
    this.windSpeed = Math.min(1 + level * 0.2, 3)
  }

  reset() {
    this.particles.forEach(particle => {
      particle.mesh.visible = false
    })
    this.particles = []
  }
}