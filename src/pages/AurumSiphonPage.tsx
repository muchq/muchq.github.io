import { useState } from 'react'
import AurumSiphonGame from '@/components/AurumSiphonGame'

const AurumSiphonPage = () => {
  const [, setPlayerId] = useState<string | null>(null)

  return (
    <div>
      <AurumSiphonGame onPlayerIdReceived={setPlayerId} />
    </div>
  )
}

export default AurumSiphonPage