# Encounter fixes: Composer execution protocol

Targeted fixes for the campaign table at `/tools/campaign/[id]`. Each numbered file is a self-contained job for a Composer 2.5 agent. Implement **one file at a time**, update [`STATUS.md`](./STATUS.md) after each job, and run tests before marking done.

## How to use this folder

1. Read this file and [`STATUS.md`](./STATUS.md).
2. Pick the next item whose dependencies are `done`.
3. Treat the numbered file as the full implementation prompt. You do not need to read the full encounter phase specs first.
4. After finishing, set the row in STATUS to `done` with a one-line note and files touched.
5. Run browser checks listed in the prompt before marking done.

## Suggested order

| Order | File | Why |
|---|---|---|
| 1 | [10-character-main-tab.md](./10-character-main-tab.md) | Independent UI work |
| 2 | [20-token-targeting.md](./20-token-targeting.md) | Unblocks map-based targeting for combat |
| 3 | [30-combat-hit-and-damage.md](./30-combat-hit-and-damage.md) | Depends on reliable targeting; fixes attack log and damage |
| 4 | [40-campaign-settings.md](./40-campaign-settings.md) | Independent settings work |
| 5 | [50-map-grid.md](./50-map-grid.md) | Independent map overlay work |

`40` and `50` can run in parallel with each other after `20`/`30` if different agents own them.

## Files

| File | Issue |
|---|---|
| [10-character-main-tab.md](./10-character-main-tab.md) | Character sheet Main tab layout, better use of space |
| [20-token-targeting.md](./20-token-targeting.md) | Ctrl+click: selected token targets another token |
| [30-combat-hit-and-damage.md](./30-combat-hit-and-damage.md) | Attack hit/miss in logs; damage PC to NPC and NPC to PC |
| [40-campaign-settings.md](./40-campaign-settings.md) | Settings menu; DM initiative style (each round vs once) |
| [50-map-grid.md](./50-map-grid.md) | Grid above map, full viewport coverage, DM grid size |

## Test commands

From repo root:

```bash
pnpm --filter @fg-modules/web test
pnpm --filter @fg-modules/web exec tsc --noEmit
```

Register every new `*.test.ts` in `dndtools-reference/web/package.json` `test` script or it will not run.

## Hard rules

- **Server resolves combat rules.** Do not move hit/miss or damage math to the client.
- **Reuse existing modules.** Dice provider, combat context, map board, campaign drawer shell, `theme.css`. No second dice system or UI kit.
- **No em dash** in user-facing copy, comments, commit subjects, or these markdown files.
- **No emojis** in UI copy or code.
- **Scope to the prompt.** Do not refactor unrelated combat phases or map waves.
- **Browser verify** every UI change on the campaign table before marking done.

## Suggested commit subjects

Use `type(ticket): subject` when a ticket exists. Without a ticket:

- `fix(encounter): rework pc main tab layout`
- `fix(encounter): target from selected map token`
- `fix(encounter): combat attack log and damage routing`
- `feat(encounter): campaign settings drawer and initiative style`
- `fix(maps): grid overlay above map image`
