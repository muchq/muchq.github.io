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

  constructor(container: HTMLElement, knob: HTMLElement) {
    this.container = container
    this.knob = knob
    this.centerX = 60 // Half of joystick width
    this.centerY = 60 // Half of joystick height
    this.maxDistance = 35 // Max distance from center
    this.active = false
    this.x = 0
    this.y = 0

    this.setupEvents()
  }

  private setupEvents(): void {
    // Touch events
    this.container.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.active = true
      this.handleMove(e.touches[0])
    })

    this.container.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (this.active) {
        this.handleMove(e.touches[0])
      }
    })

    this.container.addEventListener('touchend', (e) => {
      e.preventDefault()
      this.active = false
      this.resetPosition()
    })

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
    })

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
}