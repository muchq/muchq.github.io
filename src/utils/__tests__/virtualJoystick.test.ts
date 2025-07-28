import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VirtualJoystick } from '../virtualJoystick'

describe('VirtualJoystick', () => {
  let container: HTMLElement
  let knob: HTMLElement
  let joystick: VirtualJoystick

  beforeEach(() => {
    // Create mock DOM elements
    container = document.createElement('div')
    knob = document.createElement('div')
    
    // Mock getBoundingClientRect
    container.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 120,
      bottom: 120,
      width: 120,
      height: 120,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }))

    document.body.appendChild(container)
    container.appendChild(knob)

    joystick = new VirtualJoystick(container, knob)
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(joystick.x).toBe(0)
      expect(joystick.y).toBe(0)
      expect(joystick.active).toBe(false)
      expect(joystick.touchId).toBe(null)
    })

    it('should set touchAction style to none', () => {
      expect(container.style.touchAction).toBe('none')
    })
  })

  describe('touch events', () => {
    it('should handle touchstart and set touch ID', () => {
      const touchEvent = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 123, clientX: 60, clientY: 60 } as Touch],
        cancelable: true,
      })

      container.dispatchEvent(touchEvent)

      expect(joystick.active).toBe(true)
      expect(joystick.touchId).toBe(123)
    })

    it('should handle touchmove only for its own touch ID', () => {
      // Start first touch
      const touchStartEvent = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 123, clientX: 60, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touchStartEvent)

      // Move with correct touch ID
      const touchMoveEvent1 = new TouchEvent('touchmove', {
        touches: [
          { identifier: 123, clientX: 80, clientY: 60 } as Touch,
          { identifier: 456, clientX: 40, clientY: 60 } as Touch // Another touch
        ],
        cancelable: true,
      })
      document.dispatchEvent(touchMoveEvent1)

      // Should update position for touch 123
      expect(joystick.x).toBeGreaterThan(0)
      expect(joystick.y).toBe(0)

      // Move with different touch ID only
      const touchMoveEvent2 = new TouchEvent('touchmove', {
        changedTouches: [{ identifier: 456, clientX: 40, clientY: 60 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(touchMoveEvent2)

      // Position should not change
      expect(joystick.x).toBeGreaterThan(0)
      expect(joystick.y).toBe(0)
    })

    it('should handle touchend only for its own touch ID', () => {
      // Start touch
      const touchStartEvent = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 123, clientX: 80, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touchStartEvent)

      expect(joystick.active).toBe(true)
      expect(joystick.x).toBeGreaterThan(0)

      // End different touch
      const touchEndEvent1 = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 456, clientX: 0, clientY: 0 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(touchEndEvent1)

      // Should still be active
      expect(joystick.active).toBe(true)
      expect(joystick.touchId).toBe(123)

      // End correct touch
      const touchEndEvent2 = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 123, clientX: 0, clientY: 0 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(touchEndEvent2)

      // Should reset
      expect(joystick.active).toBe(false)
      expect(joystick.touchId).toBe(null)
      expect(joystick.x).toBe(0)
      expect(joystick.y).toBe(0)
    })

    it('should handle touchcancel', () => {
      // Start touch
      const touchStartEvent = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 123, clientX: 80, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touchStartEvent)

      expect(joystick.active).toBe(true)

      // Cancel touch
      const touchCancelEvent = new TouchEvent('touchcancel', {
        changedTouches: [{ identifier: 123, clientX: 0, clientY: 0 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(touchCancelEvent)

      // Should reset
      expect(joystick.active).toBe(false)
      expect(joystick.touchId).toBe(null)
      expect(joystick.x).toBe(0)
      expect(joystick.y).toBe(0)
    })
  })

  describe('mouse events', () => {
    it('should handle mousedown', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 80,
        clientY: 60,
        cancelable: true,
      })

      container.dispatchEvent(mouseDownEvent)

      expect(joystick.active).toBe(true)
      expect(joystick.x).toBeGreaterThan(0)
      expect(joystick.y).toBe(0)
    })

    it('should handle mousemove when active', () => {
      // Start with mousedown
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 60,
        clientY: 60,
        cancelable: true,
      })
      container.dispatchEvent(mouseDownEvent)

      // Move mouse
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 80,
        clientY: 80,
        cancelable: true,
      })
      document.dispatchEvent(mouseMoveEvent)

      expect(joystick.x).toBeGreaterThan(0)
      expect(joystick.y).toBeGreaterThan(0)
    })

    it('should handle mouseup', () => {
      // Start with mousedown
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 80,
        clientY: 60,
        cancelable: true,
      })
      container.dispatchEvent(mouseDownEvent)

      expect(joystick.active).toBe(true)

      // Release mouse
      const mouseUpEvent = new MouseEvent('mouseup')
      document.dispatchEvent(mouseUpEvent)

      expect(joystick.active).toBe(false)
      expect(joystick.x).toBe(0)
      expect(joystick.y).toBe(0)
    })
  })

  describe('position calculations', () => {
    it('should constrain position to max distance', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 200, // Far beyond max distance
        clientY: 60,
        cancelable: true,
      })

      container.dispatchEvent(mouseDownEvent)

      expect(joystick.x).toBeLessThanOrEqual(1)
      expect(joystick.x).toBeGreaterThan(0.9) // Close to max
    })

    it('should calculate correct normalized values', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 60 + 17.5, // Half of max distance (35)
        clientY: 60,
        cancelable: true,
      })

      container.dispatchEvent(mouseDownEvent)

      expect(joystick.x).toBeCloseTo(0.5, 1)
      expect(joystick.y).toBeCloseTo(0, 1)
    })

    it('should handle diagonal movement', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 80,
        clientY: 80,
        cancelable: true,
      })

      container.dispatchEvent(mouseDownEvent)

      expect(joystick.x).toBeGreaterThan(0)
      expect(joystick.y).toBeGreaterThan(0)
    })
  })

  describe('knob visual updates', () => {
    it('should update knob transform on move', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 80,
        clientY: 60,
        cancelable: true,
      })

      container.dispatchEvent(mouseDownEvent)

      expect(knob.style.transform).toContain('translate')
      expect(knob.style.transform).toContain('calc(-50%')
    })

    it('should reset knob transform on release', () => {
      // Move knob
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 80,
        clientY: 60,
        cancelable: true,
      })
      container.dispatchEvent(mouseDownEvent)

      // Release
      const mouseUpEvent = new MouseEvent('mouseup')
      document.dispatchEvent(mouseUpEvent)

      expect(knob.style.transform).toBe('translate(-50%, -50%)')
    })
  })

  describe('multi-touch edge cases', () => {
    it('should handle simultaneous touches on same joystick', () => {
      // First touch
      const touch1 = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 1, clientX: 60, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touch1)
      
      expect(joystick.touchId).toBe(1)
      expect(joystick.active).toBe(true)

      // Second touch on same joystick (should be ignored)
      const touch2 = new TouchEvent('touchstart', {
        touches: [
          { identifier: 1, clientX: 60, clientY: 60 } as Touch,
          { identifier: 2, clientX: 80, clientY: 80 } as Touch
        ],
        cancelable: true,
      })
      container.dispatchEvent(touch2)

      // Should still track only the first touch
      expect(joystick.touchId).toBe(1)
    })

    it('should ignore new touches when already active', () => {
      // First touch
      const touch1 = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 1, clientX: 60, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touch1)
      
      expect(joystick.touchId).toBe(1)
      expect(joystick.active).toBe(true)
      expect(joystick.x).toBe(0)

      // Move the first touch right
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ identifier: 1, clientX: 80, clientY: 60 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(touchMove)
      
      const xValueAfterMove = joystick.x
      expect(xValueAfterMove).toBeGreaterThan(0)

      // Try to start a new touch while first is still active
      const touch2 = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 2, clientX: 40, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touch2)

      // Should still track the first touch, not switch to the new one
      expect(joystick.touchId).toBe(1)
      expect(joystick.x).toBe(xValueAfterMove) // Position unchanged
    })

    it('should handle rapid touch switching', () => {
      // Start first touch
      const touch1Start = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 1, clientX: 60, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touch1Start)

      // Immediately end first touch
      const touch1End = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 1, clientX: 60, clientY: 60 } as Touch],
        touches: [],
        cancelable: true,
      })
      document.dispatchEvent(touch1End)

      // Immediately start new touch
      const touch2Start = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 2, clientX: 80, clientY: 80 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touch2Start)

      expect(joystick.touchId).toBe(2)
      expect(joystick.active).toBe(true)
    })

    it('should handle touchend with remaining touches', () => {
      // Start touch on joystick
      const touchStart = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 1, clientX: 60, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touchStart)

      // Add another touch elsewhere (simulating touch on other joystick)
      const touchMove = new TouchEvent('touchmove', {
        touches: [
          { identifier: 1, clientX: 60, clientY: 60 } as Touch,
          { identifier: 2, clientX: 200, clientY: 200 } as Touch
        ],
        cancelable: true,
      })
      document.dispatchEvent(touchMove)

      // End the joystick touch while other touch remains
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 1, clientX: 60, clientY: 60 } as Touch],
        touches: [{ identifier: 2, clientX: 200, clientY: 200 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(touchEnd)

      expect(joystick.active).toBe(false)
      expect(joystick.touchId).toBe(null)
      expect(joystick.x).toBe(0)
      expect(joystick.y).toBe(0)
    })

    it('should ignore touch events after touchcancel', () => {
      // Start touch
      const touchStart = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 1, clientX: 80, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touchStart)

      // Cancel touch
      const touchCancel = new TouchEvent('touchcancel', {
        changedTouches: [{ identifier: 1, clientX: 80, clientY: 60 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(touchCancel)

      // Try to move the cancelled touch (should be ignored)
      const touchMove = new TouchEvent('touchmove', {
        changedTouches: [{ identifier: 1, clientX: 100, clientY: 100 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(touchMove)

      expect(joystick.x).toBe(0)
      expect(joystick.y).toBe(0)
    })
  })

  describe('multi-joystick scenario', () => {
    it('should not interfere with another joystick instance', () => {
      // Create second joystick
      const container2 = document.createElement('div')
      const knob2 = document.createElement('div')
      container2.getBoundingClientRect = vi.fn(() => ({
        left: 200,
        top: 0,
        right: 320,
        bottom: 120,
        width: 120,
        height: 120,
        x: 200,
        y: 0,
        toJSON: () => ({})
      }))
      document.body.appendChild(container2)
      container2.appendChild(knob2)

      const joystick2 = new VirtualJoystick(container2, knob2)

      // Start touch on first joystick
      const touch1Start = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 1, clientX: 60, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touch1Start)

      // Start touch on second joystick
      const touch2Start = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 2, clientX: 260, clientY: 60 } as Touch],
        cancelable: true,
      })
      container2.dispatchEvent(touch2Start)

      expect(joystick.touchId).toBe(1)
      expect(joystick2.touchId).toBe(2)

      // Move first touch
      const touchMove = new TouchEvent('touchmove', {
        touches: [
          { identifier: 1, clientX: 80, clientY: 60 } as Touch,
          { identifier: 2, clientX: 280, clientY: 60 } as Touch
        ],
        cancelable: true,
      })
      document.dispatchEvent(touchMove)

      // Both joysticks should update independently
      expect(joystick.x).toBeGreaterThan(0)
      expect(joystick2.x).toBeGreaterThan(0)

      // End first touch
      const touch1End = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 1, clientX: 0, clientY: 0 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(touch1End)

      // First joystick should reset, second should remain active
      expect(joystick.active).toBe(false)
      expect(joystick.x).toBe(0)
      expect(joystick2.active).toBe(true)
      expect(joystick2.x).toBeGreaterThan(0)
    })

    it('should handle reverse touch order release', () => {
      // Create second joystick
      const container2 = document.createElement('div')
      const knob2 = document.createElement('div')
      container2.getBoundingClientRect = vi.fn(() => ({
        left: 200,
        top: 0,
        right: 320,
        bottom: 120,
        width: 120,
        height: 120,
        x: 200,
        y: 0,
        toJSON: () => ({})
      }))
      document.body.appendChild(container2)
      container2.appendChild(knob2)

      const joystick2 = new VirtualJoystick(container2, knob2)

      // Touch joystick1 first
      const touch1 = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 1, clientX: 60, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touch1)

      // Touch joystick2 second
      const touch2 = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 2, clientX: 260, clientY: 60 } as Touch],
        cancelable: true,
      })
      container2.dispatchEvent(touch2)

      // Release joystick2 first (reverse order)
      const release2 = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 2, clientX: 260, clientY: 60 } as Touch],
        touches: [{ identifier: 1, clientX: 60, clientY: 60 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(release2)

      // Joystick1 should still be active
      expect(joystick.active).toBe(true)
      expect(joystick.touchId).toBe(1)
      expect(joystick2.active).toBe(false)
      expect(joystick2.touchId).toBe(null)

      // Move joystick1 after joystick2 is released
      const moveJoystick1 = new TouchEvent('touchmove', {
        touches: [{ identifier: 1, clientX: 80, clientY: 80 } as Touch],
        cancelable: true,
      })
      document.dispatchEvent(moveJoystick1)

      expect(joystick.x).toBeGreaterThan(0)
      expect(joystick.y).toBeGreaterThan(0)
    })

    it('should handle alternating joystick touches', () => {
      // Create second joystick
      const container2 = document.createElement('div')
      const knob2 = document.createElement('div')
      container2.getBoundingClientRect = vi.fn(() => ({
        left: 200,
        top: 0,
        right: 320,
        bottom: 120,
        width: 120,
        height: 120,
        x: 200,
        y: 0,
        toJSON: () => ({})
      }))
      document.body.appendChild(container2)
      container2.appendChild(knob2)

      const joystick2 = new VirtualJoystick(container2, knob2)

      // Touch and release joystick1
      const touch1Start = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 1, clientX: 80, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touch1Start)
      expect(joystick.x).toBeGreaterThan(0)

      const touch1End = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 1, clientX: 80, clientY: 60 } as Touch],
        touches: [],
        cancelable: true,
      })
      document.dispatchEvent(touch1End)
      expect(joystick.x).toBe(0)

      // Touch and release joystick2
      const touch2Start = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 2, clientX: 280, clientY: 60 } as Touch],
        cancelable: true,
      })
      container2.dispatchEvent(touch2Start)
      expect(joystick2.x).toBeGreaterThan(0)

      const touch2End = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 2, clientX: 280, clientY: 60 } as Touch],
        touches: [],
        cancelable: true,
      })
      document.dispatchEvent(touch2End)
      expect(joystick2.x).toBe(0)

      // Touch joystick1 again with new ID
      const touch3Start = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 3, clientX: 40, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touch3Start)
      expect(joystick.x).toBeLessThan(0) // Left position
      expect(joystick.touchId).toBe(3)
    })

    it('should handle three simultaneous touches (2 joysticks + 1 elsewhere)', () => {
      // Create second joystick
      const container2 = document.createElement('div')
      const knob2 = document.createElement('div')
      container2.getBoundingClientRect = vi.fn(() => ({
        left: 200,
        top: 0,
        right: 320,
        bottom: 120,
        width: 120,
        height: 120,
        x: 200,
        y: 0,
        toJSON: () => ({})
      }))
      document.body.appendChild(container2)
      container2.appendChild(knob2)

      const joystick2 = new VirtualJoystick(container2, knob2)

      // Touch both joysticks
      const touch1 = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 1, clientX: 60, clientY: 60 } as Touch],
        cancelable: true,
      })
      container.dispatchEvent(touch1)

      const touch2 = new TouchEvent('touchstart', {
        changedTouches: [{ identifier: 2, clientX: 260, clientY: 60 } as Touch],
        cancelable: true,
      })
      container2.dispatchEvent(touch2)

      // Add third touch elsewhere (simulating UI button press)
      const touchMove = new TouchEvent('touchmove', {
        touches: [
          { identifier: 1, clientX: 80, clientY: 60 } as Touch,
          { identifier: 2, clientX: 280, clientY: 60 } as Touch,
          { identifier: 3, clientX: 400, clientY: 400 } as Touch // UI button
        ],
        cancelable: true,
      })
      document.dispatchEvent(touchMove)

      // Both joysticks should still track their respective touches
      expect(joystick.x).toBeGreaterThan(0)
      expect(joystick2.x).toBeGreaterThan(0)

      // End the UI touch
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ identifier: 3, clientX: 400, clientY: 400 } as Touch],
        touches: [
          { identifier: 1, clientX: 80, clientY: 60 } as Touch,
          { identifier: 2, clientX: 280, clientY: 60 } as Touch
        ],
        cancelable: true,
      })
      document.dispatchEvent(touchEnd)

      // Joysticks should remain unaffected
      expect(joystick.active).toBe(true)
      expect(joystick2.active).toBe(true)
    })
  })
})