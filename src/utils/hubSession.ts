// The games hub's session mint (smithy-cpp ADR-0018's blessed browser
// auth), shared by every stream on the hub: POST /games/v2/session mints
// a single-use ticket the play upgrade spends, and a resume token that
// exchanges for the same playerId later. The mint lives beside the play
// socket — same origin, http(s) for ws(s).

const MINT_TIMEOUT_MS = 10_000

// Where the resume token lives. The name is golf's from before there was
// a lobby; seats minted under it are still good.
export const HUB_RESUME_TOKEN_KEY = 'golf_v2_resume_token'

// The one stream (MoonBase#1490): the room layer, the lobby's world, golf,
// and castle all ride /games/v2/play, so one override names the hub.
export function hubPlayUrl(): string {
  return import.meta.env.VITE_HUB_WEBSOCKET_URL || 'wss://api.muchq.com/games/v2/play'
}

export interface HubSession {
  playerId: string
  ticket: string
  resumeToken: string
}

export function hubSessionUrl(playUrl: string): string {
  const play = new URL(playUrl)
  const protocol = play.protocol === 'wss:' ? 'https:' : 'http:'
  return `${protocol}//${play.host}/games/v2/session`
}

// Mints a session; a resume token asks for the same identity back. A hung
// server counts as a failed attempt rather than stalling the caller's
// reconnect loop forever.
export async function mintHubSession(playUrl: string, resumeToken?: string | null): Promise<HubSession> {
  const response = await fetch(hubSessionUrl(playUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(resumeToken ? { resumeToken } : {}),
    signal: AbortSignal.timeout(MINT_TIMEOUT_MS)
  })
  if (!response.ok) {
    throw new Error(`session mint failed: ${response.status}`)
  }
  return (await response.json()) as HubSession
}

// The subprotocol that selects the JSON-text frame mode: {"event", "payload"}
// both ways.
export const HUB_SUBPROTOCOL = 'smithy.eventstream.v1+json'
