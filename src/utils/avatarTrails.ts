import type { Vec3 } from './projection'
import type { DynamicStrip } from './lineStrips'

// The wake behind each avatar: its last `capacity` positions, oldest
// first, handed to the line pass as a strip it glows from the newest
// point. A still avatar's points coincide and draw nothing.
export class AvatarTrails {
  private readonly points = new Map<string, Vec3[]>()

  constructor(readonly capacity: number) {
    if (capacity < 2) throw new Error(`a wake needs a capacity of at least 2 points, not ${capacity}`)
  }

  record(id: string, point: Vec3): void {
    let trail = this.points.get(id)
    if (!trail) this.points.set(id, (trail = []))
    trail.push([point[0], point[1], point[2]])
    if (trail.length > this.capacity) trail.shift()
  }

  // Forgets every avatar not in `live`.
  prune(live: Iterable<string>): void {
    const keep = new Set(live)
    for (const id of this.points.keys()) if (!keep.has(id)) this.points.delete(id)
  }

  strips(colorOf: (id: string) => Vec3): DynamicStrip[] {
    const out: DynamicStrip[] = []
    for (const [id, trail] of this.points) {
      const data = new Float32Array(trail.length * 4)
      trail.forEach((p, i) => data.set([p[0], p[1], p[2], i], i * 4))
      out.push({ data, count: trail.length, color: colorOf(id) })
    }
    return out
  }
}
