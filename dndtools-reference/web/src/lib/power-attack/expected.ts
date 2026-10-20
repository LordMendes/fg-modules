export type PowerAttackInput = {
  bab: number;
  attackMod: number;
  action: "single" | "full";
  extraAttacks: number;
  weaponAverage: number;
  extraAverage: number;
  threatMin: number;
  critMultiplier: number;
  twoHanded: boolean;
  targetAc: number;
  immuneToCrits: boolean;
};

export const DEFAULT_POWER_ATTACK_INPUT: PowerAttackInput = {
  bab: 6,
  attackMod: 0,
  action: "full",
  extraAttacks: 0,
  weaponAverage: 8,
  extraAverage: 0,
  threatMin: 20,
  critMultiplier: 2,
  twoHanded: false,
  targetAc: 15,
  immuneToCrits: false,
};

export type PowerAttackCell = {
  ac: number;
  expected: number;
  isOptimum: boolean;
};

export type PowerAttackRow = {
  penalty: number;
  cells: PowerAttackCell[];
};

export type PowerAttackTable = {
  acColumns: number[];
  rows: PowerAttackRow[];
};

export function iterativeAttackCount(bab: number): number {
  return Math.max(1, Math.floor((bab - 1) / 5) + 1);
}

export function attackIterationIndices(input: PowerAttackInput): number[] {
  const iterCount = iterativeAttackCount(input.bab);
  if (input.action === "single") {
    return [0];
  }
  const indices: number[] = [];
  for (let i = 0; i < iterCount; i += 1) {
    indices.push(i);
  }
  for (let extra = 0; extra < input.extraAttacks; extra += 1) {
    indices.push(0);
  }
  return indices;
}

export function formatPowerAttackDamage(value: number): string {
  return value.toFixed(2);
}

function effectiveCritMultiplier(input: PowerAttackInput): number {
  return input.immuneToCrits ? 1 : input.critMultiplier;
}

function attackBonus(input: PowerAttackInput, penalty: number, iteration: number): number {
  return input.bab - iteration * 5 + input.attackMod - penalty;
}

function confirmFaces(targetAc: number, attackBonusValue: number): number {
  const raw = 21 - (targetAc - attackBonusValue);
  return Math.min(19, Math.max(1, raw));
}

function expectedDamageForOneAttack(
  input: PowerAttackInput,
  penalty: number,
  iteration: number,
  targetAc: number,
): number {
  const damageBonus = penalty * (input.twoHanded ? 2 : 1);
  const atD = input.weaponAverage + damageBonus + input.extraAverage;
  const critMult = effectiveCritMultiplier(input);
  const crD =
    (input.weaponAverage + damageBonus) * critMult + input.extraAverage;

  const atb = attackBonus(input, penalty, iteration);
  const crt = confirmFaces(targetAc, atb);
  const ctD = (crt * crD + (20 - crt) * atD) / 20;

  let sum = 0;
  for (let d20 = 2; d20 <= 20; d20 += 1) {
    if (d20 === 20) {
      sum += ctD;
    } else if (d20 + atb >= targetAc && d20 >= input.threatMin) {
      sum += ctD;
    } else if (d20 + atb >= targetAc) {
      sum += atD;
    }
  }
  return sum / 20;
}

export function expectedDamage(
  input: PowerAttackInput,
  penalty: number,
  targetAc: number = input.targetAc,
): number {
  const iterations = attackIterationIndices(input);
  let total = 0;
  for (const iteration of iterations) {
    total += expectedDamageForOneAttack(input, penalty, iteration, targetAc);
  }
  return total;
}

export function buildPowerAttackTable(input: PowerAttackInput): PowerAttackTable {
  const acColumns: number[] = [];
  for (let ac = input.targetAc - 5; ac <= input.targetAc + 5; ac += 1) {
    acColumns.push(ac);
  }

  const rows: PowerAttackRow[] = [];
  for (let penalty = 0; penalty <= input.bab; penalty += 1) {
    const cells = acColumns.map((ac) => ({
      ac,
      expected: expectedDamage(input, penalty, ac),
      isOptimum: false,
    }));
    rows.push({ penalty, cells });
  }

  for (let col = 0; col < acColumns.length; col += 1) {
    let best = -Infinity;
    for (const row of rows) {
      best = Math.max(best, row.cells[col]!.expected);
    }
    let bestPenalty = Infinity;
    for (const row of rows) {
      if (row.cells[col]!.expected === best) {
        bestPenalty = Math.min(bestPenalty, row.penalty);
      }
    }
    for (const row of rows) {
      const cell = row.cells[col]!;
      cell.isOptimum = cell.expected === best && row.penalty === bestPenalty;
    }
  }

  return { acColumns, rows };
}
