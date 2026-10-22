import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";

export type CoinUnit = "cp" | "sp" | "gp" | "pp";

export type RollExpressionResult = {
  count: number;
  unit: CoinUnit;
  gp: number;
};

export class RollExpressionError extends Error {
  readonly name = "RollExpressionError";
}

const CP_PER_GP = 100;
const CP_PER_SP = 10;
const CP_PER_PP = 1000;

export function coinUnitToCp(count: number, unit: CoinUnit): number {
  switch (unit) {
    case "cp":
      return count;
    case "sp":
      return count * CP_PER_SP;
    case "gp":
      return count * CP_PER_GP;
    case "pp":
      return count * CP_PER_PP;
    default:
      return count;
  }
}

export function cpToGp(cp: number): number {
  return cp / CP_PER_GP;
}

export function gpToCp(gp: number): number {
  return Math.round(gp * CP_PER_GP);
}

function normalizeExpression(expr: string): string {
  return expr
    .replace(/\u2014/g, "")
    .replace(/\u00d7/g, "x")
    .replace(/\*/g, "x")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDicePart(
  text: string,
): { rolls: number; sides: number; modifier: number } | null {
  const match = text.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return null;
  return {
    rolls: Number.parseInt(match[1]!, 10),
    sides: Number.parseInt(match[2]!, 10),
    modifier: match[3] ? Number.parseInt(match[3], 10) : 0,
  };
}

export function averageExpression(expr: string): number {
  const parsed = parseRollExpression(expr);
  return parsed.gp;
}

function rollDiceTotal(
  rolls: number,
  sides: number,
  modifier: number,
  rng: SeededRng,
): number {
  let total = modifier;
  for (let i = 0; i < rolls; i++) {
    total += rng.pickInt(1, sides);
  }
  return total;
}

export function parseRollExpression(expr: string): RollExpressionResult {
  const normalized = normalizeExpression(expr);
  if (!normalized || normalized === "-") {
    throw new RollExpressionError("Empty expression");
  }

  const suffixMatch = normalized.match(
    /^(.*?)(?:\s+(cp|sp|gp|pp))$/i,
  );
  const core = suffixMatch ? suffixMatch[1]!.trim() : normalized;
  const unit = (suffixMatch?.[2]?.toLowerCase() ?? "gp") as CoinUnit;

  const multiplyMatch = core.match(/^(.+?)\s*x\s*([\d.]+)$/i);
  if (multiplyMatch) {
    const dice = parseDicePart(multiplyMatch[1]!.replace(/\s+/g, ""));
    if (!dice) {
      throw new RollExpressionError(`Invalid dice: ${expr}`);
    }
    const multiplier = Number.parseFloat(multiplyMatch[2]!);
    const average =
      dice.rolls * ((dice.sides + 1) / 2) + dice.modifier;
    const count = average * multiplier;
    const gp = cpToGp(coinUnitToCp(count, unit));
    return { count, unit, gp };
  }

  const dice = parseDicePart(core.replace(/\s+/g, ""));
  if (!dice) {
    throw new RollExpressionError(`Invalid dice: ${expr}`);
  }
  const average = dice.rolls * ((dice.sides + 1) / 2) + dice.modifier;
  const gp = cpToGp(coinUnitToCp(average, unit));
  return { count: average, unit, gp };
}

export function rollExpression(expr: string, rng: SeededRng): RollExpressionResult {
  const normalized = normalizeExpression(expr);
  if (!normalized || normalized === "-") {
    throw new RollExpressionError("Empty expression");
  }

  const suffixMatch = normalized.match(
    /^(.*?)(?:\s+(cp|sp|gp|pp))$/i,
  );
  const core = suffixMatch ? suffixMatch[1]!.trim() : normalized;
  const unit = (suffixMatch?.[2]?.toLowerCase() ?? "gp") as CoinUnit;

  const multiplyMatch = core.match(/^(.+?)\s*x\s*([\d.]+)$/i);
  if (multiplyMatch) {
    const dice = parseDicePart(multiplyMatch[1]!.replace(/\s+/g, ""));
    if (!dice) {
      throw new RollExpressionError(`Invalid dice: ${expr}`);
    }
    const multiplier = Number.parseFloat(multiplyMatch[2]!);
    const rolled = rollDiceTotal(dice.rolls, dice.sides, dice.modifier, rng);
    const count = rolled * multiplier;
    const gp = cpToGp(coinUnitToCp(count, unit));
    return { count, unit, gp };
  }

  const dice = parseDicePart(core.replace(/\s+/g, ""));
  if (!dice) {
    throw new RollExpressionError(`Invalid dice: ${expr}`);
  }
  const count = rollDiceTotal(dice.rolls, dice.sides, dice.modifier, rng);
  const gp = cpToGp(coinUnitToCp(count, unit));
  return { count, unit, gp };
}

export function cpToCoinPile(totalCp: number): {
  cp: number;
  sp: number;
  gp: number;
  pp: number;
} {
  let remaining = Math.max(0, Math.round(totalCp));
  const pp = Math.floor(remaining / CP_PER_PP);
  remaining -= pp * CP_PER_PP;
  const gp = Math.floor(remaining / CP_PER_GP);
  remaining -= gp * CP_PER_GP;
  const sp = Math.floor(remaining / CP_PER_SP);
  remaining -= sp * CP_PER_SP;
  const cp = remaining;
  return { cp, sp, gp, pp };
}

export function formatCoinPile(pile: {
  cp: number;
  sp: number;
  gp: number;
  pp: number;
}): string {
  const parts: string[] = [];
  if (pile.pp > 0) parts.push(`${pile.pp} pp`);
  if (pile.gp > 0) parts.push(`${pile.gp} gp`);
  if (pile.sp > 0) parts.push(`${pile.sp} sp`);
  if (pile.cp > 0) parts.push(`${pile.cp} cp`);
  return parts.length > 0 ? parts.join(", ") : "No coins";
}

export function mergeCoinPiles(
  a: { cp: number; sp: number; gp: number; pp: number },
  b: { cp: number; sp: number; gp: number; pp: number },
): { cp: number; sp: number; gp: number; pp: number } {
  const totalCp =
    coinUnitToCp(a.cp, "cp") +
    coinUnitToCp(a.sp, "sp") +
    coinUnitToCp(a.gp, "gp") +
    coinUnitToCp(a.pp, "pp") +
    coinUnitToCp(b.cp, "cp") +
    coinUnitToCp(b.sp, "sp") +
    coinUnitToCp(b.gp, "gp") +
    coinUnitToCp(b.pp, "pp");
  return cpToCoinPile(totalCp);
}

export function scaleCoinPileGp(
  pile: { cp: number; sp: number; gp: number; pp: number },
  factor: number,
): { cp: number; sp: number; gp: number; pp: number } {
  const totalCp =
    coinUnitToCp(pile.cp, "cp") +
    coinUnitToCp(pile.sp, "sp") +
    coinUnitToCp(pile.gp, "gp") +
    coinUnitToCp(pile.pp, "pp");
  return cpToCoinPile(totalCp * factor);
}
