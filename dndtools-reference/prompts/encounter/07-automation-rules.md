# 07. Automation rules (3.5e math the engine must implement)

Each rule has a function in `src/lib/combat/rules/*` and a unit test. When FG and the SRD differ, follow FG 3.5E CT behavior (noted).

## Initiative (`rules/initiative.ts`)

- `init = d20 + initMod + sum(INIT effects)`.
- Tiebreak: store `init + initMod / 100` in the Float column (FG sorts ties by init modifier). Manual edits store the typed value as-is.
- Order: desc by `init`. Rows with `turnState = dead` or `removed` are skipped by "Next actor" but stay listed (grayed) until removed.
- **Delay:** `turnState = delayed`, row moves out of order; "Act now" sets `init = currentActorInit - 0.01` and `turnState = normal`, then makes it the active actor.
- **Ready:** `turnState = readied`; "Trigger" acts like Act now but then the row keeps its new init.
- Round increments when the active actor wraps from the lowest to the highest init.

## Turn boundaries (`rules/turn.ts`)

On `turnStart(actor)`:

1. Write `turnStart` event.
2. Tick effects where `tickInit == actor.init` and `expiry = startOfTurn`: decrement, expire at 0 (`effectExpire` event).
3. Apply `DMGO` components on the actor as damage packets (source: effect label).
4. Apply `REGEN` and `FHEAL` on the actor: heal `amount` wounds (regen cannot heal damage that was marked lethal by bypass types; track `lethalWounds` in `stats` if the creature has regen). Write `regen` event.
5. If actor is dying: prompt stabilize (DM roll d% 10%). Do not auto-roll; FG leaves this manual. Provide a "Stabilize check" button on the row while dying.

On `turnEnd(actor)`:

1. Tick `endOfTurn` effects for `tickInit == actor.init`.
2. Clear `pendingTargetIds` and `pendingCrit` for the actor.
3. Write `turnEnd` event.

## Attack (`rules/attack.ts`)

Inputs: attacker ctx, target ctx, attack line (`name`, `bonus`, `mode`, `threatMin`, `critMultiplier`, `attackType`), d20 face, ad hoc modifiers.

```
attackBonus = line.bonus
            + sum(ATK effects matching attackType and "vs" descriptors)
            + conditionMods(attacker)            // prone melee -4, shaken -2, ...
            + situational(attacker, target)      // invisible +2, target helpless melee +4, target prone melee +4 / ranged -4
            + adhoc
total = face + attackBonus
acType = attackType in (mtouch, rtouch) ? "touch" : targetLosesDex(target) ? "flat" : "normal"
acValue = target.ac[acType] + sum(AC effects matching acType/attackType) + cover(target)
hit = face == 20 ? true : face == 1 ? false : total >= acValue
threat = hit && face >= line.threatMin (default 20)
```

Concealment: if the target has `CONC` (20%) or `TCONC` (50%), or the attacker is blinded, roll d% as part of the same request; if `roll <= missChance` the attack misses regardless of total. Log `[CONCEALMENT MISS]`.

Iterative attacks: one face per bonus in `iterativeModifiers`, resolve each against every target in order (FG resolves against the dropped target only; we resolve all current targets and mark each).

Grapple: `attackType = grapple` rolls `bonus + adhoc` only and logs the total; no auto compare (target grapple bonus is not in the row). Phase 0 logs it as `[GRAPPLE]`.

Outputs per target: `AttackEventPayload`. Side effects: on any hit, add the target id to `attacker.pendingTargetIds`; on threat, set `attacker.pendingCrit = { multiplier, threatFace, attackName }`.

## Critical confirmation (`rules/critical.ts`)

- Confirm roll: same bonus computation plus `ATK ... crit` components; hit if `total >= acValue` or face 20 (face 1 auto fails).
- On confirmed crit: keep `pendingCrit`; on failure: clear it and log `[CRITICAL MISS]` (FG wording: threat not confirmed). The damage button label updates accordingly.
- Targets with `IMMUNE: crit` never confirm; log `[IMMUNE TO CRITICAL]`.
- Damage on confirmed crit: multiply base weapon dice and static modifiers by `multiplier` (existing `applyCriticalDamage`), add `critOnlyDice` once, do **not** multiply `DMG` effect components tagged `precision` or extra energy dice (flaming burst style dice are extra, added once).

## Damage (`rules/damage.ts`)

Inputs: packets (one per damage type group), target ctx, flags `{ half?: boolean, nonlethal?: boolean }`.

Order of operations per target, matching FG 3.5E:

1. If `half`: halve total (round down, minimum 1 unless total is 0).
2. `IMMUNE` types: a packet is dropped when an energy or alignment immunity matches **any** of its types (`fire, magic` vs `IMMUNE: fire` -> dropped), or when **all** of its physical types (`slashing`, `piercing`, `bludgeoning`) are immune (`slashing, magic` vs `IMMUNE: slashing` -> dropped; `slashing, piercing` vs `IMMUNE: slashing` -> kept). Qualifier types such as `magic`, `adamantine`, `silver`, `coldiron` and alignments never count as physical types for this check. Document the choice in code and tests.
3. `precision` packets vs targets immune to precision (`IMMUNE: precision`, or conditions like incorporeal): dropped.
4. `VULN` types: x1.5 on matching packets (round down).
5. `RESIST` per type: subtract the resist amount from matching packets (per packet, not per type, FG style: the largest matching resist applies once per packet).
6. `DR`: applies once to the sum of **physical** packets (`slashing`, `piercing`, `bludgeoning`, or packets with no energy type). Skip DR if any packet type is in `bypass` (`magic`, `adamantine`, alignment, material, `epic`). `DR n/-` never bypassed. When multiple DR entries exist, apply the one that is not bypassed with the highest amount.
7. Total remaining `applied`. If `nonlethal` flag or type: add to `target.nonlethal`; else: subtract from `hpTemp` first, then add to `wounds`.
8. Compute new HP and death state (below). Write `damage` event with itemized `adjustments`.

Minimum damage after adjustments is 0. Never negative. Never heal via damage.

## Healing (`rules/healing.ts`)

- `heal(amount)`: `wounds = max(0, wounds - amount)`. Also reduce `nonlethal` by the same amount (3.5e: healing removes an equal amount of nonlethal). Cannot exceed `hpMax`.
- `tempHp(amount)`: `hpTemp = max(hpTemp, amount)` (does not stack; FG takes the higher).
- `healNonlethal(amount)`: only reduces nonlethal.
- Healing a dead creature does nothing unless the DM uses "Set HP" (raise dead is manual).
- Positive energy on undead: out of scope in Phase 0; log a note if the target has `IMMUNE: positive`.

## Death and dying (`rules/death.ts`)

```
hp = hpMax - wounds
if hp <= -10 or (massiveDamage flag from a single hit >= 50 and failed Fort DC 15): state = dead
else if hp < 0: state = dying   (unless already stable -> stable)
else if hp == 0: state = disabled
else: state = null
nonlethal >= hp (and hp > 0): unconscious condition applied (system effect "Unconscious")
nonlethal == hp: staggered
```

- The engine writes or replaces **system** effects `Dying`, `Stable`, `Disabled`, `Dead`, `Unconscious`, `Staggered` (only one of the first four at a time). Removing them manually is allowed (DM adjudication) and logged.
- `Dead` sets `turnState = dead`; the row stays until the DM removes it or uses "Remove dead NPCs". PCs are never auto-removed.
- Dying creatures lose 1 hp per round at their turn start (`turnStart` step) until stable or dead. FG leaves this manual; we automate it but log `[DYING] -1` and provide a Stabilize button. Massive damage requires a save; Phase 0 logs `[MASSIVE DAMAGE] Fort DC 15 required` and lets the DM roll the save from the row; the auto-death applies only when that save is rolled and fails.

## Health bands (`healthStatus.ts`, extend)

FG 3.5E bands by percentage of `hpMax` against `wounds + nonlethal`:

| Remaining | Band |
|---|---|
| 100% | Healthy |
| 75% to 99% | Light |
| 50% to 74% | Moderate |
| 25% to 49% | Heavy |
| 1% to 24% | Critical |
| 0 or negative, not dead | Dying |
| dead | Dead |

Keep the old names as aliases only if something else imports them; otherwise migrate call sites.

## Saves (`rules/saves.ts`)

```
bonus = target.saves[type]
      + sum(SAVE effects matching "vs" descriptors of the source)
      + sum(FORT/REF/WILL effects for the type)
      + conditionMods (shaken -2, sickened -2, ...)
      + adhoc
total = face + bonus
success = total >= dc
```

3.5e has no automatic success or failure on saving throws (unlike attacks). The payload keeps `face` so the log can show a natural 20 or 1 badge, but it never changes the outcome.

Consequence handling (Phase 1 wiring, Phase 0 engine): `{ onFail: "damage" | "effect" | "both", onSuccess: "half" | "negate" }`. Helpless or paralyzed targets do not auto-fail Reflex saves in the SRD; do not special-case them.

## Spell resistance (`rules/spellResistance.ts`)

`total = d20 + casterLevel + sum(CL effects)`; success when `total >= target.sr`. On failure the spell has no effect on that target; log `[SR] 14 vs 18 [RESISTED]`. Spells with `srnotallowed` skip this.

## Save DC (`spells/dc.ts`, Phase 1)

`dc = 10 + spellLevel + castingStatMod + featMods (from PC sheet) + sum(effects tagged "DC")` (add `DC` tag to the grammar in Phase 1). NPC spells use `snapshot`/`stats` for the stat mod when present, else the DC parsed from the stat block text.

## Dice scaling (`spells/scaling.ts`, Phase 1)

`SpellDamageAction.dicestat = "cl"` : dice count = min(CL, `dicestatmax`); `"halfcl"` : floor(CL/2), min 1, capped. Static `bonus` added once.

## Modifier itemization

Every resolution returns `modifiers: { label, value }[]` used by the log tooltip, for example:

```
Base +9
Bless (morale) +1
Prone target (melee) +4
Shaken -2
Ad hoc -2
```

## Rounding

Integer arithmetic. Halving rounds down. Vulnerability x1.5 rounds down. Never produce NaN; guard every parsed number with `Number.isFinite`.
