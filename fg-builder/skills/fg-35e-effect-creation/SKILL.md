---
name: fg-35e-effect-creation
description: >-
  Creates Fantasy Grounds D&D 3.5E / PFRPG effect strings using standard ruleset
  modifiers and Better Combat Effects (BCE/BCEG) automation tags. Use when the
  user asks to create, convert, or automate spell/ability/aura effects for 3.5E,
  mentions effect strings, Effect Builder, BCE, SAVEA, AURA, or AoE Effects.
---

# FG 3.5E Effect Creation

Create effect strings for **D&D 3.5E / PFRPG** in Fantasy Grounds. Two layers:

| Layer | Purpose | When to use |
|-------|---------|-------------|
| **Standard** | Roll modifiers, conditions, conditionals | Always — passive bonuses, status conditions |
| **Better (BCE)** | Saves, ongoing damage, timed triggers, helper effects | Spell automation, per-round saves, damage-on-fail |

**Required extensions (typical stack):**

- **Effect Builder** + **Effect Builder Plugin - 3.5E/PFRPG** — GUI (`/buildeffect`)
- **Better Combat Effects** (BCE) or **BCE Gold** (BCEG; includes `SSAVES`, `SDMGOS`, etc.)
- **AoE Effects** (this project) — `AURA:` proximity automation + visualization

Wiki: [PFRPG and 3.5E Effects](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996643237/PFRPG+and+3.5E+Effects)

---

## Effect string syntax

```
Description; COMPONENT; COMPONENT; ...
```

- Components separated by **`;`**
- First segment without a recognized tag = **display label**
- Modifiers: **`TAG: value descriptors`** (colon required if value follows)
- Conditions: bare names (`Prone`, `Entangled`) — not case-sensitive, do not stack
- Attribute substitution: `[STR]`, `[-CHA]`, `[$LEVEL/3]`, `[SDC]`, `[SDCWIS]`
- Conditionals: **`IF: TYPE(undead)`**, **`IF: !DYING`**, **`IF: FACTION(enemy)`**
- Descriptors after comma: `ATK: 1, profane; SAVE: 2, FORTITUDE`

**Case rules:** modifier tags are **case-sensitive** (`ATK`, not `atk`). Conditions are not.

---

## Workflow

```
- [ ] 1. Parse spell/ability text (target, duration, saves, damage, conditions)
- [ ] 2. Choose host: target CT row vs marker token vs caster
- [ ] 3. Draft standard components (conditions + passive mods)
- [ ] 4. Add BCE tags if automation needed
- [ ] 5. Create helper effects in Effects window (SAVEADD targets)
- [ ] 6. Set CT fields: Applied By, Duration, Targeting, Active
- [ ] 7. Validate tag interactions (see pitfalls below)
```

### Step 1 — Classify the mechanic

| Pattern | Standard tags | BCE tags | Host |
|---------|--------------|----------|------|
| Passive bonus while active | `ATK`, `SAVE`, `AC`, `SKILL`, `DMG` | — | Target or caster |
| Apply-on-entry condition | condition name | `SAVEA` | Target or aura marker |
| Re-save each round | — | `SAVES` / `SSAVES` + `(R)` if success ends | Target |
| Damage on failed save | — | `SAVEDMG` | Target |
| Damage every round regardless | — | `SDMGOS` / `DMGO` | Target, Applied By = caster |
| Different result pass vs fail | helper effects | `SAVEADD` / `SAVEADDP` | Target |
| Fixed area (cloud, desecrate) | `IF:` filters | `SAVEA`, `SAVES` | **Marker token** + `AURA:` |
| Mobile aura on creature | `IF:` filters | optional saves | **Aura source** + `AURA:` |

### Step 2 — Standard components (always consider first)

**Common modifiers (3.5E):**

| Tag | Example | Notes |
|-----|---------|-------|
| `ATK` | `ATK: 1, profane` | Attack rolls; `(T)` = targetable |
| `AC` | `AC: 2, deflection` | Same bonus type does not stack |
| `SAVE` | `SAVE: 1, FORTITUDE` | Passive save bonus |
| `DMG` / `DMGS` | `DMG: 1, profane` | Weapon / spell damage bonus |
| `SKILL` | `SKILL: -4, concentration` | |
| `CMB` / `CMD` | `CMB: 2` | Maneuver |
| `STR`–`CHA` | `STR: -1d6` | Ability score damage |
| `DR` / `RESIST` | `DR: 5/magic` | Use `!magic` for exceptions |
| `SIZE` | `SIZE: +1` | Size category steps |

**Built-in conditions** (apply as bare names): `Prone`, `Paralyzed`, `Nauseated`, `Sickened`, `Entangled`, `Grappled`, `Invisible`, etc. Each applies its bundled modifiers automatically.

**Conditionals:**

```
IF: TYPE(undead); ATK: 1, profane
IF: TYPE(!undead); CHECK: -3, charisma
IF: FACTION(enemy)
IF: !DYING
```

Components after `IF:` apply only when the check passes. Use separate `IF:` blocks for different recipients.

### Step 3 — BCE components (automation)

Only add when the spell needs **prompted saves**, **ongoing damage**, or **conditional effect application**.

| Tag | Timing | Use for |
|-----|--------|---------|
| `SAVEA` | On apply | Initial save when effect added |
| `SAVES` | Target turn start | Per-round save on **target's** turn |
| `SAVEE` | Target turn end | Per-round save at end of target's turn |
| `SSAVES` | **Source** turn start | Per-round save on **caster's** turn (BCEG) |
| `SSAVEE` | Source turn end | Same, end of caster's turn (BCEG) |
| `SAVEDMG` | On save **fail** | Damage tied to save result |
| `SAVEADD` | On save **fail** | Apply named helper effect |
| `SAVEADDP` | On save **pass** | Apply helper on success |
| `SDMGOS` | Source turn start | Ongoing damage, **not** tied to saves |
| `SDMGOE` | Source turn end | Ongoing damage at source turn end |
| `DMGO` / `DMGOE` | Target turn | Ongoing damage on target's turn |
| `REGENA` / `REGEN` | Apply / turn | Regeneration triggers |
| `(C)` | — | Concentration tracking |

**Save suffix flags** (append to save tag):

| Flag | Meaning |
|------|---------|
| `(R)` | Success **removes** the effect |
| `(D)` | Success **deactivates** (Skip) |
| `(H)` | Half damage on success (with `SAVEDMG`) |
| `(M)` | Magic save (SR interaction) |
| `(F)` | Flip pass/fail for SAVEADD/P |
| `(RA)` | Remove on any save attempt |

**DC shortcuts:** literal `18`, or `[SDC]`, `[SDCWIS]`, `[SDCFORT]` for auto-calculated spell DC.

### Step 4 — AoE / AURA (AoE Effects extension)

Place `AURA:` on the **source** CT entry (creature or marker token):

```
AURA: 20 all,point,fogcloud
AURA: 20 enemy,single
AURA: 20 all,point,red; IF: !DYING
```

| Flag | Meaning |
|------|---------|
| `20` | Radius in feet (grid units) |
| `all` / `enemy` / `ally` / `!self` | Faction filter |
| `single` | Trigger once per entry (not continuous) |
| `once` | One trigger per target per turn/round |
| `sticky` | Effect persists after leaving area |
| `point` | Emanates from token center (fixed cloud) |
| `cube` | Cube area instead of radius |

**Structure:** everything **after** `AURA: …` is copied to targets inside the aura:

```
Stinking Cloud; IF: !DYING; AURA: 20 all,point,fogcloud; SAVEA: 14 FORTITUDE; SAVES: 14 FORTITUDE; SAVEADD: SC Nauseated
```

**Fixed areas** (clouds, desecrate): use a **marker NPC/token** at the center, not the caster.

Faction values supported by this extension's Effect Builder: `ally`, `!ally`, `enemy`, `!enemy`, `friend`, `foe`, `self`, `!self`, `neutral`, `none`.

### Step 5 — Helper effects

Create in **Effects window → Custom Effects** when `SAVEADD`/`SAVEADDP`/`EXPIREADD` needs a named target:

```
SC Nauseated; nauseated; DUR: 1
IB Fail; nauseated; DUR: 1
IB Success; sickened; DUR: 1
```

- Names must match `SAVEADD:` references exactly
- Conditions in helpers: **lowercase** (`nauseated`, not `Nauseated`)
- `DUR: 1` = 1 round duration for round-scoped conditions

### Step 6 — Combat Tracker setup

| Field | Guidance |
|-------|----------|
| **Applied By** | Drag caster onto effect when using `SSAVES`/`SDMGOS` or source-turn timing |
| **Targeting** | `Targets` = effect on victim; `Self` = on caster; marker = aura host |
| **Duration** | Spell duration; `0`/blank = permanent until removed |
| **Active** | On (default) |
| **Expend** | Usually `Action`/`Roll`/`Singles` only for one-shot bonuses |

---

## Decision: standard only vs add BCE

```
Need prompted save roll?
  NO  → standard tags only
  YES → add SAVEA (initial) and/or SAVES/SSAVES (ongoing)

Damage depends on save result?
  YES → SAVEDMG (NOT SDMGOS)
  NO, damage every round → SDMGOS (BCEG) or DMGO

Pass vs fail different conditions?
  YES → helper effects + SAVEADD / SAVEADDP

Fixed area?
  YES → marker token + AURA:
  NO, follows creature → AURA: on creature (no point flag)
```

---

## Critical pitfalls

1. **`SDMGOS` ≠ save-fail damage.** Use `SAVEDMG` when damage triggers on failed save.
2. **`SSAVES` requires BCE Gold** and **Applied By = caster**. Without BCEG, use `SAVES` (runs on target's turn).
3. **Do not combine `(R)` with per-round-only damage** unless success should end the whole spell.
4. **BCE cannot do opposed checks** (STR vs STR trip). Workaround: manual DC from attacker's roll + `SAVEA: [total] FORTITUDE` or ability check reminder in label.
5. **`IF:` after `AURA:`** filters who receives applied components; **`IF:` before `AURA:`** filters source conditions.
6. **Bonus types must differ to stack** — two `profane` bonuses don't combine.
7. **Test in FG** — effect syntax is finicky; verify save prompts, damage, and removal.

---

## BCE / BCEG tag reference

### Save tags

| Tag | When | Example |
|-----|------|---------|
| SAVEA | Effect applied | `SAVEA: 18 FORTITUDE (R) (M)` |
| SAVES | Target turn start | `SAVES: 18 FORTITUDE (R)` |
| SAVEE | Target turn end | `SAVEE: 18 WILL (D)` |
| SSAVES | **Source** turn start (BCEG) | `SSAVES: 18 FORTITUDE (R)` |
| SSAVEE | Source turn end (BCEG) | `SSAVEE: 18 FORTITUDE` |
| SAVEONDMG | When target takes damage | `SAVEONDMG: 18 FORTITUDE (R)` |

### Save-linked effects

| Tag | On fail | On pass |
|-----|---------|---------|
| SAVEDMG | `SAVEDMG: 3d6` | — |
| SAVEADD | `SAVEADD: Helper Name` | — |
| SAVEADDP | — | `SAVEADDP: Helper Name` |

### Ongoing damage / healing

| Tag | Timing |
|-----|--------|
| DMGO / DMGOE | Target turn start / end |
| SDMGOS / SDMGOE | Source turn start / end (BCEG) |
| REGENA | On apply |
| REGEN / REGENE | Target turn start / end |
| SREGENS / SREGENE | Source turn start / end (BCEG) |

### Special

| Tag | Purpose |
|-----|---------|
| (C) | Concentration |
| EXPIREADD | Apply effect when this one expires |
| STACK | Allow duplicate instances |
| DUR: N | Duration in rounds (helpers) |
| DC | Modifier to spell DC |
| SDC | Spell save DC override component |

### Save flags

(R) remove | (D) deactivate | (H) half SAVEDMG | (M) magic | (F) flip | (RA) remove any save

---

## Worked examples

### Passive debuff (standard only)

```
Insidious Rhythm; SAVEA: 14 WILL (R) (M); SKILL: -4, intelligence; SKILL: -4, concentration
```

Host: target. Applied By: caster. Concentration check on cast = manual.

### Per-round save + damage on fail

Helpers:

```
IB Fail; nauseated; DUR: 1
IB Success; sickened; DUR: 1
```

Main:

```
Internal Buffeting; SSAVES: 18 FORTITUDE; SAVEDMG: 3d6; SAVEADD: IB Fail; SAVEADDP: IB Success
```

### Per-round save + always damage (BCEG)

```
Internal Buffeting; SSAVES: 18 FORTITUDE; SDMGOS: 3d6; SAVEADD: IB Fail; SAVEADDP: IB Success
```

### Save ends spell + damage on fail only

```
Clutch of Orcus; (C); Paralyzed; SAVEA: 18 FORTITUDE (R); SSAVES: 18 FORTITUDE (R); SAVEDMG: 1d3
```

### Fixed cloud with entry + round saves

Helper:

```
SC Nauseated; nauseated; DUR: 1
```

Main (marker token at cloud center):

```
Stinking Cloud; IF: !DYING; AURA: 20 all,point,fogcloud; SAVEA: 14 FORTITUDE; SAVES: 14 FORTITUDE; SAVEADD: SC Nauseated
```

### Desecrate area (standard + AURA)

```
Desecrate; AURA: 20 all,point,red; ($) Desecrate; IF: TYPE(undead); ATK: 1, profane; SAVE: 1, profane; DMG: 1, profane; IF: TYPE(!undead); CHECK: -3, charisma
```

Altar variant: double the numeric bonuses.

### Fort save + damage types on fail (no end on save)

Helper:

```
BB Move Limit; DUR: 1
```

Main:

```
Burning Blood; SSAVES: 18 FORTITUDE; SAVEDMG: 1d8, acid; SAVEDMG: 1d8, fire; SAVEADD: BB Move Limit
```

### Trip (STR vs STR) — partial automation

BCE cannot run opposed checks. Manual workflow:

1. Tripper rolls STR check
2. Apply to target: `Trip; SAVEA: [total] FORTITUDE; SAVEADD: Prone`

---

## Output format

When delivering an effect to the user, always include:

1. **Effect string(s)** — main + any helpers
2. **Host** — target, caster, or marker
3. **CT settings table** — Applied By, Duration, Targeting
4. **Component breakdown** — brief per-tag explanation
5. **Manual steps** — anything FG cannot automate

---

## References

- FG wiki: https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996643237/PFRPG+and+3.5E+Effects
- BCE: https://github.com/rhagelstrom/BetterCombatEffects
- Effect Builder: https://forge.fantasygrounds.com/shop/items/457/view
- Effect Builder Plugin 3.5E: https://forge.fantasygrounds.com/shop/items/464/view
- AoE Effects AURA builder: `effect_builder/effects/scripts/AURA.lua`
