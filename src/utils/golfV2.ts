// The golf v2 beta switch and endpoints (MoonBase#1187 phase 3).
//
// v2 is the smithy event-stream hub. Opt in per browser with ?golf=v2
// (sticky via localStorage), opt back out with ?golf=v1. A build can
// default everyone in with VITE_GOLF_V2_DEFAULT=true.

const V2_FLAG_KEY = 'golf_v2_beta'

export function isGolfV2Enabled(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get('golf')
    if (param === 'v2') {
      localStorage.setItem(V2_FLAG_KEY, '1')
      return true
    }
    if (param === 'v1') {
      localStorage.setItem(V2_FLAG_KEY, '0')
      return false
    }
    const stored = localStorage.getItem(V2_FLAG_KEY)
    if (stored === '1') return true
    if (stored === '0') return false
  } catch {
    // Private mode etc. — fall through to the build default.
  }
  return import.meta.env.VITE_GOLF_V2_DEFAULT === 'true'
}

export function golfV2PlayUrl(): string {
  return import.meta.env.VITE_GOLF_V2_WEBSOCKET_URL || 'wss://api.muchq.com/games/v2/golf/play'
}

/// The session mint lives beside the play socket: same origin, http(s)
/// for ws(s), /games/v2/session.
export function golfV2SessionUrl(): string {
  const play = new URL(golfV2PlayUrl())
  const protocol = play.protocol === 'wss:' ? 'https:' : 'http:'
  return `${protocol}//${play.host}/games/v2/session`
}
