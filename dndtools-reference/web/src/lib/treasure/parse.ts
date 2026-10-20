import { RollExpressionError, rollExpression } from "@/lib/dice/roll-expression";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";

export function isBlankTreasureCell(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "\u2014" || trimmed === "-";
}

export function parseQuantityRoll(
  text: string,
  rng: SeededRng,
): { count: number; remainder: string } {
  const trimmed = text.trim();
  const match = trimmed.match(/^(\d+d\d+|\d+)\s+(.+)$/i);
  if (!match) {
    return { count: 1, remainder: trimmed };
  }
  const token = match[1]!;
  const remainder = match[2]!.trim();
  const diceMatch = token.match(/^(\d+)d(\d+)$/i);
  if (diceMatch) {
    const rolls = Number.parseInt(diceMatch[1]!, 10);
    const sides = Number.parseInt(diceMatch[2]!, 10);
    let total = 0;
    for (let i = 0; i < rolls; i++) {
      total += rng.pickInt(1, sides);
    }
    return { count: total, remainder };
  }
  return { count: Number.parseInt(token, 10), remainder };
}

export function parsePriceGp(price: string | null | undefined): number | null {
  if (!price) return null;
  const trimmed = price.trim();
  if (trimmed === "-" || trimmed === "---" || trimmed === "\u2014") {
    return null;
  }
  const match = trimmed.match(/([\d,]+(?:\.\d+)?)\s*gp/i);
  if (match) {
    return Number.parseFloat(match[1]!.replace(/,/g, ""));
  }
  const bonusMatch = trimmed.match(/^\+\s*([\d,]+)\s*gp/i);
  if (bonusMatch) {
    return Number.parseFloat(bonusMatch[1]!.replace(/,/g, ""));
  }
  return null;
}

export function parseOrdinalLevel(label: string): number {
  const trimmed = label.trim().toLowerCase();
  if (trimmed === "0") return 0;
  const match = trimmed.match(/^(\d+)/);
  if (match) return Number.parseInt(match[1]!, 10);
  return 0;
}

export function scrollPriceGp(spellLevelLabel: string, casterLabel: string): number {
  const spellLevel = parseOrdinalLevel(spellLevelLabel);
  const caster = parseOrdinalLevel(casterLabel);
  if (spellLevel <= 0) return 12.5;
  return spellLevel * caster * 25;
}

export function pickExampleName(examples: string, rng: SeededRng): string {
  const parts = examples
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "Unknown";
  const picked = rng.pick(parts);
  return picked ?? parts[0]!;
}

export function rollValueExpression(
  expr: string,
  rng: SeededRng,
): { display: string; gp: number } {
  try {
    const rolled = rollExpression(expr, rng);
    const count = Math.round(rolled.count);
    return {
      display: `${count} ${rolled.unit}`,
      gp: rolled.gp,
    };
  } catch (error) {
    if (error instanceof RollExpressionError) {
      return { display: expr, gp: 0 };
    }
    throw error;
  }
}

export function pickRowByRange<T extends { from: number; to: number }>(
  rows: T[],
  roll: number,
): T | undefined {
  return rows.find((row) => roll >= row.from && roll <= row.to);
}

export function normalizeItemName(name: string): string {
  return name.trim().toLowerCase();
}
