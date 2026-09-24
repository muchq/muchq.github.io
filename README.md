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
| `/games` | The lobby: a room, its tables, and chat over the thoughts world |
| `/golf`, `/castle`, `/thoughts` | Redirect into the lobby; old share links land on the same room and table |
| `/party` | Rescue Party |
| `/quest` | Quest — score-chasing arcade game |
| `/tracy` | Ray tracer portraits |
| `/posterize` | Image posterizer |
| `/wordchains` | Word chain puzzles |
| `/metrics` | Live service/host dashboards for the backend fleet |
| `/stats` | What the apps did — rooms, games and queries — and what the gateway saw: crawlers, scanners, short-link popularity |
| `/deja` | The anomaly detector over the access-log token stream, live: its tape, learning curve, and a way to ask it |
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
links redirect to them, and `/thoughts` to `/games`. Hiding the panel is how the bare world
is asked for, so that choice is remembered across visits.

Space, or three taps on the world on a phone, opens the command menu (`CommandMenu`): every command the world and the lobby offer, by
name — avatar shape, room, the room's tunes, sound, creating and joining rooms and tables, chat,
the room link, the panel. Both sides publish into one `CommandRegistry`
(`src/utils/commandRegistry.ts`): the world loop as the `world` source, `lobbyCommands` as the
`lobby` one, each republished whole when what it offers changes. A command that is unavailable
is left out rather than shown disabled. Space on a focused button still presses it, and the panel
says where the commands are. `g` and `y` still cycle the room and its tunes.

A position is a point of the surface the hub keeps the room on (`src/utils/surface.ts`,
MoonBase#1554): the ±50 ground plane, or the inside of a sphere, where the whole wall is
somewhere to walk. A step goes along the tangent and settles back on the surface, and the
player carries a frame — where they stand and which way the camera sits — instead of a
camera angle, so a heading means something at every point and no pole is special. The map
in the corner follows: the plane's square, or a globe centred on the player with the far
side of the world on its rim (`src/utils/miniMap.ts`).

A room (`src/utils/roomGeometry.ts`) is how one of those surfaces is drawn: a palette, the
surface itself, how the shared tracer is tuned there (fog, block size, reflections), a GLSL
block the ray tracer calls for its ground, walls and shading, the attractors hung outside,
the tint they take on through the glass, the length of the wake an avatar leaves, and a
sound profile (`src/utils/audioSystem.ts`). Today: the grid the world always had; a
glasshouse at night, lit by the people in it — every avatar is a lamp the floor and the
glass take their colour from — where they trail a glowing wake to a minimal techno floor,
past a different attractor through every pane, each drawn its own way — a comet flying its
curve on a ribbon, a chain of beads, a drift of sparks, a hard spark; and the inside of a sphere, drawn and scored like an SNES platformer. A
new room is a new entry.

deja's tape lands on the glasshouse's glass (MoonBase#1563): the hub fans each scored request
out as a splat, which `src/utils/worldSync.ts` keeps as a ring of the last 32 in `GameState`.
A live event flies in as a comet out of deep space — `src/utils/tapeComet.ts`, a pure function
of the event's sequence number and how far into the flight it is — hits the outside of the
pane, and smears the whole event down the glass: the lane's context, the token, both
predictors, in the verdict colours the `/deja` page uses. A smear settles back to residue
after a few seconds or as soon as the next comet sails in, so the wall reads as one live
impact at a time. `src/utils/tapeWall.ts` draws all of it as elements over the canvas,
projected through the ray tracer's own camera. The hub places every splat from its sequence
number, so every client in a room sees one event on the same square inch of glass; a joiner's
thirty-two are residue already on the glass rather than thirty-two comets. The client draws
what it is handed, fades it by its age, and never subscribes to deja itself. Only a room with
glass has a wall to splat against.

A wake is a ribbon, not a wire (`src/utils/ribbon.ts`): two vertices a point, turned to face
the camera and tapering into the tail, so it has width in the world and thins with distance.
It takes a point by distance travelled rather than by frame, at a steady height, so a slow
frame and a fast one leave the same path and a bounce does not zigzag it.

Every room is a surface the hub names — plane, glasshouse, sphere — so `g`, or a room
picked from the command menu, asks the hub for it as `setGeometry` whenever this client
stands in a world, and only redraws here and now when it is off the wire. The glasshouse walks exactly as the plane
does, and is a surface of its own all the same: the hub polls deja for a room standing in
one and for no other, so a client that called it a plane would draw a wall nothing ever lands
on. The hub answers everyone in the room with `geometryChanged`, carrying where it placed
each player on the new surface, and `roomState` names the surface before the world is
joined so a spawn lands on it. `src/utils/projection.ts` is the one camera the ray tracer,
the player labels, and the line pass share; the shader reads its constants rather than
carrying copies.

The lobby speaks the games hub's one stream (`/games/v2/play` on api.muchq.com; the models
and the protocol are documented with the service in MoonBase, `domains/games/apis/games_hub`)
through `src/utils/hubStream.ts`, which drives the session mint (`src/utils/hubSession.ts`),
the socket, the reconnect loop, and the resume token that reclaims the seat.
`VITE_HUB_WEBSOCKET_URL` overrides the play socket at build time; the mint is derived from it.
Room chat appears only once the server actually
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
├── types/      # Shared TypeScript contracts (game models, chat rules)
├── utils/      # Hub stream and session, feature flags, helpers
└── test/       # Vitest setup
```

Routes are declared in `src/App.tsx`.

## 📄 Documentation

- [WORKING_AGREEMENT.md](WORKING_AGREEMENT.md) — How work gets picked up, built, reviewed, and shipped
