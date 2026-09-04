# PC Planner — fully integrated character sheet

Goal: the PC Planner sheet (`/tools/pc-planner`) is the character, not a Fantasy Grounds–styled notepad with some autos. Layout already matches FG tabs (Main / Combat / Skills / Abilities / Inventory / Notes / Actions). The gap is mechanics, data wiring, and a few destructive bugs.

NPC Creator is ahead on FG XML export (portrait/token, HP, spellset automation). PC Planner has none of that. The compendium already has most of what a real sheet needs (`hit_die`, per-level `bab`/`fort`/`ref`/`will`, equipment, items, domains, deities, skills with ACP flags) and is largely unused.

---

## Bugs (fix first — wrong or destructive)

These produce incorrect characters or silently eat saved data.

- [x] **Spell lists truncated to slot count** (`syncPcPlanState`)
  - Extra unique spells are dropped once `used >= slots[level]`.
  - A wizard spellbook is not limited that way — only preparation is.
  - Lowering Int or class level deletes known spells from the save.

- [x] **Spontaneous “known” uses spells-per-day**
  - Same clamp. Sorcerer 1 is 4 cantrips known / 5 per day; the sheet allows 5.
  - No spells-known table exists.

- [x] **Monk BAB is full (+1/level)** (`classCombat.ts`)
  - 3.5 monks are ¾ BAB (level 1 is +0).

- [x] **Paladin casting ability is Charisma** (`classCasting.ts`)
  - 3.5 paladin spells are Wisdom.
  - Hidden today because paladin/ranger are `half` casters and get no Actions spell UI.

- [x] **Grapple uses the attack size modifier**
  - Small is +1 melee and should be −4 grapple; Large is −1 melee and +4 grapple.
  - Both rows share `combat.sizeMod`.

- [x] **Combat progressions are a 12-class hardcoded list**
  - Fighter/wizard/etc. work when the display name is exactly `"Fighter"`.
  - Prestige classes, variants, and mismatched names fall through to default ¾ BAB, all poor saves.
  - Class JSON advancement already has real BAB/saves per level and is ignored.

- [x] **Race resync overwrites Combat edits**
  - `applyRaceCombatBasics` resets `sizeMod`, `speedBase`, and `natural` on every class/race fetch.
  - Typed-in natural armor or speed is wiped when fighter level changes.

- [x] **Removing a class deletes skill ranks**
  - Skill table is only the union of class skills.
  - Drop rogue and Hide/Move Silently ranks are gone.
  - No way to add a cross-class skill.

- [x] **Skill-point ×4 follows list order, not first class taken**
  - Add wizard then fighter: ×4 applies to wizard.
  - Classes cannot be reordered.

- [x] **Racial save bonuses folded into Misc total but not the Misc field**
  - Dwarf +2 Fort is in the total; Misc input still shows 0.
  - Easy to double-count if the user also types +2.

- [x] **Variant casters get the base class slot table**
  - `battle-sorcerer` is treated as a full sorcerer for slots.
  - UA/Complete variant slot counts will be wrong.

---

## Missing — high leverage (data exists, not wired)

- [x] **Hit points / hit dice**
  - Every class has `hit_die` (`d10`, `d4`, …).
  - No HP, no Con per level, no first-level max.

- [x] **BAB / saves from advancement tables**
  - Parse `indexData.advancement[].bab|fort|ref|will` instead of the 12-class map.
  - Single biggest accuracy jump, including prestige classes.

- [x] **Iterative attacks**
  - Tables already have `+6/+1`. Combat only shows a single BAB.

- [x] **Equipment / magic items**
  - Inventory is free-text name/qty/weight.
  - `Equipment` and `Item` are searchable elsewhere and unused here.
  - Equipped armor should fill Armor, max Dex, ACP, speed.

- [x] **Full skill list**
  - All `Skill` rows, class vs cross-class (2 points per rank), max ranks (level+3 / half), armor check penalty, trained-only.

- [x] **Feat budget and feat effects**
  - 1st + every 3rd level, human bonus feat, fighter bonus feats.
  - Feats do not apply Dodge, Improved Initiative, Weapon Focus, etc.

- [x] **Cleric domains / deity**
  - `Domain`, `Deity`, `SpellDomain` models exist.
  - No domain picker, no +1 domain slot per level.

- [x] **Paladin / ranger spellcasting**
  - Excluded as `half`.
  - Need delayed progression (paladin 4 / ranger 4) and Wisdom DCs.

- [x] **FG character export**
  - NPC Creator already emits CoreRPG XML.
  - PCs have no download/import path.

---

## Missing — FG Main tab identity

- [ ] Level-up ability bumps (4 / 8 / 12 / 16 / 20)
- [ ] XP
- [ ] Size as its own field
- [ ] Languages
- [ ] Deity
- [ ] Gender / age / height / weight
- [ ] ECL / level adjustment (race records have `levelAdjustment`)
- [ ] Portrait / token

---

## Missing — Actions / combat still prose

- [ ] Weapon rows instead of the Attacks textarea
  - Bonus = BAB + ability + size + magic + Weapon Focus
  - Damage, crit, iterative routine
- [ ] Armor caps Dex on AC
- [ ] Encumbrance from inventory weight vs Strength

---

## Missing — class features are names only

Abilities tab lists Rage, Uncanny dodge, Divine grace, etc. Only Divine Grace currently changes numbers.

- [ ] Rage
- [ ] Monk/duelist AC bonus
- [ ] Evasion
- [ ] Familiar
- [ ] Animal companion
- [ ] Turn undead
- [ ] Sneak attack dice
- [ ] Barbarian speed
- [ ] Same effect-registry pattern as Divine Grace (`parseClassAbilityEffects.ts`)

---

## Later / out of scope unless requested

- Psionics (`PsionicClassLevel` exists)
- Epic (>20)
- Prestige class prerequisites
- Spell-like racial SLAs as Actions
- Conditions / buffs
- Wealth-by-level

---

## Suggested implementation order

Matches existing architecture; do not skip 1.

1. **Stop destroying data** — spellbook vs slots, skill ranks on class change, race overwrite of combat fields.
2. **Drive combat from class advancement + `hit_die`** — BAB, saves, iterative attacks, HP. Prestige classes start working.
3. **Skills as a real 3.5 grid** — all skills, class/cross-class, ACP, rank caps.
4. **Inventory from equipment/items** — equipped armor/weapons feed AC and attack rows.
5. **Caster completeness** — paladin/ranger, domain slots, spells known vs per day, specialist extra slot.
6. **Feat (and later class-feature) effects** — same pattern as Divine Grace.
7. **FG PC XML export** — reuse NPC Creator’s spellset/notes pipeline against `PcPlanState`.

---

## Key files

| Area | Path |
|------|------|
| Sheet UI | `dndtools-reference/web/src/components/tools/pc-sheet.tsx` |
| Planner state | `dndtools-reference/web/src/components/tools/pc-planner.tsx` |
| Types / tabs | `dndtools-reference/web/src/lib/pc-planner/types.ts` |
| Spell sync (truncation) | `dndtools-reference/web/src/lib/pc-planner/syncState.ts` |
| Casting table | `dndtools-reference/web/src/lib/pc-planner/classCasting.ts` |
| Combat table | `dndtools-reference/web/src/lib/pc-planner/classCombat.ts` |
| Combat stats | `dndtools-reference/web/src/lib/pc-planner/combatStats.ts` |
| Race overwrite | `dndtools-reference/web/src/lib/pc-planner/syncDerived.ts` |
| Skill merge | `dndtools-reference/web/src/lib/pc-planner/syncSkills.ts` |
| Class feature effects | `dndtools-reference/web/src/lib/pc-planner/parseClassAbilityEffects.ts` |
| Compendium bundle | `dndtools-reference/web/src/lib/entities.ts` (`getPcCompendiumBundle`) |
| Class advancement source | `dndtools-reference/data/dndtools/classes.json` (`advancement[].bab/fort/ref/will`, `hit_die`) |
