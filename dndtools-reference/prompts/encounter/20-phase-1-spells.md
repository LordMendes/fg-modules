# 20. Phase 1: spells, saves, spell resistance, AOE targeting

**Prompt:** Implement this phase only, after Phase 0A and 0B. Read `README.md`, `02-architecture.md`, `03-data-model.md` (Phase 1 block), `04-permissions.md`, `05-effects-dsl.md`, `06-ui-ux.md`, and `07-automation-rules.md` first.

## Goal

A caster (PC from the sheet, NPC from the tracker row) casts a spell at targets. The server runs the FG spell action set: cast action (touch attack or save DC with SR check), then damage, heal, or effect follow-ups, with half damage on a successful save, dice scaled by caster level, and spell slots consumed. AOE pointers on the map select targets. Saves can be rolled for any row from the tracker.

## Reuse

- `src/lib/fg-spell-actions/types.ts` (`SpellActionSet`, `SpellCastActionFields`, `SpellDamageAction`, `SpellHealAction`, `SpellEffectAction`) is the action model. Do not invent a second one. Add optional fields only if the interpreter needs them (`spellLevel`, `castingStat`, `descriptors` for `vs` matching, `rangeFeet`, `areaShape`).
- `src/lib/spell-cast-details.ts` already derives save/damage/effect text from compendium spells. Add a `spellToActionSet(spell, indexData)` that builds a best-effort `SpellActionSet` from the `Spell` row (`saving_throw`, `spell_resistance`, damage text, duration text) with a `confidence` flag; the DM can edit the result inline.
- Map AOE pointers exist in `campaign-map-board.tsx`. Add `tokensInsideShape` using `src/lib/map/distance.ts` containment helpers.

## User stories

1. As a PC wizard, I open Fireball on my sheet in a campaign. The cast block shows DC 17, Reflex half, SR yes, 8d6 fire (CL 8). I place a 20 ft burst on the map; the tokens inside become my targets. I click Cast: the server rolls SR where needed, rolls a Reflex save per target, applies 8d6 (halved on success), consumes a 3rd level slot, and logs everything.
2. As a PC cleric, I cast Cure Light Wounds on the fighter: heal 1d8+CL(max 5) applied, slot consumed.
3. As a PC bard, I cast Bless on the party: effect `Bless; ATK: 1 morale; SAVE: 1 morale vs fear` applied to each target for CL minutes, ticking on my init.
4. As DM, I expand a hobgoblin cleric and see its spell list; I cast Hold Person on a PC: Will save DC 14, on failure the effect `Paralyzed` is applied for CL rounds.
5. As DM, I click "Fort save DC 15" on a row (or drag a save DC chip onto rows) to make them save against poison and see results per row.
6. As DM, I cast a ray: ranged touch attack vs touch AC, then damage on hit.

## Implementation order

### 1. Data

- `CampaignCombatant.spells` (`CombatSpellEntry[]`) and `spellUses` per `03-data-model.md`.

```ts
type CombatSpellEntry = {
  key: string;                 // slug or generated id
  name: string;
  level: number | null;
  kind: "spell" | "sla";       // spell-like ability
  actions: SpellActionSet;
  usesPerDay: number | null;   // SLAs
  casterLevel: number | null;  // override per spell
  source: "compendium" | "npc" | "manual";
  confidence: "high" | "low";  // from auto conversion
};
```

- NPC converters: parse `Spells Known/Prepared (CL n)` and `Spell-Like Abilities (CL n)` blocks from `Monster.indexData` / NPC creator state into entries by looking up the compendium `Spell` by name; unknown names become `manual` entries with empty actions.
- PC: `pcPlanToCombatStats` mirrors the sheet's spell list into `spells` at add-party time and on `pcUpdated`; slots stay on the sheet. `spellUses` mirrors remaining slots per level (`slot:3`). Consuming a slot in combat updates `PcPlan.state` the same way HP does.

### 2. Rules (`src/lib/combat/spells/`)

- `dc.ts`, `scaling.ts` per `07-automation-rules.md`. Add `DC` tag to the effects grammar (`DC: 1` for Spell Focus style effects, descriptors = school).
- `spellAction.ts` `resolveSpellCast(caster, targets, entry, faces, opts)`:
  1. For each target, if `!srnotallowed` and target has `sr`: SR check.
  2. Cast action: `atktype` set -> attack roll per target vs touch AC (`mtouch` / `rtouch`) using `rules/attack.ts`; `savetype` set -> save per target with DC.
  3. Follow-ups in order: damage (skip target on miss unless `onmissdamage = half`; halve on successful save when `onmissdamage = half` or when the spell says "half"), heal (no save), effect (skip on successful save when the spell is negated; apply with dice duration `durdice + durmod` in `durunit`, source = caster, `tickInit` = caster init).
  4. Consume slot or SLA use.
  5. Return events: `cast`, `sr`, `attack`, `save`, `damage`, `heal`, `effectApply`.
- Faces: request exactly what the resolution needs in one pool (`1d20` per target for SR, `1d20` per target for save or attack, damage dice once, effect duration dice once). Faces are assigned in a deterministic order documented in code so the client can map dice to lines.

### 3. Server

- `startCombatRoll` intents: `cast` (full pipeline), `save` (row save vs DC with optional consequence), `sr`.
- Mutations: `setCombatantSpells`, `setSpellUses`, `resetSpellUses` (DM, "new day").
- Permissions per `04-permissions.md`: own PC or DM.

### 4. Sheet integration

- `spell-cast-details-view.tsx`: when `useCombatContext()` is present, replace the Cast/Roll dmg buttons with **Cast at targets** (disabled with tooltip when no targets and the spell needs them), a DC readout, an SR badge, and a compact editable action set (save type, attack type, half on miss, damage dice, heal dice, effect string, duration). Editing writes back to the mirrored `spells` entry for that PC (not to the compendium).
- Keep the non-campaign behavior unchanged.
- Show remaining slots for the spell level next to the button; block casting at zero with a clear message and a DM override.

### 5. Tracker integration

- Expanded row Offense gets a **Spells** list: name, level, DC, SR badge, uses left, Cast button (draggable like attacks), and an edit icon for the action set (`.combat-spell-editor`, same fields as the sheet block).
- Defense section gains a **Saves** row of three buttons `Fort +3`, `Ref +5`, `Will +1`. Click prompts for a DC (small input, remembers last) and rolls. Drag a **save DC chip** (created from the DC input in the toolbar: "Save: Fort DC 15") onto rows to roll for them.
- Effects from spells show the spell name as the chip label.

### 6. AOE targeting

- Map: when an AOE pointer is placed by the current actor (or DM) and combat is active, a "Target inside" button appears on the pointer; clicking sets the actor's `targetIds` to the combatants whose token center is inside the shape. Also Shift+drop an AOE to target immediately.
- Radius from the spell (`rangeFeet` / `areaShape` when known) prefills the pointer size when casting from the sheet: clicking Cast with zero targets on an area spell enters pointer placement with the right size, then casts on confirm.
- Distance rule for containment follows the map's configured diagonal rule.

### 7. Log wording

- `[CAST] Fireball (CL 8) -> 4 targets`
- `[SR] Fireball 8+11=19 vs SR 18 [PASSED]` or `[RESISTED]`
- `[SAVE] Reflex DC 17 -> 21 [SUCCESS] [HALF]`
- `[DAMAGE (S)] Fireball [TYPE: fire (8d6=27)] -> Goblin [HALF -> 13] [RESIST 10 -> 3] Goblin: Critical`
- `[HEAL] Cure Light Wounds (1d8+5=11) -> Aria 18/18`
- `[EFFECT] Hold Person; Paralyzed -> Aria (5 rounds)`
- `[SLOT] Fireball: 3rd level, 1 left`

## Acceptance

- [ ] Fireball on 3 targets, one with SR 18 and one with `RESIST: 10 fire`: log shows SR check, three saves, three damage lines with correct halving and resistance, one slot consumed.
- [ ] Cure Light Wounds heals `1d8 + min(CL, 5)` and reduces nonlethal.
- [ ] Bless applies one effect per target with `duration = CL * 10` rounds (1 minute per level), `tickInit` = caster init.
- [ ] Hold Person: successful Will save applies nothing; failed save applies Paralyzed; subsequent melee attacks on the target get +4 in the tooltip.
- [ ] Scorching Ray: ranged touch vs touch AC; miss deals no damage; hit deals 4d6 fire.
- [ ] Save buttons on a row roll vs the entered DC and include `SAVE`/`FORT` effects in the tooltip.
- [ ] Save DC chip dragged onto three rows produces three save events.
- [ ] AOE "Target inside" selects exactly the tokens whose centers are inside using the map's diagonal rule.
- [ ] NPC cleric spell list is parsed from the stat block; unknown spells appear as manual entries the DM can fill.
- [ ] Casting with zero slots is blocked with a message; DM override works.
- [ ] Non-campaign spell pages behave exactly as before.
- [ ] Player wording hides DCs of NPC spells until the NPC is identified.

## Out of this phase

Player save prompts (DM asks, player rolls), counterspell, concentration checks, metamagic UI, animations.

## Browser check

1. DM: encounter with a hobgoblin cleric and 3 goblins vs 2 PCs (one wizard, one cleric). Start.
2. Wizard player: place a Fireball burst, Target inside, Cast at targets. Check both logs, HP bands, slot count.
3. Cleric player: Cure Light Wounds on the wizard. Check heal.
4. DM: hobgoblin casts Hold Person on the cleric. Check save, effect chip, and the +4 on the next goblin attack tooltip.
5. DM: Fort DC 15 chip on all PCs. Check three save lines.
6. Reload both tabs.
