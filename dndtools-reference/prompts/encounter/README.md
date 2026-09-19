# Campaign encounters: Fantasy Grounds parity plan

Turn the campaign combat tracker at `/tools/campaign/[id]` into a full encounter engine: initiative, targeting, attacks, damage, saves, spells, healing, effects, a combat log, map feedback and animations. The behavior model is the Fantasy Grounds 3.5E ruleset combat tracker (CT). These files are the source of truth.

## How to use this folder

1. Read this file, then `00-context.md`, `02-architecture.md`, `03-data-model.md`, `04-permissions.md`, `05-effects-dsl.md`, `06-ui-ux.md`, and `07-automation-rules.md`.
2. Implement **one phase at a time**, in numeric order. Phase 0 has two files (`10` and `11`); finish both before Phase 1.
3. Treat each phase file as the implementation prompt. The shared spec files (`02` to `07`) override phase files if they conflict.
4. Every automation must be **server-authoritative** and **visible**: the result shows on the tracker row, in the combat log, and (later) on the map. Nothing is applied silently.
5. Keep the campaign table usable with no combat (sheets, dice, map, roster still work when `CampaignCombat` has no rows).

## Files

| File | Role |
|---|---|
| [00-context.md](./00-context.md) | What the tracker already does, what is missing, file map |
| [01-requirements.md](./01-requirements.md) | FG CT feature catalog mapped to phases |
| [02-architecture.md](./02-architecture.md) | Rules engine, roll pipeline, events, code layout |
| [03-data-model.md](./03-data-model.md) | Prisma changes, DTOs, live events |
| [04-permissions.md](./04-permissions.md) | DM vs player capabilities and visibility |
| [05-effects-dsl.md](./05-effects-dsl.md) | Effect string grammar (FG 3.5E tags), conditions, durations, stacking |
| [06-ui-ux.md](./06-ui-ux.md) | UI/UX rules so the tracker stays consistent with the rest of the table |
| [07-automation-rules.md](./07-automation-rules.md) | Exact 3.5e resolution math the engine must implement |
| [10-phase-0-engine.md](./10-phase-0-engine.md) | Phase 0A: schema, rules engine, effects, server roll pipeline, combat log |
| [11-phase-0-tracker.md](./11-phase-0-tracker.md) | Phase 0B: FG-parity tracker UI, effects UI, modifier stack, drag/click resolution |
| [20-phase-1-spells.md](./20-phase-1-spells.md) | Spell casting, save DCs, SR, AOE targeting, slot use, NPC spells |
| [30-phase-2-map-animations.md](./30-phase-2-map-animations.md) | Token HP/condition bars, event-driven animations, map targeting modes |
| [40-phase-3-players-polish.md](./40-phase-3-players-polish.md) | Player agency, DM save requests, identification, encounter builder link, undo, XP |
| [90-testing.md](./90-testing.md) | Unit matrix, automation acceptance, browser checks, rollout |

## Phases at a glance

| Phase | Result at the table | Do not include |
|---|---|---|
| **0 FG parity** | Start/end combat, roll init, delay/ready, attack vs AC type with crit confirm, typed damage with DR/resist/immune, heal, nonlethal, death/dying, effects with durations that change rolls, combat log, modifier stack, drag or click a result onto a row | Spells, map bars, animations |
| **1 Spells** | Cast from PC sheet or NPC row: attack or save vs DC, SR, half on save, damage/heal/effect follow-ups, AOE from map pointers, slots consumed | Animations, player save prompts |
| **2 Map + FX** | HP and condition bars on tokens, dead/prone token state, hit/miss/damage/heal floaters, projectile and burst animations driven by combat events | New renderer, 3D |
| **3 Players + polish** | Players act on their own turn, DM asks for saves, identify NPCs, encounter builder to campaign, undo, XP on end | Voice, macros |

## Hard rules

- **Server resolves rules.** The client never decides hit, damage after DR, save success, or effect expiry. Faces come from `rollFaces.ts`, resolution runs in `src/lib/combat/rules/*`, results persist as `CampaignCombatEvent` rows and are broadcast.
- **One roll round trip.** A combat roll asks the server for faces and resolution together. Dice-box animates the returned faces. No second request to "apply".
- **Effects are strings, like FG.** `Bless; ATK: 1 morale; SAVE: 1 morale` is stored as typed on the row and parsed into components. See `05-effects-dsl.md`. Presets are just prefilled strings.
- **3.5e stacking rules apply.** Typed bonuses do not stack; dodge, circumstance and untyped stack; penalties always stack.
- **Reuse existing modules.** Dice provider, `rollFaces.ts`, `parseAttacks.ts`, `weaponAttacks.ts`, `conditions.ts`, `fg-spell-actions/types.ts`, `campaign-drawer-shell.tsx`, `theme.css` classes. Do not add a second dice system, a second condition table, or a UI kit.
- **Per-viewer filtering on the server.** Players get health bands for others, no hidden effects, no unidentified stat blocks. Same pattern as `combatView.ts` and `map/permissions.ts`.
- **Everything logged.** Every resolution writes an event. Every event renders in the log with the same wording pattern as FG chat (`[ATTACK (M)] ... [HIT]`).
- No em dash character in user-facing copy, comments, or commit subjects.
- No emojis in UI copy or code.

## Suggested commit subjects

Use `type(ticket): subject` when a ticket exists. Without a ticket use `feat(encounter): ...` / `fix(encounter): ...`.

- `feat(encounter): add rules engine and combat events`
- `feat(encounter): parse effect strings and tick durations`
- `feat(encounter): resolve spells vs saves and sr`
- `feat(encounter): animate combat events on the map`
