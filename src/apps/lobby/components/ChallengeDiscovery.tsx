import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UseLobby } from '@/hooks/useLobby'
import { HUB_GAMES } from '@/utils/hubStream'
import { atTable, offerFor, pairingAt, seatsOf, tableFor, tableOffer } from '../offers'
import styles from './ChallengeDiscovery.module.css'

interface Props {
  lobby: UseLobby
  selected: string | null
  onSelect: (id: string | null) => void
}

// Room state is the source of invitations. The wire does not identify a
// creator, so anchor to a connected seated player and call them a player,
// not a host. Sorting keeps that choice consistent across clients.
function openChallenges(lobby: UseLobby) {
  return (lobby.room?.games ?? []).filter(tableOfferOpen).map(table => ({
    table,
    anchor: lobby.room?.players
      .filter(player => player.connected && player.table?.gameId === table.gameId && player.table.game === (table.game ?? 'golf'))
      .sort((a, b) => a.playerId.localeCompare(b.playerId))[0]?.playerId
  }))
}
const tableOfferOpen = (table: Parameters<typeof tableOffer>[0]) => tableOffer(table).open

export default function ChallengeDiscovery({ lobby, selected, onSelect }: Props) {
  const [targets, setTargets] = useState<{ world: HTMLElement | null; map: HTMLElement | null } | null>(null)
  const [pending, setPending] = useState<{ id: string; rejection: number | undefined } | null>(null)
  const pendingRef = useRef(false)
  const [failure, setFailure] = useState<{ id: string; reason: string } | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const attachTargets = useCallback((node: HTMLElement | null) => {
    if (node) setTargets({ world: document.getElementById('world-challenges'), map: document.getElementById('map-challenges') })
  }, [])
  const seated = lobby.room !== null && atTable(lobby.room, lobby.playerId)
  const viewing = HUB_GAMES.some(game => lobby[game].view !== null) || lobby.chess.review !== null
  const challenges = openChallenges(lobby)
  const chosen = challenges.find(({ table }) => table.gameId === selected)
  const rejection = lobby.chat.rejection
  // A room update may precede gameJoined: keep the request locked until
  // its server response, a seat/view, or a disconnect settles it.
  if (pending && (!lobby.connected || seated || viewing || rejection?.seq !== pending.rejection)) {
    if (rejection && rejection.seq !== pending.rejection) setFailure({ id: pending.id, reason: rejection.reason })
    setPending(null)
  }
  useEffect(() => {
    if (pending === null) pendingRef.current = false
  }, [pending])
  useEffect(() => {
    if (selected !== null) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      closeRef.current?.focus()
    }
  }, [selected])
  useEffect(() => {
    if (viewing && selected !== null) onSelect(null)
  }, [viewing, selected, onSelect])
  const close = () => {
    onSelect(null)
    if (opener.current?.isConnected) opener.current.focus()
  }
  if (lobby.room === null || viewing) return null
  const markers = (map: boolean) => challenges.filter(item => item.anchor).map(({ table, anchor }) => (
    <button key={table.gameId} type="button" className={map ? styles.mapMarker : styles.beacon}
      data-challenge-host={anchor} style={{ visibility: 'hidden' }}
      aria-label={`Preview ${table.game ?? 'golf'} challenge ${table.gameId}`}
      title={`${table.game ?? 'golf'} · ${table.playerCount}/${seatsOf(table.game)} players`}
      onClick={() => onSelect(table.gameId)}>
      <span aria-hidden="true">✦</span>{!map && <span>{table.game ?? 'golf'} <small>Open seat · {anchor}</small></span>}
    </button>
  ))
  const offer = chosen && offerFor(lobby, chosen.table)
  const pair = chosen && pairingAt(lobby, chosen.table)
  const unavailable = !lobby.connected ? 'Reconnect to join a challenge.'
    : seated ? 'Leave your current table before joining another.'
    : !chosen ? 'This challenge is no longer available. It may have filled, started, or been canceled.'
    : !chosen.anchor ? 'Waiting for a seated player to reconnect.'
    : !offer?.open ? 'This table is reserved for its tournament pairing.' : null
  return <>
    {lobby.connected && targets?.world && createPortal(markers(false), targets.world)}
    {lobby.connected && targets?.map && createPortal(markers(true), targets.map)}
    <aside ref={attachTargets} onKeyDown={event => event.stopPropagation()} className={styles.discovery} aria-label="Open challenges">
      <button type="button" aria-expanded={expanded} aria-controls="challenge-list" onClick={() => setExpanded(!expanded)}>
        <span aria-hidden="true">✦</span> Open challenges <b>{lobby.connected ? challenges.length : '—'}</b>
      </button>
      {expanded && <div id="challenge-list" className={styles.list}>
        {!lobby.connected ? <p>Reconnect to see open challenges.</p> : challenges.length === 0 ? <p>No open challenges yet. Create a table in the lobby to invite players.</p>
          : challenges.map(({ table }) => <button type="button" key={table.gameId} onClick={() => onSelect(table.gameId)}>
            <strong>{table.game ?? 'golf'}</strong><span>{table.playerCount}/{seatsOf(table.game)} players · {table.gameId}</span>
          </button>)}
      </div>}
    </aside>
    {selected !== null && <section className={styles.preview} aria-label="Challenge preview" onKeyDown={event => {
      event.stopPropagation()
      if (event.key === 'Escape') { event.preventDefault(); close() }
    }}>
      <button ref={closeRef} type="button" className={styles.close} onClick={close} aria-label="Close challenge preview">×</button>
      <p className={styles.eyebrow}>An invitation to play</p>
      <h2>{chosen?.table.game ?? (chosen ? 'golf' : 'Challenge unavailable')}</h2>
      {chosen && <>
        <p>{chosen.table.playerCount}/{seatsOf(chosen.table.game)} players · Table {chosen.table.gameId}</p>
        <p>{chosen.anchor ? `Play with ${chosen.anchor}` : 'No seated players online'}</p>
        {chosen.table.terms && <p className={styles.terms}>{chosen.table.terms}</p>}
        {pair && <p>Pairing: {pair.join(' · ')}</p>}
      </>}
      <p role="status">{pending ? 'Joining… waiting for your seat.' : unavailable ?? (failure?.id === selected ? failure.reason : null) ?? 'Take an open seat and let’s play.'}</p>
      {chosen && <button type="button" className={styles.join} disabled={!!unavailable || pending !== null}
        onClick={() => {
          if (pendingRef.current || unavailable) return
          setFailure(null)
          pendingRef.current = true
          setPending({ id: chosen.table.gameId, rejection: rejection?.seq })
          tableFor(lobby, chosen.table.game).joinTable(chosen.table.gameId)
        }}>{pending ? 'Joining…' : `${offer?.label ?? 'Join'} ${chosen.table.game ?? 'golf'}`}</button>}
    </section>}
  </>
}
