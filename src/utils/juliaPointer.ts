export interface JuliaC {
  x: number
  y: number
}

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, summary, label, [role="link"], [role="button"]'

export function isJuliaInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR))
}

/** Map a viewport pointer into the Julia c-plane the background shader expects. */
export function juliaCFromClient(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
): JuliaC {
  const width = Math.max(viewportWidth, 1)
  const height = Math.max(viewportHeight, 1)
  const normalizedX = clientX / width
  const normalizedY = -((clientY / height) * 2.0 - 1.0)

  const scaledX = normalizedX * 0.75
  const scaledY = normalizedY * 0.75

  const angle = Math.atan2(scaledY, scaledX)
  const radius = Math.sqrt(scaledX * scaledX + scaledY * scaledY)
  const biasedRadius = Math.min(radius * 0.8 + 0.2, 0.7)

  return {
    x: Math.cos(angle) * biasedRadius,
    y: Math.sin(angle) * biasedRadius,
  }
}

/**
 * Keep the Julia background in sync with the active pointer.
 * Desktop hover uses pointermove; phones update while a finger drags.
 * Background finger-drags call preventDefault so iOS does not pull-to-refresh,
 * while gestures that start on links/buttons are left alone.
 */
export function bindJuliaPointer(
  onMove: (point: JuliaC) => void,
  target: EventTarget = document,
): () => void {
  let lockOverscroll = false

  const publish = (clientX: number, clientY: number) => {
    onMove(juliaCFromClient(clientX, clientY, window.innerWidth, window.innerHeight))
  }

  const handlePointerDown = (event: Event) => {
    const pointer = event as PointerEvent
    lockOverscroll = pointer.pointerType !== 'mouse' && !isJuliaInteractiveTarget(pointer.target)
    publish(pointer.clientX, pointer.clientY)
  }

  const handlePointerMove = (event: Event) => {
    const pointer = event as PointerEvent
    if (lockOverscroll) pointer.preventDefault()
    publish(pointer.clientX, pointer.clientY)
  }

  // iOS Safari still drives pull-to-refresh from touchmove even when pointer events fire.
  const handleTouchMove = (event: Event) => {
    if (!lockOverscroll) return
    event.preventDefault()
  }

  const endGesture = () => {
    lockOverscroll = false
  }

  target.addEventListener('pointerdown', handlePointerDown, { passive: true })
  target.addEventListener('pointermove', handlePointerMove, { passive: false })
  target.addEventListener('touchmove', handleTouchMove, { passive: false })
  target.addEventListener('pointerup', endGesture, { passive: true })
  target.addEventListener('pointercancel', endGesture, { passive: true })
  target.addEventListener('touchend', endGesture, { passive: true })
  target.addEventListener('touchcancel', endGesture, { passive: true })

  return () => {
    target.removeEventListener('pointerdown', handlePointerDown)
    target.removeEventListener('pointermove', handlePointerMove)
    target.removeEventListener('touchmove', handleTouchMove)
    target.removeEventListener('pointerup', endGesture)
    target.removeEventListener('pointercancel', endGesture)
    target.removeEventListener('touchend', endGesture)
    target.removeEventListener('touchcancel', endGesture)
  }
}
