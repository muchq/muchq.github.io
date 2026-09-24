// The commands the command menu offers. Each is a verb: it runs, and the
// menu closes.
export interface Command {
  id: string
  label: string
  // What running it does beyond this client, said beside the label.
  detail?: string
  run: () => void
}

// Where commands are published, from both sides of the page: the world
// loop, which is imperative and owns the avatar, the room and the sound,
// and the lobby's React tree, which owns the room, its tables, chat and
// the panel. Each side publishes its source whole, again whenever what
// it offers changes. A command that is not available is left out rather
// than shown dead, so there is no disabled state to keep in step.
export class CommandRegistry {
  private readonly sources = new Map<string, readonly Command[]>()
  private readonly listeners = new Set<() => void>()
  private snapshot: readonly Command[] = []

  publish(source: string, commands: readonly Command[]): void {
    this.sources.set(source, commands)
    this.changed()
  }

  withdraw(source: string): void {
    if (this.sources.delete(source)) this.changed()
  }

  // The same array until something changes, which is what
  // useSyncExternalStore asks of a snapshot.
  list = (): readonly Command[] => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private changed(): void {
    this.snapshot = [...this.sources.values()].flat()
    this.listeners.forEach(listener => listener())
  }
}

// Every word of the query, in any order and any case, somewhere in the
// label or the detail.
export function matchCommands(commands: readonly Command[], query: string): readonly Command[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return commands
  return commands.filter(command => {
    const text = `${command.label} ${command.detail ?? ''}`.toLowerCase()
    return words.every(word => text.includes(word))
  })
}
