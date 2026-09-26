import type { UseLobby } from '@/hooks/useLobby'
import { lobbyRoomPath } from '@/hooks/useLobby'
import type { Command } from '@/utils/commandRegistry'
import { atTable, tableOffer, TABLE_SEATS } from './offers'

// What the page around the lobby does for these entries: the panel and
// the chat are LobbyGame's, not the hook's.
export interface LobbyUi {
  panelOpen: boolean
  togglePanel: () => void
  // Shows the panel with its room code field focused; joining needs a
  // code, and the field is where one is typed.
  askRoomCode: () => void
  openChat: () => void
  // Opens chat with `@bot ` already in the composer (MoonBase#1591).
  askBot: () => void
  // A word in the lobby's status line, for a command with nothing else
  // to show for itself.
  say: (text: string) => void
}

// The lobby's verbs for the command menu, the 'lobby' source. The panel
// greys out what it cannot do; here it is left out, by the same rules.
export function lobbyCommands(lobby: UseLobby, ui: LobbyUi): Command[] {
  const { room, connected, playerId } = lobby
  const commands: Command[] = []
  if (room === null) {
    if (connected) {
      commands.push({ id: 'create-room', label: 'Create a room', run: lobby.createRoom })
      commands.push({ id: 'join-room', label: 'Join a room by code', run: ui.askRoomCode })
    }
  } else {
    const url = `${window.location.origin}${lobbyRoomPath(room.roomId)}`
    commands.push({ id: 'open-chat', label: 'Open chat', run: ui.openChat })
    commands.push({ id: 'ask-bot', label: 'Ask the bot', run: ui.askBot })
    commands.push({
      id: 'copy-room-link',
      label: 'Copy room link',
      run: () => {
        const refused = () => ui.say('Could not copy the room link')
        if (!navigator.clipboard) return refused()
        navigator.clipboard.writeText(url).then(() => ui.say('Room link copied'), refused)
      },
    })
    if (connected) {
      commands.push({ id: 'leave-room', label: 'Leave the room', run: lobby.leaveRoom })
      const voice = lobby.voice.view()
      if (voice.status === 'off') {
        commands.push({ id: 'join-voice', label: 'Join voice', run: () => void lobby.voice.join() })
      } else {
        commands.push({ id: 'leave-voice', label: 'Leave voice', run: () => lobby.voice.leave() })
        if (voice.status === 'on' && !voice.listenOnly) {
          const muted = voice.muted
          commands.push({ id: 'mute', label: muted ? 'Unmute' : 'Mute', run: () => lobby.voice.setMuted(!muted) })
        }
      }
      if (!atTable(room, playerId)) {
        commands.push({ id: 'open-castle', label: 'Open a castle table', run: lobby.castle.createTable })
        commands.push({ id: 'open-golf', label: 'Open a golf table', run: lobby.golf.createTable })
        for (const table of room.games) {
          if (!tableOffer(table).open) continue
          const game = table.game ?? 'golf'
          const join = game === 'castle' ? lobby.castle.joinTable : lobby.golf.joinTable
          commands.push({
            id: `join-${game}-${table.gameId}`,
            label: `Join ${game} table ${table.gameId}`,
            detail: `${table.playerCount}/${TABLE_SEATS} seated`,
            run: () => join(table.gameId),
          })
        }
      }
    }
  }
  commands.push({ id: 'panel', label: ui.panelOpen ? 'Hide lobby panel' : 'Show lobby panel', run: ui.togglePanel })
  return commands
}
