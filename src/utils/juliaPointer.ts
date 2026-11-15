export interface JuliaC {
  x: number
  y: number
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
 * pointermove covers desktop hover and finger drags; pointerdown covers a tap
 * that never moves.
 */
export function bindJuliaPointer(
  onMove: (point: JuliaC) => void,
  target: EventTarget = document,
): () => void {
  const handlePointer = (event: Event) => {
    const pointer = event as PointerEvent
    onMove(juliaCFromClient(pointer.clientX, pointer.clientY, window.innerWidth, window.innerHeight))
  }

  target.addEventListener('pointermove', handlePointer)
  target.addEventListener('pointerdown', handlePointer)

  return () => {
    target.removeEventListener('pointermove', handlePointer)
    target.removeEventListener('pointerdown', handlePointer)
  }
}
