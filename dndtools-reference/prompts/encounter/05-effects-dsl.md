# 05. Effects DSL

Effects are free-text strings in the Fantasy Grounds 3.5E style. The DM or player types (or picks a preset), the server parses into `EffectComponent[]`, the engine reads components. The raw string is always kept and shown.

Grammar file: `src/lib/combat/effects/grammar.ts`. Parser: `parseEffect.ts`. Tests are mandatory for every example below.

## Syntax

```
effect      := clause (";" clause)*
clause      := label | tagClause | condition
tagClause   := TAG ":" value? descriptor*
label       := any text without ":" that is not a known condition (first clause only, or clauses without a tag)
condition   := known condition name, case-insensitive (Prone, Stunned, ...)
value       := signed integer | dice ("1d6", "2d6+2")
descriptor  := bonus type | damage type | attack type | save type | "vs" descriptor | "crit" | "opportunity" | "range" | "melee"
```

Whitespace is trimmed. Case-insensitive tags and descriptors. Unknown descriptors are kept as text descriptors and ignored by the engine (logged in a dev warning, not an error).

Examples the parser must accept:

| String | Components |
|---|---|
| `Bless; ATK: 1 morale; SAVE: 1 morale vs fear` | LABEL Bless, ATK +1 morale, SAVE +1 morale [vs fear] |
| `Mage Armor; AC: 4 armor` | LABEL, AC +4 armor |
| `Haste; ATK: 1; AC: 1 dodge; REF: 1 dodge; SPEED: 30` | ATK +1 untyped, AC +1 dodge, REF +1 dodge, SPEED +30 |
| `Prone` | COND prone |
| `Stunned; Flat-footed` | COND stunned, COND flatFooted |
| `Shaken` | COND shaken (engine expands to ATK -2, SAVE -2, SKILL -2) |
| `Bull's Strength; STR: 4 enhancement` | ABIL str +4 enhancement |
| `Stoneskin; DR: 10 adamantine` | DR 10 bypass [adamantine] |
| `Resist Energy; RESIST: 10 fire` | RESIST 10 [fire] |
| `Protection from Energy; IMMUNE: fire` | IMMUNE [fire] |
| `Troll; REGEN: 5 fire acid` | REGEN 5 bypass [fire, acid] |
| `FHEAL: 3` | FHEAL 3 |
| `Flaming; DMG: 1d6 fire` | DMG 1d6 [fire] |
| `Sneak Attack; DMG: 3d6 precision melee` | DMG 3d6 [precision] descriptor melee |
| `Acid Arrow; DMGO: 2d4 acid` | DMGO 2d4 [acid] |
| `Power Attack; ATK: -2 melee; DMG: 4 melee` | ATK -2 [melee], DMG +4 [melee] |
| `Cover; COVER` | COVER (engine: AC +4, REF +2) |
| `Blur; CONC` | CONC (20% miss chance) |
| `Invisible` | COND invisible (attacker gets ATK +2, target loses Dex to AC when attacker invisible; TCONC vs attackers without see invisibility) |
| `CL: 2` | CL +2 |
| `INIT: 4` | INIT +4 |
| `Dying`, `Dead`, `Stable`, `Disabled` | system conditions, created by `rules/death.ts` |

## Tags

| Tag | Applies to | Value | Descriptors |
|---|---|---|---|
| `ATK` | attacker's attack rolls | int | bonus type, `melee` / `ranged` / `grapple` / `touch`, `opportunity`, `crit` (confirm only) |
| `AC` | target's AC | int | bonus type, `melee` / `ranged`, `touch` (also applies to touch), `flatfooted` |
| `SAVE` | all saves | int | bonus type, `vs <descriptor>` (fear, poison, spell, enchantment, ...) |
| `FORT` `REF` `WILL` | one save | int | bonus type, `vs` |
| `INIT` | initiative | int | bonus type |
| `CL` | caster level | int | |
| `SKILL` | skill checks (display only in Phase 0) | int | skill name |
| `SPEED` | speed (display only) | int | |
| `ABIL` shorthand `STR DEX CON INT WIS CHA` | ability mod recalculation | int | bonus type |
| `DMG` | attacker's damage | int or dice | damage types, `melee` / `ranged`, `crit` |
| `DMGO` | ongoing damage to target at start of turn | dice | damage types |
| `DR` | target | int | bypass types (`-` or none means no bypass) |
| `RESIST` | target | int | damage types (required) |
| `IMMUNE` | target | none | damage types or `crit`, `precision`, `nonlethal` |
| `VULN` | target | none | damage types |
| `REGEN` | target, per round, cannot die from bypassed damage | int | bypass types |
| `FHEAL` | target, per round | int | |
| `CONC` `TCONC` | target (attacker suffers 20% / 50% miss chance) | none | |
| `COVER` `SCOVER` | target (+4 AC +2 REF / +8 AC +4 REF) | none | |

## Bonus types (3.5e)

`alchemical armor circumstance competence deflection dodge enhancement insight luck morale natural profane racial resistance sacred shield size` plus untyped when absent.

Stacking rule (`rules/modifiers.ts`):

- Bonuses of the same named type: take the highest.
- `dodge`, `circumstance` and untyped bonuses stack.
- Penalties always stack, regardless of type.
- Compute per tag per descriptor match. Return itemized parts for the log tooltip.

## Damage types

`slashing piercing bludgeoning fire cold acid electricity sonic force positive negative magic epic adamantine silver coldiron good evil lawful chaotic nonlethal precision spell`.

Alias table: `elec` = electricity, `cold iron` = coldiron, `holy` = good, `unholy` = evil, `axiomatic` = lawful, `anarchic` = chaotic, `bludgeon` = bludgeoning, `pierce` = piercing, `slash` = slashing.

## Conditions and their engine expansion

Preset strings live in `effects/presets.ts` and are what the "Add condition" picker inserts. The engine reads `COND` components and applies these rules (`rules/engineContext.ts`):

| Condition | Effect in engine |
|---|---|
| Blinded | AC: loses Dex bonus; attackers get +2 (treated as flat-footed vs them); 50% miss chance on own attacks (TCONC on all targets) |
| Cowering | loses Dex to AC, AC -2, cannot act |
| Dazed | cannot act (turn skip prompt) |
| Dazzled | ATK -1 |
| Deafened | INIT -4 |
| Disabled | system; single action; taking a standard action deals 1 damage (manual) |
| Dying | system; hp -1 to -9; stabilize prompt |
| Dead | system; skipped in turn order, removed from targeting by default |
| Entangled | ATK -2, DEX -4 |
| Exhausted | STR -6, DEX -6, speed half |
| Fascinated | display only |
| Fatigued | STR -2, DEX -2 |
| Flat-footed | loses Dex and dodge to AC, target `acFlat` used |
| Frightened | ATK -2, SAVE -2, SKILL -2 |
| Grappled | loses Dex to AC vs non-grapplers (approximation: loses dodge), ATK -4 to others |
| Helpless | treated as flat-footed, Dex 0 to AC, melee attackers get +4 (ATK +4 melee vs), coup de grace manual |
| Incorporeal | IMMUNE nonmagical (applies as: physical damage without `magic` ignored; 50% vs magic non-force) |
| Invisible | attacker: ATK +2; defender: TCONC unless attacker has See Invisibility effect label |
| Nauseated | cannot act except move |
| Panicked | as Frightened |
| Paralyzed | Helpless |
| Petrified | Helpless, immune to most |
| Pinned | Helpless vs grappler approximation |
| Prone | melee attackers +4, ranged attackers -4, own melee ATK -4, cannot use ranged except crossbow (manual) |
| Shaken | ATK -2, SAVE -2, SKILL -2 |
| Sickened | ATK -2, DMG -2, SAVE -2, SKILL -2 |
| Stable | system, no stabilize prompt |
| Staggered | display only |
| Stunned | AC -2, loses Dex to AC, drops items (manual) |
| Turned | display only |
| Unconscious | Helpless |

"Loses Dex to AC" means the engine uses `acFlat` for that target instead of `ac` when it exists, and otherwise subtracts the positive Dex modifier (from `stats.dex`) if available. Apply the same reasoning to `flat-footed`. Do not stack the two.

Existing `src/lib/pc-planner/conditions.ts` covers five presets for the PC sheet. Phase 0 makes `presets.ts` the single table and re-exports what the PC sheet needs (`CONDITION_PRESETS` becomes derived from it) so the sheet and tracker never drift.

## Duration

- `duration` counts `durationUnit`s. Rounds decrement by 1 on each tick; minutes by 1 every 10 rounds (track `elapsedRounds` inside `components` metadata) or, simpler and FG-like, convert minutes/hours/days to rounds on creation (`1 minute = 10 rounds`) and store rounds. Choose the conversion approach; document it in code.
- Tick happens when the actor whose `init` equals `tickInit` starts their turn (`expiry = startOfTurn`) or ends it (`endOfTurn`). `tickInit` defaults to the **source** combatant's init at creation (FG behavior) so a spell cast on round 1 at the caster's init lasts exactly N rounds regardless of the target's init. If no source, default to the target.
- When duration reaches 0 the effect is removed and an `effectExpire` event is written.
- `duration = null` means until removed.
- Delay or ready changes the source's init; effects keep their original `tickInit`.

## Apply modes

- `all` (default): applies to every roll.
- `once`: applies to the first roll it matches, then is removed (FG "Once"). Phase 0 supports `all` and `once`; `roll` and `single` parse but behave as `all` with a dev warning.

## Formatting

`formatEffect(components)` reproduces a canonical string (`Bless; ATK: 1 morale; SAVE: 1 morale vs fear`). Row chips show the label part (first LABEL or the first condition), the duration (`3r`), and a tooltip with the full string and source. Log lines use the canonical string.
