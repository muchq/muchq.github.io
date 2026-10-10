import type { HubGameName } from '@/utils/hubStream'
import { catalogEntry, seatsLine } from '../catalog'

// What a game is and who it seats, as the catalog says it: shown at the
// table while it waits, where the game is about to be played.
const AboutGame = ({ game, className }: { game: HubGameName; className?: string }) => {
  const entry = catalogEntry(game)
  return (
    <p className={className}>
      {entry.blurb} {seatsLine(entry)}.
    </p>
  )
}

export default AboutGame
