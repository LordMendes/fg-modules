# Encounter fixes implementation status

Last updated: 2026-09-19

Legend: `pending` | `in_progress` | `done` | `blocked` | `skipped`

## Spec notes (verified against code)

| Item | Detail |
|---|---|
| Test registration | `web/package.json` `test` is an explicit `tsx --test` file list. Append new `*.test.ts` there. |
| Typecheck | No `typecheck` script. Use `pnpm --filter @fg-modules/web exec tsc --noEmit`. |
| Live transport | WebSockets via `publishCampaignLive`, not SSE. |
| Hit/miss engine | Already implemented in `rules/attack.ts` and `events/format.ts`. Fix is mostly routing and UX. |
| Grid size | Already adjustable in Maps drawer and calibrate tool. Fix is z-order and viewport coverage. |

## Fixes

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| F10 | Character Main tab layout | done | - | pc-sheet.tsx, theme.css, campaign-pc-window.tsx | Identity left (profile, race, classes), abilities right, 52rem window, container collapse |
| F20 | Selected-token targeting | pending | - | campaign-map-board.tsx, phase3Mutations.ts, map-targeting-layer.tsx | |
| F30 | Combat hit/miss log and damage | pending | F20 | pc-weapon-attacks-list.tsx, combatRolls.ts, dice-log-tray.tsx | |
| F40 | Campaign settings and initiative | pending | - | settings.ts, combatMutations.ts, campaign-table.tsx | |
| F50 | Map grid overlay | pending | - | map-viewport-overlay.tsx, theme.css, campaign-map-board.tsx | |
