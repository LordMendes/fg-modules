# 90. Testing and rollout

## Unit tests (Node, same style as `src/lib/pc-planner/*.test.ts`)

| Module | Cases |
|---|---|
| `src/lib/map/grid.ts` | pixel <-> grid round trip; snap center; 5-10-5 vs 5-5-5 vs euclid on a 1-square diagonal; scaleFeet not 5 |
| `src/lib/map/permissions.ts` | GM sees gm-layer; player does not; mask token hidden until center revealed; secret door rewritten to wall |
| `src/lib/map/fog.ts` | point in polygon; reveal minus hide; empty fogEnabled |
| `src/lib/map/los.ts` | box room; open vs closed door; collinear overlapping walls; move blocked across wall; open door walk-through |
| `src/lib/map/uvtt.ts` | fixture JSON: grid size, wall count, portal as door; reject random PNG renamed .uvtt |
| `src/lib/map/distance.ts` | cone/circle/square containment for a 20 ft template |

Commit tests with the wave that adds the module. Do not wait for Wave 4.

## Live and permission tests

If there is no existing campaign action test harness, add focused tests for filter helpers (pure). Manually verify SSE with two browsers (required in each wave file).

When adding tests around actions, never log real `.env` secrets. Use the same prisma test pattern the repo already has, if any; otherwise keep action tests out and test pure lib code.

## Browser verification (required for UI waves)

User rule: exercise the flow, do not rely on a screenshot.

Minimum matrix per wave:

- DM Chrome + player Chrome (or Firefox), same campaign
- Reload after mutations
- Sheet open above the map
- Dice roll still broadcasts

Edge states:

- No live map
- Live map with zero tokens
- Fog on, zero reveals
- LOS on, zero walls (full vision inside fog holes)
- Image missing from R2 (error string, table remains up)

## Rollout

1. Migrate Postgres (`prisma migrate`) on the web app as part of Wave 1.
2. R2 CORS/public read must already work for PC tokens; map keys use the same bucket and public URL helper pattern as `pcImagePublicUrl`.
3. Feature flag is optional. Shipping behind `Campaign.liveMapId === null` is enough: unused maps do not change the table.
4. Do not backfill. Existing campaigns start with no maps.

## Implementation checklist for an agent

Before coding a wave:

- [ ] Read the wave file and the four shared specs
- [ ] List files you will add (match `02-architecture.md`)
- [ ] One Prisma migration if the wave adds tables

After coding:

- [ ] Unit tests for new `src/lib/map/*`
- [ ] Browser path in the wave's "Browser check"
- [ ] Player payload must not include GM-only tokens (inspect the SSE `mapSnapshot` or the table JSON)

Do not start Wave N+1 in the same PR as Wave N unless the user asks to combine them.
