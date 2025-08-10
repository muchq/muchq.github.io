import type { VirtualJoystickState } from '@/types/game'

export class VirtualJoystick implements VirtualJoystickState {
  container: HTMLElement
  knob: HTMLElement
  centerX: number
  centerY: number
  maxDistance: number
  active: boolean
  x: number // -1 to 1
  y: number // -1 to 1
  touchId: number | null // Track which touch belongs to this joystick

  constructor(container: HTMLElement, knob: HTMLElement) {
    this.container = container
    this.knob = knob
    this.centerX = 60 // Half of joystick width
    this.centerY = 60 // Half of joystick height
    this.maxDistance = 35 // Max distance from center
    this.active = false
    this.x = 0
    this.y = 0
    this.touchId = null

    // Prevent default touch behavior to avoid passive event listener issues
    this.container.style.touchAction = 'none'

    this.setupEvents()
  }

  private setupEvents(): void {
    // Touch events
    this.container.addEventListener('touchstart', (e) => {
      e.preventDefault()
      // Only accept new touch if not already active
      if (!this.active) {
        this.active = true
        this.touchId = e.changedTouches[0].identifier
        this.handleMove(e.changedTouches[0])
      }
    }, { passive: false })

    // Listen to document for touchmove - this is key for multi-touch
    document.addEventListener('touchmove', (e) => {
      if (this.active && this.touchId !== null) {
        // Find the touch that belongs to this joystick
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === this.touchId) {
            e.preventDefault()
            this.handleMove(e.touches[i])
            break
          }
        }
      }
    }, { passive: false })

    document.addEventListener('touchend', (e) => {
      if (this.touchId !== null) {
        // Check if the ended touch belongs to this joystick
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.touchId) {
            e.preventDefault()
            this.active = false
            this.touchId = null
            this.resetPosition()
            break
          }
        }
      }
    }, { passive: false })

    // Handle touch cancel event (e.g., when touch is interrupted)
    document.addEventListener('touchcancel', (e) => {
      if (this.touchId !== null) {
        // Check if the cancelled touch belongs to this joystick
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.touchId) {
            e.preventDefault()
            this.active = false
            this.touchId = null
            this.resetPosition()
            break
          }
        }
      }
    }, { passive: false })

    // Mouse events for testing on desktop
    this.container.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.active = true
      this.handleMove(e)
    })

    document.addEventListener('mousemove', (e) => {
      if (this.active) {
        this.handleMove(e)
      }
    }, { passive: false })

    document.addEventListener('mouseup', () => {
      this.active = false
      this.resetPosition()
    })
  }

  private handleMove(pointer: Touch | MouseEvent): void {
    const rect = this.container.getBoundingClientRect()
    const deltaX = pointer.clientX - rect.left - this.centerX
    const deltaY = pointer.clientY - rect.top - this.centerY

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX)

    const constrainedDistance = Math.min(distance, this.maxDistance)

    const knobX = Math.cos(angle) * constrainedDistance
    const knobY = Math.sin(angle) * constrainedDistance

    // Update knob position (preserve CSS centering and add offset)
    this.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`

    // Update normalized values (-1 to 1)
    this.x = knobX / this.maxDistance
    this.y = knobY / this.maxDistance
  }

  private resetPosition(): void {
    this.knob.style.transform = `translate(-50%, -50%)`
    this.x = 0
    this.y = 0
  }

  getInput(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }

  destroy(): void {
    this.resetPosition()
    this.active = false
    this.touchId = null
  }
}