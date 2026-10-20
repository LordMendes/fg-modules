import { rollExpression } from "@/lib/dice/roll-expression";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";

export function rollKingdomDefaults(rng: SeededRng): {
  areaSqMi: number;
  ageYears: number;
} {
  const areaSqMi = Math.floor(rollExpression("2d100 * 1000", rng).count);
  const ageYears = Math.floor(rollExpression("2d100 * 10", rng).count);
  return { areaSqMi, ageYears };
}
