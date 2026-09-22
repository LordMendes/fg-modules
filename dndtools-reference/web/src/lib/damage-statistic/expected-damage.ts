import { parseDamageType } from "@/lib/combat/effects/grammar";
import type { DamageType } from "@/lib/combat/types";
import type { DicePoolItem } from "@/lib/dice/types";
import {
  applyCriticalDamage,
  computeWeaponAttackRows,
  type WeaponAttackRow,
} from "@/lib/pc-planner/weaponAttacks";
import { inventoryMagicDamageBonus } from "@/lib/pc-planner/inventoryItem";
import type { InventoryRow } from "@/lib/pc-planner/types";
import { buildSyntheticPcPlanState } from "./attacker-state";
import type {
  AcCompareRow,
  AcDamageRow,
  DamageStatisticComparison,
  DamageStatisticInput,
  DamageStatisticResult,
  DrEntry,
  ParsedDrEntry,
} from "./types";

type ProbabilityMap = Map<number, number>;

function clampHitChance(value: number): number {
  return Math.min(0.95, Math.max(0.05, value));
}

/** 3.5 d20 hit chance with natural 1 miss and natural 20 hit floors. */
export function hitChanceVsAc(attackBonus: number, ac: number): number {
  const needed = ac - attackBonus;
  return clampHitChance((21 - needed) / 20);
}

export function threatChance(threatMin: number): number {
  const min = Math.max(1, Math.min(20, Math.trunc(threatMin)));
  return (21 - min) / 20;
}

function diceAverage(dice: DicePoolItem[]): number {
  return dice.reduce((sum, die) => sum + (die.qty * (die.sides + 1)) / 2, 0);
}

function singleDieDistribution(sides: number): ProbabilityMap {
  const map: ProbabilityMap = new Map();
  for (let face = 1; face <= sides; face += 1) {
    map.set(face, 1 / sides);
  }
  return map;
}

function convolve(a: ProbabilityMap, b: ProbabilityMap): ProbabilityMap {
  const result: ProbabilityMap = new Map();
  for (const [valueA, probA] of a) {
    for (const [valueB, probB] of b) {
      const total = valueA + valueB;
      result.set(total, (result.get(total) ?? 0) + probA * probB);
    }
  }
  return result;
}

function distributionFromDice(dice: DicePoolItem[]): ProbabilityMap {
  let dist: ProbabilityMap = new Map([[0, 1]]);
  for (const die of dice) {
    const dieDist = singleDieDistribution(die.sides);
    const repeated = Array.from({ length: die.qty }, () => dieDist).reduce(
      (acc, next) => convolve(acc, next),
      new Map([[0, 1]]),
    );
    dist = convolve(dist, repeated);
  }
  return dist;
}

function addModifier(dist: ProbabilityMap, modifier: number): ProbabilityMap {
  if (modifier === 0) return dist;
  const next: ProbabilityMap = new Map();
  for (const [value, prob] of dist) {
    next.set(value + modifier, prob);
  }
  return next;
}

function expectedAfterDr(dist: ProbabilityMap, drAmount: number): number {
  let total = 0;
  for (const [value, prob] of dist) {
    total += prob * Math.max(0, value - drAmount);
  }
  return total;
}

function physicalDamageTypes(
  weapon: InventoryRow,
  primaryType: string | null,
): DamageType[] {
  const types: DamageType[] = [];
  const raw = (primaryType ?? weapon.damageType ?? "").trim();
  if (raw) {
    const upper = raw.toUpperCase();
    if (upper === "S") types.push("slashing");
    else if (upper === "P") types.push("piercing");
    else if (upper === "B") types.push("bludgeoning");
    else {
      const parsed = parseDamageType(raw);
      if (parsed) types.push(parsed);
    }
  }
  if ((weapon.enhancementBonus ?? 0) > 0 || inventoryMagicDamageBonus(weapon) > 0) {
    if (!types.includes("magic")) types.push("magic");
  }
  return types;
}

export function parseDrEntries(entries: DrEntry[]): ParsedDrEntry[] {
  return entries
    .filter((entry) => entry.amount > 0)
    .map((entry) => ({
      amount: entry.amount,
      bypass:
        entry.bypass === "-"
          ? []
          : ([parseDamageType(entry.bypass)].filter(Boolean) as DamageType[]),
    }));
}

function selectEffectiveDr(
  physicalTypes: DamageType[],
  drEntries: ParsedDrEntry[],
): number {
  if (drEntries.length === 0) return 0;
  const typeSet = new Set(physicalTypes);
  let best = 0;
  for (const entry of drEntries) {
    const neverBypassed = entry.bypass.length === 0;
    const bypassed =
      !neverBypassed &&
      entry.bypass.some((bypassType) => typeSet.has(bypassType));
    if (!bypassed && entry.amount > best) {
      best = entry.amount;
    }
  }
  return best;
}

function expectedPhysicalAfterDr(
  dice: DicePoolItem[],
  modifier: number,
  drAmount: number,
): number {
  if (drAmount <= 0) {
    return diceAverage(dice) + modifier;
  }
  const dist = addModifier(distributionFromDice(dice), modifier);
  return expectedAfterDr(dist, drAmount);
}

function expectedDamageComponents(
  row: WeaponAttackRow,
  weapon: InventoryRow,
  drEntries: ParsedDrEntry[],
  damageModifier: number,
): { normal: number; crit: number } {
  const physicalTypes = physicalDamageTypes(weapon, row.damageType);
  const drAmount = selectEffectiveDr(physicalTypes, drEntries);

  const physicalNormal = expectedPhysicalAfterDr(
    row.damageDice,
    damageModifier,
    drAmount,
  );
  const energyNormal = diceAverage(row.extraDamageDice);

  const critScaled = applyCriticalDamage(
    row.damageDice,
    damageModifier,
    row.critMultiplier,
  );
  const physicalCrit = expectedPhysicalAfterDr(
    critScaled.dice,
    critScaled.modifier,
    drAmount,
  );
  const energyCrit =
    energyNormal + diceAverage(row.critOnlyDice);

  return {
    normal: physicalNormal + energyNormal,
    crit: physicalCrit + energyCrit,
  };
}

export function expectedDamageForAttack(
  attackBonus: number,
  ac: number,
  row: WeaponAttackRow,
  weapon: InventoryRow,
  drEntries: ParsedDrEntry[],
  damageModifier: number,
): number {
  const pHit = hitChanceVsAc(attackBonus, ac);
  const pCrit = threatChance(row.threatMin) * pHit;
  const { normal, crit } = expectedDamageComponents(
    row,
    weapon,
    drEntries,
    damageModifier,
  );
  return (pHit - pCrit) * normal + pCrit * crit;
}

export function computeDamageStatistic(
  input: DamageStatisticInput,
): DamageStatisticResult | null {
  const { state, combatStats } = buildSyntheticPcPlanState(
    input.attacker,
    input.weapon,
    input.pcSource,
  );
  const rows = computeWeaponAttackRows(state, combatStats);
  const weaponRow = rows[0];
  if (!weaponRow) return null;

  const drEntries = parseDrEntries(input.target.dr);
  const acMin = Math.min(input.target.acMin, input.target.acMax);
  const acMax = Math.max(input.target.acMin, input.target.acMax);

  const tableRows: AcDamageRow[] = [];
  for (let ac = acMin; ac <= acMax; ac += 1) {
    const firstBonus =
      weaponRow.fullAttackBonuses[0] ?? weaponRow.standardBonuses[0] ?? weaponRow.attackBonus;
    const hitChance = hitChanceVsAc(firstBonus, ac);

    const standardDamage = weaponRow.standardBonuses.reduce(
      (sum, bonus) =>
        sum +
        expectedDamageForAttack(
          bonus,
          ac,
          weaponRow,
          input.weapon,
          drEntries,
          weaponRow.damageModifier,
        ),
      0,
    );

    const fullAttackDamage = weaponRow.fullAttackBonuses.reduce(
      (sum, bonus) =>
        sum +
        expectedDamageForAttack(
          bonus,
          ac,
          weaponRow,
          input.weapon,
          drEntries,
          weaponRow.fullAttackDamageModifier,
        ),
      0,
    );

    tableRows.push({
      ac,
      hitChance,
      standardDamage,
      fullAttackDamage,
    });
  }

  return {
    weaponSummary: weaponRow.summary,
    rows: tableRows,
  };
}

export function compareDamageStatistics(
  inputA: DamageStatisticInput,
  inputB: DamageStatisticInput,
): DamageStatisticComparison | null {
  const a = computeDamageStatistic(inputA);
  const b = computeDamageStatistic(inputB);
  if (!a || !b) return null;

  const byAcB = new Map(b.rows.map((row) => [row.ac, row]));
  const rows: AcCompareRow[] = [];
  for (const rowA of a.rows) {
    const rowB = byAcB.get(rowA.ac);
    if (!rowB) continue;
    rows.push({
      ac: rowA.ac,
      a: rowA,
      b: rowB,
      standardDelta: rowB.standardDamage - rowA.standardDamage,
      fullAttackDelta: rowB.fullAttackDamage - rowA.fullAttackDamage,
    });
  }

  return { a, b, rows };
}

export function formatExpectedDamage(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function formatExpectedDelta(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return "0";
  const formatted = formatExpectedDamage(Math.abs(rounded));
  return rounded > 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatHitChance(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}
