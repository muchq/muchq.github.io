import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Navigation from '@/shared/components/Navigation'
import ConnectionStatus from '@/shared/components/nav/ConnectionStatus'
import NavStat from '@/shared/components/nav/NavStat'
import { isValidId } from '@/utils/hubIds'
import LobbyGame from '../components/LobbyGame'

// /games, /games/room/:roomId, /games/room/:roomId/table/:gameId: the
// share links resolve room, then table (MoonBase#1490).
const LobbyPage = () => {
  const { roomId, gameId } = useParams<{ roomId?: string; gameId?: string }>()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  return (
    <div>
      <LobbyGame
        permalinkRoomId={isValidId(roomId) ? roomId : null}
        permalinkGameId={isValidId(gameId) ? gameId : null}
        onPlayerIdChange={setPlayerId}
        onConnectionChange={setConnected}
      />
      <Navigation
        appName="Lobby"
        context={
          <>
            {playerId && <NavStat label="Player" value={playerId} />}
            <ConnectionStatus
              status={connected ? 'connected' : 'disconnected'}
              labels={{ connected: 'Connected', disconnected: 'Disconnected' }}
            />
          </>
        }
      />
    </div>
  )
}

export default LobbyPage
