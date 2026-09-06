import { Navigate, useParams } from 'react-router-dom'
import { lobbyRoomPath, lobbyTablePath } from '@/hooks/useLobby'

// The game pages' old links (/golf, /golf/room/:r/game/:g, /castle,
// /castle/room/:r) land in the lobby, table up where one was named
// (MoonBase#1502).
const LobbyRedirect = () => {
  const { roomId, gameId } = useParams<{ roomId?: string; gameId?: string }>()
  const to = roomId === undefined ? '/games' : gameId === undefined ? lobbyRoomPath(roomId) : lobbyTablePath(roomId, gameId)
  return <Navigate to={to} replace />
}

export default LobbyRedirect
