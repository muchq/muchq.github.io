// Chairs around the table, seen from above (muchq.github.io#304): the
// viewer at 6 o'clock, the others clockwise in turn order. One other
// sits at 12; two at 10 and 2; three at 9, 12 and 3. Both games seat
// four; a fifth chair has nowhere to go and lands on 6.

const CLOCKS: Record<number, number[]> = {
  1: [6],
  2: [6, 12],
  3: [6, 10, 2],
  4: [6, 9, 12, 3]
}

export function clockOf(count: number, index: number): number {
  return CLOCKS[count]?.[index] ?? 6
}

// The table in turn order from the viewer's chair. A viewer not at the
// table sees it from seat 0.
export function fromViewer<T extends { playerId: string }>(players: T[], viewer: string): T[] {
  const at = Math.max(0, players.findIndex(player => player.playerId === viewer))
  return [...players.slice(at), ...players.slice(0, at)]
}
