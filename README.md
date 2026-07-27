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
| `/golf` | Multiplayer 4-card golf — rooms, permalinks, and (on the v2 wire) room chat |
| `/thoughts` | 3D multiplayer thoughts game |
| `/party` | Rescue Party |
| `/quest` | Quest — score-chasing arcade game |
| `/tracy` | Ray tracer portraits |
| `/posterize` | Image posterizer |
| `/wordchains` | Word chain puzzles |
| `/metrics` | Live service/host dashboards for the backend fleet |
| `/resilience` | Distributed-systems game |
| `/groups`, `/sets`, `/top` | Math learning modules (permutation groups, sets, Topology Quest) |

### Golf v1/v2

Golf speaks two wires. The default v1 protocol is documented in [GOLF.md](GOLF.md); the v2
event-stream hub is a per-browser beta — opt in with `?golf=v2` (sticky via localStorage),
back out with `?golf=v1`, or default a build in with `VITE_GOLF_V2_DEFAULT=true`. Room chat
is v2-only, and the UI reveals it only once the server actually delivers chat on the wire.

## 🏗️ Project Structure

```
src/
├── apps/       # One directory per app (golf, thoughts, metrics-systems, …):
│               # components, styles, and tests live with their app
├── core/       # Page shells and routing targets
├── shared/     # Components shared across apps (navigation, backgrounds, …)
├── hooks/      # Cross-app React hooks (useGolfGame, useThoughtsGame, …)
├── plugins/    # Network plugins for the multiplayer games
├── types/      # Shared TypeScript contracts (adapter interfaces, wire shapes)
├── utils/      # Adapters, permalinks, feature flags, helpers
└── test/       # Vitest setup
```

Routes are declared in `src/App.tsx`.

## 📄 Documentation

- [GOLF.md](GOLF.md) — Golf multiplayer WebSocket API (v1)
- [THOUGHTS.md](THOUGHTS.md) — Thoughts multiplayer WebSocket API
