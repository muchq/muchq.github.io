import { useState } from 'react'
import ThoughtsNavigation from '@/components/ThoughtsNavigation'
import ThoughtsGame from '@/components/ThoughtsGame'

const ThoughtsPage = () => {
  const [playerId, setPlayerId] = useState<string | null>(null)

  return (
    <div>
      <ThoughtsGame onPlayerIdReceived={setPlayerId} />
      <ThoughtsNavigation playerId={playerId} />
    </div>
  )
}

export default ThoughtsPage