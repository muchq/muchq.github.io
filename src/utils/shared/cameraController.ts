import * as THREE from 'three'

export interface CameraControllerOptions {
  minDistance?: number
  maxDistance?: number
  minPolarAngle?: number  // Vertical angle limits
  maxPolarAngle?: number
  rotationSpeed?: number
  zoomSpeed?: number
  followSpeed?: number    // How quickly camera follows target
  offsetY?: number        // Vertical offset from target
}

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private target: THREE.Vector3
  private distance: number
  private azimuthAngle: number = 0  // Horizontal rotation
  private polarAngle: number = Math.PI / 2.5  // Around 72 degrees - more behind than above
  private options: Required<CameraControllerOptions>
  
  constructor(camera: THREE.PerspectiveCamera, options: CameraControllerOptions = {}) {
    this.camera = camera
    this.target = new THREE.Vector3()
    this.distance = 20  // Closer for racing game feel
    
    this.options = {
      minDistance: options.minDistance ?? 10,
      maxDistance: options.maxDistance ?? 100,
      minPolarAngle: options.minPolarAngle ?? 0,
      maxPolarAngle: options.maxPolarAngle ?? Math.PI / 2,
      rotationSpeed: options.rotationSpeed ?? 0.05,
      zoomSpeed: options.zoomSpeed ?? 2,
      followSpeed: options.followSpeed ?? 0.1,
      offsetY: options.offsetY ?? 0
    }
  }
  
  /**
   * Update camera to follow a target position
   * @param targetPosition - The position to follow
   * @param deltaTime - Time since last update (for smooth movement)
   */
  followTarget(targetPosition: THREE.Vector3, _deltaTime: number = 0.016) {
    // Smoothly interpolate target position
    this.target.lerp(targetPosition, this.options.followSpeed)
  }
  
  /**
   * Set the target position immediately (no smoothing)
   */
  setTarget(targetPosition: THREE.Vector3) {
    this.target.copy(targetPosition)
  }
  
  /**
   * Handle camera controls
   * @param input - Control input for rotation and zoom
   */
  handleInput(input: { rotate: number, zoom: number, rotateVertical?: number }) {
    // Horizontal rotation
    this.azimuthAngle += input.rotate * this.options.rotationSpeed
    
    // Vertical rotation (if provided)
    if (input.rotateVertical !== undefined) {
      this.polarAngle += input.rotateVertical * this.options.rotationSpeed
      this.polarAngle = Math.max(
        this.options.minPolarAngle,
        Math.min(this.options.maxPolarAngle, this.polarAngle)
      )
    }
    
    // Zoom
    this.distance += input.zoom * this.options.zoomSpeed
    this.distance = Math.max(
      this.options.minDistance,
      Math.min(this.options.maxDistance, this.distance)
    )
  }
  
  /**
   * Update camera position and orientation
   */
  update() {
    // Calculate camera position in spherical coordinates
    const x = this.distance * Math.sin(this.polarAngle) * Math.sin(this.azimuthAngle)
    const y = this.distance * Math.cos(this.polarAngle) + this.options.offsetY
    const z = this.distance * Math.sin(this.polarAngle) * Math.cos(this.azimuthAngle)
    
    // Set camera position relative to target
    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    )
    
    // Look at target
    this.camera.lookAt(this.target)
  }
  
  /**
   * Set zoom distance directly
   */
  setDistance(distance: number) {
    this.distance = Math.max(
      this.options.minDistance,
      Math.min(this.options.maxDistance, distance)
    )
  }
  
  /**
   * Get current distance from target
   */
  getDistance(): number {
    return this.distance
  }
  
  /**
   * Set horizontal rotation angle
   */
  setAzimuthAngle(angle: number) {
    this.azimuthAngle = angle
  }
  
  /**
   * Set vertical rotation angle
   */
  setPolarAngle(angle: number) {
    this.polarAngle = Math.max(
      this.options.minPolarAngle,
      Math.min(this.options.maxPolarAngle, angle)
    )
  }
  
  /**
   * Reset camera to default position
   */
  reset() {
    this.azimuthAngle = 0
    this.polarAngle = Math.PI / 2.5
    this.distance = 20
  }
  
  /**
   * Get the camera instance
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }
}