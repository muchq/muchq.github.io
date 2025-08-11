import { useState } from 'react'
import AurumSiphonNavigation from '@/components/AurumSiphonNavigation'
import AurumSiphonGame from '@/components/AurumSiphonGame'

const AurumSiphonPage = () => {
  const [playerId, setPlayerId] = useState<string | null>(null)

  return (
    <div>
      <AurumSiphonGame onPlayerIdReceived={setPlayerId} />
      <AurumSiphonNavigation playerId={playerId} />
    </div>
  )
}

export default AurumSiphonPage