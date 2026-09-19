# 40. Campaign settings menu and initiative style

**Prompt:** Implement this file only. Update [`STATUS.md`](./STATUS.md) row F40 when done.

## Goal

Add a **Settings** entry on the campaign table rail with DM and Player sections. First DM setting: **initiative style** (roll at the start of each round vs roll once per encounter). Default: **each round**. Wire the existing `strictTurns` toggle into the same drawer.

## Current behavior

### Settings data (`lib/campaign/settings.ts`)

```ts
export type CampaignCombatSettings = {
  strictTurns?: boolean;
  askPlayersToRoll?: boolean;
};
```

- Stored on `Campaign.settings` JSON in Prisma.
- Loaded into combat view; live event `combatSettings` syncs changes.
- `updateCampaignCombatSettings()` merges patches.
- Defaults: `strictTurns: false`, `askPlayersToRoll: true`.

### Settings UI

- **No dedicated settings menu** on the campaign rail.
- `strictTurns` toggle lives only in combat toolbar overflow menu (`combat-toolbar.tsx`).
- `askPlayersToRoll` has no UI toggle (exported helper never called in enforcement paths).

### Initiative (`combatMutations.ts` `advanceCombatTurn`)

- On round wrap (`roundIncrement`), increments `combat.round`, writes `roundStart` event.
- **Does not re-roll initiative.** Order is fixed after first roll (FG/SRD default).

### Campaign rail (`campaign-table.tsx`)

- Buttons: Characters, Logs, Combat, NPCs (DM), Maps (DM). No Settings.

## Desired behavior

### User stories

1. As DM, I open Settings from the campaign rail and see a **DM** section with combat options.
2. As DM, I set initiative style to **Each round** (default) or **Once per encounter**.
3. As DM, when **Each round** is active and the turn order wraps to a new round, initiative re-rolls for all living combatants, order re-sorts, and the new round starts at the top of the new order. Re-rolls appear in the combat log.
4. As DM, when **Once per encounter** is active, behavior matches today (init persists across rounds).
5. As DM, I can toggle **Strict turns** in the same DM section (same setting as combat menu shortcut).
6. As a player, I open Settings and see a **Players** section (may be empty placeholder with "No player settings yet" for this wave).
7. As anyone, settings changes sync live to all clients at the table.

### Initiative style spec

Add to `CampaignCombatSettings`:

```ts
initiativeStyle?: "eachRound" | "once";
```

- Default when missing: `"eachRound"` (normalize in `normalizeCampaignSettings`).
- **`once`:** no change to `advanceCombatTurn` initiative handling.
- **`eachRound`:** when `roundIncrement === true` inside `advanceCombatTurn`:
  1. After incrementing round, call the same initiative roll logic used by `rollInitiativeFor` for scope `"all"` living combatants (exclude dead/removed; include delayed/readied per existing init rules).
  2. Re-sort initiative list.
  3. Set `currentCombatantId` to the new top of order (not the previous next actor from old order).
  4. Write `init` events and `roundStart` as appropriate. Log should show new init values.

Clarification: re-roll happens **on round wrap**, before the first actor of the new round acts. Match table expectations for "roll initiative at the beginning of each round."

### Settings drawer UI

- New rail button **Settings** (gear icon), DM and players both see it.
- Drawer shell: reuse `campaign-drawer-shell.tsx` or the same pattern as Maps/NPCs drawers.
- Sections:
  - **DM** (hidden or read-only summary for players): Initiative style (radio or select), Strict turns (checkbox).
  - **Players:** empty state text for now.
- Persist via existing `combatSetSettings` / `setCampaignCombatSettingsAction`.
- Combat toolbar menu may keep strict turns as a shortcut that writes the same setting (optional, not duplicate state).

### Out of scope for this prompt

- `askPlayersToRoll` UI and enforcement (note in STATUS if deferred).
- Player-editable settings beyond placeholder section.
- Prisma migration (JSON field already exists).

## MUST

- Extend `CampaignCombatSettings` and `normalizeCampaignSettings` with `initiativeStyle`, default `"eachRound"`.
- Expose setting on `CampaignCombatView.settings` (verify `loadCombat.ts` passes it through).
- Implement re-roll branch in `advanceCombatTurn` when style is `eachRound`.
- Add Settings rail button and drawer component, e.g. `campaign-settings-drawer.tsx`.
- Filter: only DM can change DM settings; players see read-only or hidden DM section.
- Publish `combatSettings` live event on save (existing path).
- Add unit test: normalize defaults `eachRound`; advance turn with eachRound triggers init update (mock or pure helper test).

## MUST NOT

- Add a Prisma column for settings (use existing JSON).
- Change init formula (`rules/initiative.ts`).
- Use em dash in UI copy.

## Implementation order

### 1. Types and normalization (`settings.ts`)

- Add `initiativeStyle?: "eachRound" | "once"`.
- Default `"eachRound"` in `DEFAULT_CAMPAIGN_SETTINGS` and `normalizeCampaignSettings`.
- Export `isInitiativeEachRound(settings): boolean`.

### 2. Combat view types

- Ensure `CampaignCombatView.settings` includes the new field in `lib/combat/types.ts` if typed separately.

### 3. Round advance logic (`combatMutations.ts`)

- In `advanceCombatTurn`, after detecting `roundIncrement`:
  - Load campaign settings (may already be on combat row or load via helper).
  - If `initiativeStyle === "eachRound"`:
    - Roll init for eligible combatants (reuse internal helper from `rollInitiativeFor` to avoid duplication).
    - Recompute `currentCombatantId` as highest init living combatant.
  - Else: keep existing `nextActor` path for next id only (today's behavior).

Extract shared "roll init for combatants in tx" helper if needed to avoid copy-paste.

### 4. Settings drawer UI

- `campaign-settings-drawer.tsx`: DM controls, player placeholder.
- Wire in `campaign-table.tsx`: rail button, `activeMenu === "settings"`, pass `campaignId`, `isDm`, current settings, `onSave`.

### 5. Combat toolbar (optional)

- Keep strict turns menu item as shortcut to same setting, or remove duplicate and point users to Settings (prefer keep shortcut).

### 6. Tests

- `settings.test.ts`: normalize missing initiativeStyle => eachRound.
- `combatMutations.test.ts` or `rules/turn.test.ts`: document expected behavior when eachRound flag set (at minimum test the helper that decides whether to re-roll).

## Browser checks

1. As DM, open Settings, confirm initiative style defaults to Each round.
2. Start combat, roll init once, run through a full round until wrap. With Each round: new init values in log, new actor order, round number incremented.
3. Switch to Once per encounter, repeat: init unchanged on round wrap.
4. Toggle strict turns in Settings; confirm combat toolbar shortcut (if kept) stays in sync.
5. As player, open Settings: Players section visible, cannot change DM options.

## Done when

- [ ] Settings rail button and drawer exist with DM and Players sections.
- [ ] `initiativeStyle` stored, default `eachRound`, synced live.
- [ ] Each round re-rolls initiative on round wrap with combat log entries.
- [ ] Once per encounter preserves current behavior.
- [ ] Strict turns editable in Settings drawer.
- [ ] Tests pass and registered if new file added.
- [ ] Browser checks pass.
- [ ] STATUS.md F40 marked `done`.
