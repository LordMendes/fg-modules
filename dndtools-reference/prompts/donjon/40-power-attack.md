# Power Attack Calculator

Read `00-shared.md` first. Implement only this tool. This tool does not roll dice and does not use a seed.

## Catalog

- key: `power-attack`
- label: Power Attack Calculator
- href: `/tools/power-attack`
- description: Find the Power Attack penalty that deals the most expected damage against a target AC.
- source: `PHB`

## Goal

Show expected damage for every legal Power Attack penalty from 0 through BAB, across a band of ACs around the target. Highlight the best penalty for each AC. Two-handed weapons add double the penalty to damage. A natural 1 misses. Threats use a confirm chance.

This is not the Damage Statistic tool. Do not edit `src/lib/damage-statistic/`.

## Input

```ts
type PowerAttackInput = {
  bab: number; // 0-20
  attackMod: number; // -20 to +20, extra to-hit besides BAB (strength, magic, size)
  action: "single" | "full";
  extraAttacks: number; // 0-4, extra attacks at full BAB (haste and similar)
  weaponAverage: number; // average weapon damage including static bonuses except Power Attack
  extraAverage: number; // damage that is not multiplied on a crit (precision, energy)
  threatMin: number; // 11-20, a 19-20 weapon uses 19
  critMultiplier: number; // 2-5
  twoHanded: boolean;
  targetAc: number; // 1-50
  immuneToCrits: boolean;
};
```

Defaults: BAB 6, attack mod +0, full attack, 0 extra attacks, weapon average 8, extra average 0, threat 20, crit x2, not two-handed, AC 15, not immune.

Iterative attack count, before the single-attack choice: `Math.max(1, Math.floor((bab - 1) / 5) + 1)`. If action is `single`, use 1 attack. Disable the action select when that count is 1. Extra attacks always use the first attack's bonus (iteration index 0).

## Expected damage

Implement `expectedDamage(input)` in `src/lib/power-attack/expected.ts`.

For penalty `p` from 0 through `bab`:

- Damage bonus from Power Attack is `p * (twoHanded ? 2 : 1)`.
- Normal hit damage `atD = weaponAverage + damageBonus + extraAverage`.
- Crit damage `crD = (weaponAverage + damageBonus) * critMultiplier + extraAverage`. If `immuneToCrits` is on, the multiplier is 1, so `crD` equals `(weaponAverage + damageBonus) + extraAverage`.

For each iterative attack `i` in `0 .. N-1` and each extra attack:

- Attack bonus `atb = bab - i * 5 + attackMod - p`.
- Confirm faces `crt = 21 - (targetAc - atb)`, clamped to 1..19.
- Confirm-weighted damage `ctD = (crt * crD + (20 - crt) * atD) / 20`.

Average over the d20, then divide by 20 (the natural 1 is an automatic miss and is not inside the loop):

- For `d20` from 2 through 20:
  - If `d20 === 20`, add `ctD`.
  - Else if `d20 + atb >= targetAc` and `d20 >= threatMin`, add `ctD`.
  - Else if `d20 + atb >= targetAc`, add `atD`.
- Attack contribution is that sum divided by 20.

Sum every attack. That is the expected damage for penalty `p` against `targetAc`.

Build a table:

- Rows: penalty 0 through BAB.
- Columns: AC from `targetAc - 5` through `targetAc + 5` (11 columns).
- Cell text: expected damage with two decimal places (`8` renders `8.00`, `8.5` renders `8.50`).
- For each column, the highest damage cell is the optimum. Ties keep the smallest penalty. Mark that cell.

## UI

Live update. No Generate button. Any input change recomputes.

- BAB select +0 through +20. Show the iterative count as read-only text: "Attacks: 2".
- Additional modifiers: number input, step 1.
- Action select.
- Extra attacks: number 0-4.
- Weapon damage average: number. Optional dice field beside it. If the user types `1d8+3`, fill the average from `averageExpression` in `src/lib/dice/roll-expression.ts`. If that module does not exist yet, inline a small average for `NdM+K` only, and leave a comment that treasure's parser should replace it.
- Additional dice / average, same treatment. Label: "Extra damage (not multiplied on a crit)".
- Critical threat select: 20, 19-20, 18-20, down to 11-20.
- Critical multiplier select: x2, x3, x4, x5.
- Checkbox "Two-handed weapon".
- Target AC number.
- Checkbox "Immune to critical hits".

Table: first column is the penalty as `-0`, `-1`, and so on. Optimum cells use a modifier class `.power-attack-opt` (background from the existing accent variable, not a new hex). Header: "Power Attack" spanning the penalty column, "Target AC" spanning the AC columns.

Wrap the table in `overflow-x: auto`.

Class prefix: `.power-attack`.

## Tests

- BAB 1, single attack, average 10, extra 0, threat 20, crit x2, AC 10, mod 0, not two-handed: penalty 0 expected damage is greater than penalty 1 (hitting is already easy, trading to-hit hurts). Write the assertion against the function, not a hand-computed float beyond two decimals. Compare the rounded two-decimal strings.
- Two-handed at penalty 2 adds 4 to the weapon average before the hit chance, not 2. Assert `expectedDamage` at a very low AC (so hit chance stays near the cap) is higher for two-handed than one-handed by about 2 points of damage times hit rate. Use AC 5, BAB 6, attack mod +10 so both still hit on almost every die, and assert the two-handed row at p=2 exceeds the one-handed row.
- Immune to crits with threat 15 and multiplier x4 equals multiplier x2 with the immune flag off only when both are forced to multiplier 1. Assert immune x4 equals a call with multiplier 1 and immune off, for the same other inputs.
- Natural 1 path: attack bonus high enough that d20=2 always hits. Expected damage is at most `0.95 * crD + something` wait, simpler: expected damage for one attack is strictly less than `atD` when threat is 20, crit is x2, and AC is so low that every d20 from 2 to 19 hits and 20 threatens. The miss on 1 means the value is below the always-hit figure `(19/20)*atD + (1/20)*ctD`. Assert it is less than `atD`.

## Acceptance

- Page matches the shared shell.
- The optimum cell moves when AC or two-handed changes.
- Tests and typecheck pass.

## Suggested commit

`feat(power-attack): add expected damage calculator`
