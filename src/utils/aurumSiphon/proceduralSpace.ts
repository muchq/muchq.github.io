import * as THREE from 'three'

interface SpaceObject {
  mesh: THREE.Object3D
  velocity: THREE.Vector3
  rotationSpeed: THREE.Vector3
  type: 'asteroid' | 'planet' | 'ufo'
  removeDistance: number
  destroyed?: boolean
}

export class ProceduralSpace {
  private scene: THREE.Scene
  private spaceObjects: SpaceObject[] = []
  private asteroidGeometries: THREE.BufferGeometry[] = []
  private planetMaterials: THREE.Material[] = []
  private lastUfoSpawn: number = Date.now()
  private ufoSpawnInterval: number = 15000 // Spawn UFO every 15 seconds on average

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.initializeAssets()
    this.generateInitialObjects()
  }

  private initializeAssets() {
    // Create various asteroid geometries
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.DodecahedronGeometry(1, 0)
      // Distort vertices for unique shapes
      const positions = geometry.attributes.position.array as Float32Array
      for (let j = 0; j < positions.length; j += 3) {
        const noise = 0.8 + Math.random() * 0.4
        positions[j] *= noise
        positions[j + 1] *= noise
        positions[j + 2] *= noise
      }
      geometry.computeVertexNormals()
      this.asteroidGeometries.push(geometry)
    }

    // Create various planet materials
    const planetColors = [
      { color: 0x8B4513, emissive: 0x4B2808 }, // Brown/Mars-like
      { color: 0x4169E1, emissive: 0x1E3A8A }, // Blue/Neptune-like
      { color: 0xFF6347, emissive: 0x8B2500 }, // Red/Jupiter-like
      { color: 0x9370DB, emissive: 0x4B0082 }, // Purple alien planet
      { color: 0x20B2AA, emissive: 0x008B8B }, // Cyan ice planet
    ]

    planetColors.forEach(colors => {
      this.planetMaterials.push(new THREE.MeshPhongMaterial({
        color: colors.color,
        emissive: colors.emissive,
        emissiveIntensity: 0.2,
        shininess: 30
      }))
    })
  }

  private generateInitialObjects() {
    // Generate initial asteroids
    for (let i = 0; i < 30; i++) {
      this.spawnAsteroid(true)
    }

    // Generate initial planets
    for (let i = 0; i < 5; i++) {
      this.spawnPlanet(true)
    }
  }

  private spawnAsteroid(initial: boolean = false) {
    const geometry = this.asteroidGeometries[Math.floor(Math.random() * this.asteroidGeometries.length)].clone()
    const scale = 2 + Math.random() * 8
    geometry.scale(scale, scale, scale)

    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(0.05, 0.1, 0.3 + Math.random() * 0.3),
      emissive: new THREE.Color().setHSL(0.05, 0.5, 0.1),
      emissiveIntensity: 0.1,
      shininess: 10
    })

    const asteroid = new THREE.Mesh(geometry, material)
    
    if (initial) {
      // Spawn randomly in space
      asteroid.position.set(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 400
      )
    } else {
      // Spawn at edge of view
      const side = Math.floor(Math.random() * 4)
      switch(side) {
        case 0: asteroid.position.set(-250, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200); break
        case 1: asteroid.position.set(250, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200); break
        case 2: asteroid.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 100, -250); break
        case 3: asteroid.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 100, 250); break
      }
    }

    asteroid.castShadow = true
    asteroid.receiveShadow = true

    const spaceObject: SpaceObject = {
      mesh: asteroid,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.2
      ),
      rotationSpeed: new THREE.Vector3(
        Math.random() * 0.01 - 0.005,
        Math.random() * 0.01 - 0.005,
        Math.random() * 0.01 - 0.005
      ),
      type: 'asteroid',
      removeDistance: 300
    }

    this.scene.add(asteroid)
    this.spaceObjects.push(spaceObject)
  }

  private spawnPlanet(initial: boolean = false) {
    const radius = 15 + Math.random() * 35
    const geometry = new THREE.SphereGeometry(radius, 32, 32)
    const material = this.planetMaterials[Math.floor(Math.random() * this.planetMaterials.length)].clone()
    
    const planet = new THREE.Group()
    const planetMesh = new THREE.Mesh(geometry, material)
    planet.add(planetMesh)

    // Add rings to some planets
    if (Math.random() > 0.5) {
      const ringGeometry = new THREE.RingGeometry(radius * 1.2, radius * 1.8, 64)
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.1, 0.5, 0.5),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      })
      const rings = new THREE.Mesh(ringGeometry, ringMaterial)
      rings.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4
      planet.add(rings)
    }

    // Add atmosphere glow
    const glowGeometry = new THREE.SphereGeometry(radius * 1.1, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: (material as THREE.MeshPhongMaterial).color,
      transparent: true,
      opacity: 0.1
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    planet.add(glow)

    if (initial) {
      planet.position.set(
        (Math.random() - 0.5) * 600,
        (Math.random() - 0.5) * 300,
        (Math.random() - 0.5) * 600
      )
    } else {
      // Spawn far away
      const angle = Math.random() * Math.PI * 2
      const distance = 400 + Math.random() * 200
      planet.position.set(
        Math.cos(angle) * distance,
        (Math.random() - 0.5) * 200,
        Math.sin(angle) * distance
      )
    }

    const spaceObject: SpaceObject = {
      mesh: planet,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        0,
        (Math.random() - 0.5) * 0.05
      ),
      rotationSpeed: new THREE.Vector3(
        0,
        Math.random() * 0.001 - 0.0005,
        0
      ),
      type: 'planet',
      removeDistance: 800
    }

    this.scene.add(planet)
    this.spaceObjects.push(spaceObject)
  }

  private spawnUFO() {
    const ufoGroup = new THREE.Group()

    // Main saucer body
    const bodyGeometry = new THREE.CylinderGeometry(3, 5, 1.5, 16)
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x888888,
      emissive: 0x444488,
      emissiveIntensity: 0.5,
      shininess: 100
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    ufoGroup.add(body)

    // Dome
    const domeGeometry = new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    const domeMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      emissive: 0x4488ff,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.7
    })
    const dome = new THREE.Mesh(domeGeometry, domeMaterial)
    dome.position.y = 0.5
    ufoGroup.add(dome)

    // Lights around the rim
    const lightCount = 8
    for (let i = 0; i < lightCount; i++) {
      const angle = (i / lightCount) * Math.PI * 2
      const lightGeometry = new THREE.SphereGeometry(0.3, 8, 8)
      const lightMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xff0000 : 0x00ff00
      })
      const light = new THREE.Mesh(lightGeometry, lightMaterial)
      light.position.set(Math.cos(angle) * 4, 0, Math.sin(angle) * 4)
      ufoGroup.add(light)
    }

    // Add glow effect
    const glowLight = new THREE.PointLight(0x4488ff, 1, 20)
    glowLight.position.y = -1
    ufoGroup.add(glowLight)

    // Spawn from random edge
    const startAngle = Math.random() * Math.PI * 2
    const endAngle = startAngle + Math.PI + (Math.random() - 0.5) * Math.PI / 2
    const distance = 150

    ufoGroup.position.set(
      Math.cos(startAngle) * distance,
      (Math.random() - 0.5) * 50,
      Math.sin(startAngle) * distance
    )

    // Calculate velocity to fly across view
    const targetPos = new THREE.Vector3(
      Math.cos(endAngle) * distance,
      (Math.random() - 0.5) * 50,
      Math.sin(endAngle) * distance
    )
    
    const direction = targetPos.sub(ufoGroup.position).normalize()
    const speed = 1 + Math.random() * 2

    const spaceObject: SpaceObject = {
      mesh: ufoGroup,
      velocity: direction.multiplyScalar(speed),
      rotationSpeed: new THREE.Vector3(0, 0.05, 0),
      type: 'ufo',
      removeDistance: 250
    }

    this.scene.add(ufoGroup)
    this.spaceObjects.push(spaceObject)
  }

  update(shipPosition: THREE.Vector3) {
    const now = Date.now()

    // Update all space objects
    for (let i = this.spaceObjects.length - 1; i >= 0; i--) {
      const obj = this.spaceObjects[i]
      
      // Remove if destroyed
      if (obj.destroyed) {
        this.scene.remove(obj.mesh)
        obj.mesh.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose()
            if (child.material instanceof THREE.Material) {
              child.material.dispose()
            } else if (Array.isArray(child.material)) {
              child.material.forEach((m: THREE.Material) => m.dispose())
            }
          }
        })
        this.spaceObjects.splice(i, 1)
        continue
      }
      
      // Update position
      obj.mesh.position.add(obj.velocity)
      
      // Update rotation
      obj.mesh.rotation.x += obj.rotationSpeed.x
      obj.mesh.rotation.y += obj.rotationSpeed.y
      obj.mesh.rotation.z += obj.rotationSpeed.z

      // Animate UFO lights
      if (obj.type === 'ufo') {
        obj.mesh.children.forEach((child: THREE.Object3D, index: number) => {
          if (index > 1 && child instanceof THREE.Mesh) { // Skip body and dome
            const material = child.material as THREE.MeshBasicMaterial
            material.opacity = Math.sin(now * 0.01 + index) * 0.3 + 0.7
          }
        })
      }

      // Remove if too far from ship
      const distance = obj.mesh.position.distanceTo(shipPosition)
      if (distance > obj.removeDistance) {
        this.scene.remove(obj.mesh)
        this.spaceObjects.splice(i, 1)

        // Respawn to maintain population
        if (obj.type === 'asteroid' && this.spaceObjects.filter(o => o.type === 'asteroid').length < 30) {
          this.spawnAsteroid()
        } else if (obj.type === 'planet' && this.spaceObjects.filter(o => o.type === 'planet').length < 5) {
          this.spawnPlanet()
        }
      }
    }

    // Spawn UFO occasionally
    if (now - this.lastUfoSpawn > this.ufoSpawnInterval + Math.random() * 10000) {
      this.spawnUFO()
      this.lastUfoSpawn = now
    }

    // Maintain minimum asteroid count
    const asteroidCount = this.spaceObjects.filter(o => o.type === 'asteroid').length
    if (asteroidCount < 20) {
      this.spawnAsteroid()
    }
  }

  getObjects(): SpaceObject[] {
    return this.spaceObjects
  }
  
  getSpaceObjects(): SpaceObject[] {
    return this.spaceObjects
  }
}