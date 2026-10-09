import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import felt from '@/apps/castle/components/CastleTable.module.css'
import { fetchPublishedChessGame, hubPlayUrl } from '@/utils/hubSession'
import GameReview from '../components/GameReview'
import type { ChessReview } from '../wire'
import styles from './ChessGamePage.module.css'

// A published game's own page (MoonBase#1637): the URL its PGN's [Site]
// names, so a game indexed elsewhere links back here. The hub serves it
// while the public feed keeps it, 30 days.

type Answer = { kind: 'found'; review: ChessReview } | { kind: 'missing' } | { kind: 'failed' }
type Loaded = { kind: 'loading' } | Answer

const ChessGamePage = () => {
  const { archiveId = '' } = useParams()
  const navigate = useNavigate()
  const valid = /^[1-9]\d*$/.test(archiveId)
  // Kept with the id it answers, so a new id reads as loading until its own answer lands.
  const [answer, setAnswer] = useState<{
    archiveId: string
    answer: Answer
  } | null>(null)

  useEffect(() => {
    if (!valid) return
    let live = true
    const settle = (next: Answer) => live && setAnswer({ archiveId, answer: next })
    fetchPublishedChessGame<ChessReview>(hubPlayUrl(), Number(archiveId)).then(
      review => settle(review === null ? { kind: 'missing' } : { kind: 'found', review }),
      () => settle({ kind: 'failed' })
    )
    return () => {
      live = false
    }
  }, [archiveId, valid])

  const loaded: Loaded = !valid
    ? { kind: 'missing' }
    : answer?.archiveId === archiveId
      ? answer.answer
      : { kind: 'loading' }

  return (
    <main className={styles.page}>
      {loaded.kind === 'found' ? (
        <GameReview review={loaded.review} playerId="" onClose={() => navigate('/games')} />
      ) : (
        <div className={styles.notice}>
          {loaded.kind === 'loading' && <p className={felt.hint}>Loading game…</p>}
          {loaded.kind === 'missing' && (
            <p className={felt.hint}>This game isn’t public, or has left the public feed after 30 days.</p>
          )}
          {loaded.kind === 'failed' && <p className={felt.hint}>Couldn’t load this game. Try again in a moment.</p>}
          <Link className={felt.link} to="/games">
            Back to the games
          </Link>
        </div>
      )}
    </main>
  )
}

export default ChessGamePage
