# Campaign VTT maps: spec-driven plan

Implement the battle map on the existing campaign table at `/tools/campaign/[id]`. These files are the source of truth. Do not invent a second tabletop, a new realtime stack, or a 3D camera until Wave 4 says so.

## How to use this folder

1. Read this file, then `00-context.md`, `02-architecture.md`, `03-data-model.md`, and `04-permissions.md`.
2. Implement **one wave at a time**, in numeric order. Finish the wave's acceptance list before starting the next.
3. Treat each wave file as the implementation prompt. Architecture and data-model files override wave files if they conflict.
4. Keep the campaign table usable without a map (sheets, dice, roster, live rolls still work if no scene is live).

## Files

| File | Role |
|---|---|
| [00-context.md](./00-context.md) | What the VTT already has, what is missing |
| [01-requirements.md](./01-requirements.md) | Full feature catalog (Roll20 + Fantasy Grounds), mapped to waves |
| [02-architecture.md](./02-architecture.md) | Coordinates, renderer, live sync, code layout |
| [03-data-model.md](./03-data-model.md) | Prisma, R2 keys, live events, DTOs |
| [04-permissions.md](./04-permissions.md) | DM vs player visibility and control |
| [10-wave-1-board.md](./10-wave-1-board.md) | Scenes, image, pan/zoom, grid, tokens, ping, measure |
| [20-wave-2-theater.md](./20-wave-2-theater.md) | GM-hidden layer, fog, drawing, AOE pointers |
| [30-wave-3-vision.md](./30-wave-3-vision.md) | Walls, doors, token vision, UVTT import |
| [40-wave-4-lighting.md](./40-wave-4-lighting.md) | Lights, ambient, typed occluders, polish |
| [90-testing.md](./90-testing.md) | Tests, browser checks, rollout |

## Waves at a glance

| Wave | Player-facing result | Do not include |
|---|---|---|
| **1 Board** | Shared PNG, grid, PC/NPC tokens, ping, ruler | Fog, walls, lighting |
| **2 Theater** | Hidden monsters, paint-reveal fog, sketch, cones | LOS, UVTT, lights |
| **3 Vision** | Walls, doors, darkvision from the token, UVTT | Colored lights, 3D |
| **4 Lighting** | Torches, ambient, windows/terrain, extras | New renderer rewrite |

## Hard rules

- One **live scene** per campaign. The DM sets which map players see.
- Store token and geometry positions in **grid squares** (float), not pixels.
- Fog is **polygons**, not a bitmap.
- Walls are **typed polylines**. Lighting later renders the same data.
- The **character sheet is source of truth** for PC identity, token art, and (later) HP and senses.
- Reuse `publishCampaignLive` / SSE at `src/app/tools/campaign/[id]/live/route.ts`. Do not add WebSockets in Waves 1 to 3.
- Filter map payloads per viewer the same way activity already uses `filterForUser`.
- Map images go to R2 with a new key prefix. Do not reuse `pc/{userId}/{planId}/...` for battlemaps.
- No em dash character in user-facing copy, comments, or commit subjects.

## Suggested commit subjects

Use `type(ticket): subject` when a ticket exists. If the branch has no ticket, use `feat(maps): ...` / `fix(maps): ...`.

Examples:

- `feat(maps): add campaign scene and live board`
- `feat(maps): paint fog and gm-hidden tokens`
- `feat(maps): clip vision with walls and doors`
