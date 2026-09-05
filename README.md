# MuchQ

Just some doodles and a few pretty chill games. Lives at [muchq.com](https://muchq.com).

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:3000)
npm run dev

# Point game/API traffic at a local backend on :2015 instead of prod
npm run local-server
```

## ✅ Checks

```bash
# Type check
npm run typecheck

# Lint (zero-warning budget)
npm run lint

# Tests: watch mode, one-shot, or with the vitest UI
npm run test
npm run test:run
npm run test:ui

# Production build / preview
npm run build
npm run preview

# Deploy (Cloudflare Workers via wrangler)
npm run deploy
```

## 🕹️ What's Here

| Route | App |
|---|---|
| `/golf`, `/castle` | Redirect into the lobby; old share links land on the same room and table |
| `/thoughts` | 3D multiplayer thoughts game |
| `/party` | Rescue Party |
| `/quest` | Quest — score-chasing arcade game |
| `/tracy` | Ray tracer portraits |
| `/posterize` | Image posterizer |
| `/wordchains` | Word chain puzzles |
| `/metrics` | Live service/host dashboards for the backend fleet |
| `/stats` | Traffic aggregates from the access logs: crawlers, scanners, short-link popularity |
| `/resilience` | Distributed-systems game |
| `/groups`, `/sets`, `/top` | Math learning modules (permutation groups, sets, Topology Quest) |

The nav's **Elsewhere** menu links to apps hosted off muchq.com (see the
`elsewhere` group in `src/shared/components/Navigation.tsx` for the current
list). Those are external links, not routes — their code lives in their own
repos, not here.

### The lobby, golf, castle, and thoughts

`/games` is the lobby (MoonBase#1490): the thoughts world with a panel for the room, its
players and their tables, and the room's chat, all on one stream. A table of either game opens
over the world (MoonBase#1502); `GolfTable` and `CastleTable` are the tables, `useGolfTable`
and `useCastleTable` their state over the room stream's game envelopes. Share links are
`/games/room/:roomId` and `/games/room/:roomId/table/:gameId`; the old `/golf` and `/castle`
links redirect to them.

The lobby speaks the games hub's one stream (`/games/v2/play` on api.muchq.com; the models
and the protocol are documented with the service in MoonBase, `domains/games/apis/games_hub`)
through `src/utils/hubStream.ts`, which owns the session mint, the socket, the reconnect loop,
and the resume token that reclaims the seat. `VITE_HUB_WEBSOCKET_URL` overrides the play
socket at build time; the session mint is derived from it (`src/utils/hubSession.ts`).
Thoughts on its own page dials its own socket and mints a fresh identity per dial
(`src/utils/networkSystem.ts` says why). Room chat appears only once the server actually
delivers chat on the wire.

## 🏗️ Project Structure

```
src/
├── apps/       # One directory per app (golf, thoughts, metrics-systems, …):
│               # components, styles, and tests live with their app
├── core/       # Page shells and routing targets
├── shared/     # Components shared across apps (navigation, backgrounds, …)
├── hooks/      # Cross-app React hooks (useLobby, useThoughtsGame, …)
├── plugins/    # Network plugins for the multiplayer games
├── types/      # Shared TypeScript contracts (adapter interfaces, wire shapes)
├── utils/      # Adapters, permalinks, feature flags, helpers
└── test/       # Vitest setup
```

Routes are declared in `src/App.tsx`.

## 📄 Documentation

- [WORKING_AGREEMENT.md](WORKING_AGREEMENT.md) — How work gets picked up, built, reviewed, and shipped
