import { GAME_TABLES } from '../games'
import type { GameTable, LobbyTables, TableContext } from '../games'
import type { HubGameName } from '@/utils/hubStream'

// One game's table, if its hook holds a view. The registry pairs each
// hook with its own table; TypeScript cannot follow that pairing through
// an index, hence the one cast.
export default function GameTableView<G extends HubGameName>({ game, table, context }: { game: G; table: LobbyTables[G]; context: TableContext }) {
  const Table = GAME_TABLES[game].Table as GameTable<LobbyTables[G]>['Table']
  return <Table table={table} context={context} />
}
