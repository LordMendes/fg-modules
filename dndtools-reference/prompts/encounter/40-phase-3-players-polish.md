# 40. Phase 3: player agency, DM requests, identification, undo, encounter lifecycle

**Prompt:** Implement this phase only, after Phase 2. Read `README.md`, `02-architecture.md`, `03-data-model.md`, `04-permissions.md`, `06-ui-ux.md` first.

## Goal

The encounter runs with players acting for themselves the way Fantasy Grounds allows: they target any time, roll their own saves when the DM asks, and see NPCs get identified. The DM can undo mistakes, award XP when combat ends, send Encounter Builder results into the campaign, and run a rest. Robustness and polish items collected during Phases 0 to 2 land here.

## User stories

1. As a player, I can target and attack on my own turn without the DM, and pre-select targets while waiting so my turn is fast.
2. As DM, I drop a save DC on PCs and each player gets a prompt "Reflex save DC 17 (Fireball)" with a Roll button; when they roll, the result resolves like a DM roll. I can roll for absent players from the same prompt.
3. As DM, I flip "identified" on a monster and players see its real name and (optionally) its stat summary in the log going forward.
4. As DM, I undo the last damage on a row; HP, death state and system effects revert and the log shows `[UNDO]`.
5. As DM, I click End: XP for defeated foes is computed from CR and party level (reuse `src/lib/encounter/`) and shown with an "Award to party" button that writes to each PC sheet.
6. As DM, I build an encounter in `/tools/encounter-builder` and click "Send to campaign", picking a campaign; it appears as a `CampaignEncounter` preset.
7. As DM, I click Rest: overnight healing, nonlethal cleared, spell uses reset, per-day effects removed, logged.
8. As a player at a second monitor, the pop-out sheet route (`/tools/campaign/[id]/sheet/[pcPlanId]`) still resolves attacks and spells through combat.

## Implementation order

### 1. Player agency

- Permissions update per `04-permissions.md` Phase 3 rows: own PC may target at any time; `toggleCombatTarget` drops the "current turn" requirement for own PC (DM unchanged).
- Tracker: players get the crosshair toggle on other rows for their own PC regardless of turn; the "Waiting for" footer shows a **Ready** indicator when the player has targets set.
- Attack and cast buttons for players are enabled off-turn too (FG does not block), but the row shows "Not your turn" in muted text so the table etiquette is visible. The DM can turn on a campaign option `combat.strictTurns` (Json settings on `Campaign` or a new column) to disable off-turn rolls.

### 2. DM roll requests

- Live events `combatRollRequest` / `combatRollRequestResolved` (`03-data-model.md`). Persist requests in a small table `CampaignCombatRollRequest` (id, combatId, targetCombatantId, kind `save`, saveType, dc, label, sourceEventId, status pending | rolled | dmRolled | dismissed, createdAt) so reloads keep them.
- DM flow: dragging a save DC chip (Phase 1) onto a PC row with an online owner creates a request instead of rolling; onto NPCs or offline PCs it rolls directly. A toolbar toggle "Ask players to roll" (default on) controls this.
- Player UI: a stacked prompt at the bottom of the table (`.combat-request`), one per pending request: label, DC, save bonus, **Roll** (uses the `save` intent with `requestId`), and nothing else. Also a small badge in the rail.
- DM UI: pending requests list in the drawer under the toolbar with **Roll for them** and **Dismiss**.
- Consequences (half damage, effect) chain from the original cast event through `sourceEventId`, so a Fireball waits for all players to save before applying their damage. Damage to NPCs applies immediately.
- Timeout: none. DM can always roll for them.

### 3. Identification and hidden NPCs

- Row toggles exist from Phase 0B. Add: identified flips update the `name` players see in **new** events; old events keep the generic label (FG behavior). Optional "reveal stat summary" checkbox that includes AC and saves in the player payload for identified NPCs (default off).
- Hidden rows (`visibleToPlayers = false`): players never receive them; their actions log as "Unknown" for players (implemented in Phase 0A filter). Add a DM helper "Reveal" on the row that flips visible and writes a `note` event "Goblin 3 appears".

### 4. Undo

- `undoCombatEvent(eventId)` DM only: supported kinds `damage`, `heal`, `tempHp`, `nonlethal`, `effectApply`, `effectRemove`, `hpEdit`, `init`. Revert using the payload's before values (`hpBefore`, effect snapshot). Mark `revertedAt`, write an `undo` event, republish snapshot. Refuse if a later non-reverted event on the same row depends on this one (simple rule: only the most recent non-reverted damage/heal per row is undoable).
- Log: reverted lines get strikethrough; the `[UNDO]` line references them.
- Tracker: right-click or menu on a log line "Undo" (DM).

### 5. End combat and XP

- `endCombat` computes XP: sum over `npc` rows with `deathState = dead` or removed-as-defeated (DM can check boxes in the end dialog) using CR from `CampaignNpc.snapshot` / `Monster.challengeRating` and the party's average level, with the existing EL/XP tables in `src/lib/encounter/`. Show a dialog: defeated list, XP total, per PC share, **Award** writes `experience` into each `PcPlan.state` (find the field the sheet uses; if none, add `identity.xp`) and logs it.
- End also offers "Remove all NPCs" and "Keep for next fight".

### 6. Encounter Builder to campaign

- In `/tools/encounter-builder`, a **Send to campaign** button for signed-in DMs: pick a campaign, then for each monster in the builder call `addMonsterToNpcLibrary` if missing and create a `CampaignEncounter` with the quantities. Show the result link to the campaign.
- Reverse: the NPC drawer's Encounters tab shows EL for the current party using the same lib.

### 7. Rest

- `restParty(kind: "night" | "full")`: heal each PC `level` hp (or `2 x level` with full bed rest), clear nonlethal, reset `spellUses` and sheet slots, remove effects whose unit is `day` or flagged `untilRest`, log a `note`. NPCs untouched.

### 8. Robustness and polish backlog

- Row lock and transaction on all mutations verified under a two-client stress script (`scripts/combat-stress.ts`, dev only, kept out of the build).
- Reconnect: on WS reconnect the client requests a snapshot and the last 100 events; FX layer skips replayed events by `seq`.
- Removing a PC from the campaign removes its combatant and pending requests.
- Deleting a map token linked to a combatant sets `tokenId = null` (row becomes unplaced) rather than failing.
- `CampaignCombatEvent` retention: keep the last 2000 per campaign, prune on `endCombat`.
- Accessibility pass: all icon-only buttons have `aria-label`, rows announce the active actor, log region is `aria-live="polite"` for DM only.
- Copy pass against `06-ui-ux.md`.

## Acceptance

- [ ] Player targets and attacks off-turn; `strictTurns` blocks it with a clear message.
- [ ] Save DC drop on two online PCs creates two prompts; one player rolls, DM rolls for the other; Fireball damage applies to each after their save with the correct halving.
- [ ] Prompts survive a reload on both sides; Dismiss removes them.
- [ ] Identified flip changes the player-facing name in new log lines only.
- [ ] Undo last damage restores HP, removes Dying, logs `[UNDO]`; undoing an older damage is refused with a message.
- [ ] End combat dialog shows XP from CR and party level; Award updates each sheet and logs.
- [ ] Encounter Builder sends a preset that appears in the campaign's Encounters tab with correct quantities.
- [ ] Rest heals, clears nonlethal, resets slots and per-day effects.
- [ ] Pop-out sheet route resolves attacks and spells identically to the in-table sheet.
- [ ] Stress script with two clients rolling 50 attacks each on the same target ends with HP equal to max minus the sum of applied damage in the log.
- [ ] Axe or Lighthouse accessibility check of the drawer and log has no critical issues.

## Out of this phase

Voice, macros, automatic attacks of opportunity, movement-triggered effects, FG XML export of combat.

## Browser check

1. Full encounter: 2 PCs (two browsers) vs hobgoblin cleric and 3 goblins on a map.
2. Players pre-target, DM starts, players act on their turns, DM casts Hold Person and asks for the save, player rolls.
3. DM undoes one damage, then redoes it manually.
4. End combat, award XP, check both sheets.
5. Rest, check HP and slots.
6. Build a new encounter in the Encounter Builder and send it to the campaign; spawn it.
