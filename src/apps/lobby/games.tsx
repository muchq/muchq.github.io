import type { ReactNode } from 'react'
import CastleTable from '@/apps/castle/components/CastleTable'
import ChessTable from '@/apps/chess/components/ChessTable'
import GoTable from '@/apps/go/components/GoTable'
import GolfTable from '@/apps/golf/components/GolfTable'
import PongTable from '@/apps/pong/components/PongTable'
import RummyTable from '@/apps/rummy/components/RummyTable'
import SpadesTable from '@/apps/spades/components/SpadesTable'
import { useCastleTable } from '@/hooks/useCastleTable'
import { useChessTable } from '@/hooks/useChessTable'
import { useGoTable } from '@/hooks/useGoTable'
import { useGolfTable } from '@/hooks/useGolfTable'
import { usePongTable } from '@/hooks/usePongTable'
import { useRummyTable } from '@/hooks/useRummyTable'
import { useSpadesTable } from '@/hooks/useSpadesTable'
import type { HubGameName } from '@/utils/hubStream'

// Each game's table in the lobby: the hook that speaks its envelope and
// the table that draws it. The lobby reads this instead of naming games,
// so a new game is an entry here, one in catalog.ts, its hook and its
// table.

// What the lobby hands every table hook.
export interface TableHookProps {
  playerId: string
  move: (name: string, payload?: unknown) => void
  showNotice: (message: string) => void
  onLeft?: () => void
}

// What the lobby asks of every table hook.
export interface TableHook {
  view: unknown
  createTable: () => void
  joinTable: (gameId: string) => void
  clear: () => void
  handleUpdate: (update: never) => void
  // A refusal settles a table waiting on an answer; golf waits on none.
  handleRejected?: () => void
  // A game that hides nothing lets anyone watch its tables.
  watchTable?: (gameId: string) => void
}

// The room around a table, for the tables that show it.
export interface TableContext {
  playerId: string
  connected: boolean
  // Seats the room shows away.
  away: string[]
  // A table's share link, while in a room.
  tableUrl: (gameId: string) => string | null
}

export interface GameTable<T extends TableHook> {
  useTable: (props: TableHookProps) => T
  // Drawn only while the hook holds a view. A method, so each entry's
  // own hook type fits the registry's.
  Table(props: { table: T; context: TableContext }): ReactNode
}

// A gameJoined names its table, and the lobby puts that id in the URL.
export interface JoinedUpdate {
  gameJoined?: { view: { gameId: string } }
}

type UpdateOf<T> = T extends { handleUpdate: (update: infer U) => void } ? U : never

// Refuses, at compile time, a game whose updates do not name the table
// they join.
const entry = <T extends TableHook>(
  game: GameTable<T> & (UpdateOf<T> extends JoinedUpdate ? unknown : { gameJoinedMustNameItsTable: never })
) => game

export const GAME_TABLES = {
  golf: entry({
    useTable: useGolfTable,
    Table: ({ table, context }) =>
      table.view && (
        <GolfTable
          playerId={context.playerId}
          connected={context.connected}
          view={table.view}
          table={table}
          shareUrl={context.tableUrl(table.view.id)}
        />
      )
  }),
  castle: entry({
    useTable: useCastleTable,
    Table: ({ table, context }) =>
      table.view && <CastleTable playerId={context.playerId} connected={context.connected} view={table.view} table={table} />
  }),
  rummy: entry({
    useTable: useRummyTable,
    Table: ({ table, context }) =>
      table.view && (
        <RummyTable playerId={context.playerId} connected={context.connected} view={table.view} table={table} away={context.away} />
      )
  }),
  chess: entry({
    useTable: useChessTable,
    Table: ({ table, context }) =>
      table.view && <ChessTable playerId={context.playerId} connected={context.connected} view={table.view} table={table} />
  }),
  go: entry({
    useTable: useGoTable,
    Table: ({ table, context }) =>
      table.view && <GoTable playerId={context.playerId} connected={context.connected} view={table.view} table={table} />
  }),
  pong: entry({
    useTable: usePongTable,
    Table: ({ table, context }) =>
      table.view && <PongTable playerId={context.playerId} connected={context.connected} view={table.view} table={table} />
  }),
  spades: entry({
    useTable: useSpadesTable,
    Table: ({ table, context }) =>
      table.view && <SpadesTable playerId={context.playerId} connected={context.connected} view={table.view} table={table} />
  })
} satisfies { [G in HubGameName]: GameTable<TableHook> }

export type LobbyTables = { [G in HubGameName]: ReturnType<(typeof GAME_TABLES)[G]['useTable']> }
