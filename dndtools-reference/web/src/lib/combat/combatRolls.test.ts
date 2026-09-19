import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDiceNotation } from "@/lib/dice/parseDiceNotation";
import { scaleCriticalDamage } from "@/lib/combat/rules/critical";
import type { CombatAttackLine } from "@/lib/combat/types";

function buildDamageAmount(
  line: CombatAttackLine,
  faces: number[],
  modifier: number,
  crit: boolean,
  multiplier: number,
): number {
  const parsed = parseDiceNotation(line.damage);
  if (!parsed) {
    return Math.max(0, faces.reduce((s, n) => s + n, 0) + modifier);
  }

  let mod = parsed.modifier + modifier;
  if (crit) {
    const scaled = scaleCriticalDamage({
      baseDice: `${parsed.dice[0]?.qty ?? 1}d${parsed.dice[0]?.sides ?? 8}`,
      baseModifier: mod,
      multiplier,
    });
    mod = scaled.scaledModifier;
  }

  return Math.max(0, faces.reduce((s, n) => s + n, 0) + mod);
}

describe("combat roll damage helpers", () => {
  it("sums rolled faces with weapon modifier", () => {
    const line: CombatAttackLine = {
      name: "Scimitar",
      bonus: 4,
      mode: "melee",
      damage: "1d6+2",
      damageTypes: ["slashing"],
    };
    assert.equal(buildDamageAmount(line, [4], 0, false, 2), 6);
  });

  it("doubles modifier on confirmed crit", () => {
    const line: CombatAttackLine = {
      name: "Longsword",
      bonus: 9,
      mode: "melee",
      damage: "1d8+5",
      damageTypes: ["slashing"],
    };
    assert.equal(buildDamageAmount(line, [6], 0, true, 2), 16);
  });
});
