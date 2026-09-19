import type { BonusType } from "../types";

/** One modifier candidate before 3.5e stacking rules are applied. */
export type ModifierPart = {
  label: string;
  value: number;
  bonusType?: BonusType;
};

/** Itemized modifier after stacking, for log tooltips. */
export type ItemizedModifier = {
  label: string;
  value: number;
};

const STACKING_BONUS_TYPES = new Set<BonusType | "untyped">([
  "dodge",
  "circumstance",
  "untyped",
]);

function bonusTypeKey(part: ModifierPart): BonusType | "untyped" {
  return part.bonusType ?? "untyped";
}

function isPenalty(part: ModifierPart): boolean {
  return part.value < 0;
}

function stacksByType(type: BonusType | "untyped"): boolean {
  return STACKING_BONUS_TYPES.has(type);
}

/**
 * Apply 3.5e bonus stacking:
 * - Same named bonus type: take the highest.
 * - dodge, circumstance, and untyped bonuses stack.
 * - Penalties always stack regardless of type.
 */
export function collectModifiers(parts: ModifierPart[]): ItemizedModifier[] {
  if (parts.length === 0) return [];

  const penalties = parts.filter(isPenalty);
  const bonuses = parts.filter((p) => !isPenalty(p));

  const result: ItemizedModifier[] = [];

  for (const penalty of penalties) {
    result.push({ label: penalty.label, value: penalty.value });
  }

  const byType = new Map<BonusType | "untyped", ModifierPart[]>();
  for (const bonus of bonuses) {
    const key = bonusTypeKey(bonus);
    const group = byType.get(key) ?? [];
    group.push(bonus);
    byType.set(key, group);
  }

  for (const [type, group] of byType) {
    if (stacksByType(type)) {
      for (const part of group) {
        result.push({ label: part.label, value: part.value });
      }
    } else {
      const best = group.reduce((a, b) => (b.value > a.value ? b : a));
      result.push({ label: best.label, value: best.value });
    }
  }

  return result;
}

/** Sum itemized modifiers after stacking. */
export function sumModifiers(parts: ModifierPart[]): number {
  return collectModifiers(parts).reduce((sum, m) => sum + m.value, 0);
}
