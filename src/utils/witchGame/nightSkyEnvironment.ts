import * as THREE from 'three'

export class NightSkyEnvironment {
  private scene: THREE.Scene
  private clouds: THREE.Group[] = []
  private stars!: THREE.Points
  private moon!: THREE.Mesh
  private fog!: THREE.Fog
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
    
    this.setupSky()
    this.createMoon()
    this.createStars()
    this.createClouds()
    this.setupLighting()
    this.setupFog()
  }
  
  private setupSky() {
    // Dark night gradient
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32)
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x000033) },
        bottomColor: { value: new THREE.Color(0x000066) },
        offset: { value: 100 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    })
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial)
    this.scene.add(sky)
  }
  
  private createMoon() {
    const moonGeometry = new THREE.SphereGeometry(20, 32, 32)
    const moonMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffcc,
      emissive: 0xffffaa,
      emissiveIntensity: 0.5
    })
    
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial)
    this.moon.position.set(100, 150, -200)
    this.scene.add(this.moon)
    
    // Moon glow
    const glowGeometry = new THREE.SphereGeometry(25, 32, 32)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.3
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    this.moon.add(glow)
    
    // Moonlight
    const moonLight = new THREE.DirectionalLight(0x6666ff, 0.5)
    moonLight.position.copy(this.moon.position)
    moonLight.castShadow = true
    this.scene.add(moonLight)
  }
  
  private createStars() {
    const starCount = 2000
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)
    
    for (let i = 0; i < starCount; i++) {
      const radius = 200 + Math.random() * 300
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      // Slightly varied star colors
      const starColor = new THREE.Color()
      starColor.setHSL(0.6, 0.1, 0.9 + Math.random() * 0.1)
      colors[i * 3] = starColor.r
      colors[i * 3 + 1] = starColor.g
      colors[i * 3 + 2] = starColor.b
      
      sizes[i] = Math.random() * 2
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    
    this.stars = new THREE.Points(geometry, material)
    this.scene.add(this.stars)
  }
  
  private createClouds() {
    const cloudCount = 30
    
    for (let i = 0; i < cloudCount; i++) {
      const cloudGroup = new THREE.Group()
      
      // Create fluffy cloud from multiple spheres
      const puffCount = 6 + Math.floor(Math.random() * 4)
      for (let j = 0; j < puffCount; j++) {
        const puffGeometry = new THREE.SphereGeometry(
          10 + Math.random() * 15,
          8,
          6
        )
        const puffMaterial = new THREE.MeshPhongMaterial({
          color: 0x444466,
          transparent: true,
          opacity: 0.7,
          emissive: 0x222244,
          emissiveIntensity: 0.2
        })
        
        const puff = new THREE.Mesh(puffGeometry, puffMaterial)
        puff.position.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 15
        )
        cloudGroup.add(puff)
      }
      
      cloudGroup.position.set(
        (Math.random() - 0.5) * 400,
        30 + Math.random() * 100,
        (Math.random() - 0.5) * 400
      )
      
      this.clouds.push(cloudGroup)
      this.scene.add(cloudGroup)
    }
  }
  
  private setupLighting() {
    // Ambient light for overall visibility
    const ambientLight = new THREE.AmbientLight(0x222244, 0.4)
    this.scene.add(ambientLight)
    
    // Hemisphere light for sky/ground color variation
    const hemisphereLight = new THREE.HemisphereLight(0x4444ff, 0x002200, 0.3)
    this.scene.add(hemisphereLight)
  }
  
  private setupFog() {
    this.fog = new THREE.Fog(0x000033, 50, 400)
    this.scene.fog = this.fog
  }
  
  update() {
    // Slowly rotate stars
    this.stars.rotation.y += 0.0001
    
    // Animate clouds
    this.clouds.forEach((cloud, index) => {
      cloud.position.x += Math.sin(Date.now() * 0.0001 + index) * 0.1
      cloud.position.z += Math.cos(Date.now() * 0.0001 + index) * 0.1
      cloud.rotation.y += 0.001
      
      // Wrap clouds around
      if (cloud.position.x > 250) cloud.position.x = -250
      if (cloud.position.x < -250) cloud.position.x = 250
      if (cloud.position.z > 250) cloud.position.z = -250
      if (cloud.position.z < -250) cloud.position.z = 250
    })
    
    // Subtle moon glow animation
    const moonGlow = this.moon.children[0] as THREE.Mesh
    if (moonGlow && moonGlow.material instanceof THREE.MeshBasicMaterial) {
      moonGlow.material.opacity = 0.3 + Math.sin(Date.now() * 0.001) * 0.05
    }
  }
  
  cleanup() {
    this.clouds.forEach(cloud => {
      this.scene.remove(cloud)
      cloud.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          }
        }
      })
    })
    
    this.scene.remove(this.stars)
    this.stars.geometry.dispose()
    if (this.stars.material instanceof THREE.Material) {
      this.stars.material.dispose()
    }
    
    this.scene.remove(this.moon)
    this.moon.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        }
      }
    })
    
    this.scene.fog = null
  }
}