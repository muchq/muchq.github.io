import type { Vec3 } from './projection'
import type { DynamicStrip } from './lineStrips'
import { ribbon, RIBBON_FLOATS_PER_VERTEX, type RibbonShape } from './ribbon'

// How far an avatar moves before its wake takes another point. Without
// it a slow frame and a fast one leave different paths, and standing
// still fills the wake with one place over and over.
const SPACING = 0.15

// The shape of a wake in the world: half this wide where it leaves the
// avatar, tapering to nothing at the far end.
const SHAPE: RibbonShape = { width: 0.38, taper: 0.55 }

// The wake behind each avatar: the last `capacity` places it passed
// through, oldest first, handed to the line pass as a ribbon turned to
// face the camera. A still avatar leaves one place and draws nothing.
export class AvatarTrails {
  private readonly points = new Map<string, Vec3[]>()

  constructor(readonly capacity: number) {
    if (capacity < 2) throw new Error(`a wake needs a capacity of at least 2 points, not ${capacity}`)
  }

  record(id: string, point: Vec3): void {
    let trail = this.points.get(id)
    if (!trail) this.points.set(id, (trail = []))
    const last = trail[trail.length - 1]
    if (last && Math.hypot(point[0] - last[0], point[1] - last[1], point[2] - last[2]) < SPACING) {
      return
    }
    trail.push([point[0], point[1], point[2]])
    if (trail.length > this.capacity) trail.shift()
  }

  // Forgets every avatar not in `live`.
  prune(live: Iterable<string>): void {
    const keep = new Set(live)
    for (const id of this.points.keys()) if (!keep.has(id)) this.points.delete(id)
  }

  strips(colorOf: (id: string) => Vec3, eye: Vec3): DynamicStrip[] {
    const out: DynamicStrip[] = []
    for (const [id, trail] of this.points) {
      const data = ribbon(trail, eye, SHAPE)
      if (data.length === 0) continue
      out.push({
        data,
        vertices: data.length / RIBBON_FLOATS_PER_VERTEX,
        points: trail.length,
        color: colorOf(id),
      })
    }
    return out
  }
}
