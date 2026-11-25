import type { HubRoom } from './hubStream'
import { safeLocalStorage } from './safeLocalStorage'

// The name this device asks the hub to show beside its player id
// (MoonBase#1519). The id stays the identity; the name is a label the hub
// keeps per session, so the page sends it on every new one.

export const DISPLAY_NAME_KEY = 'hub.displayName'

export const storedDisplayName = (): string => safeLocalStorage.get(DISPLAY_NAME_KEY) ?? ''

export function storeDisplayName(name: string): void {
  if (name === '') safeLocalStorage.remove(DISPLAY_NAME_KEY)
  else safeLocalStorage.set(DISPLAY_NAME_KEY, name)
}

// A player as people read them: the name the room lists, else the id
// (bots, departed members, anyone who never chose one).
export const nameIn = (room: HubRoom | null, playerId: string): string =>
  room?.players.find(player => player.playerId === playerId)?.name ?? playerId
