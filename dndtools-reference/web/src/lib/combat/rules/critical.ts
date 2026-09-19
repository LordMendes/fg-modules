import { collect } from "../effects/applyEffects";
import type { CritConfirmEventPayload, CritDamageResult, RuleOutcome, StatePatch } from "../events/types";
import type { EffectComponent } from "../types";
import type { DieSides } from "../../dice/types";
import { applyCriticalDamage } from "../../pc-planner/weaponAttacks";
import {
  buildAcValue,
  resolveAcType,
  type AttackLineInput,
  type AttackType,
} from "./attack";
import type { EngineContext } from "./engineContext";

function finiteOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveAttackType(line: AttackLineInput, override?: AttackType): AttackType {
  if (override) return override;
  if (line.attackType) return line.attackType;
  return line.mode;
}

/** Whether the target is immune to critical hits. */
export function isImmuneToCrit(target: EngineContext): boolean {
  const immuneList = target.defenses.immune ?? [];
  if (immuneList.some((t) => String(t) === "crit")) {
    return true;
  }

  for (const effect of target.effects) {
    if (effect.active === false) continue;
    if (/\bIMMUNE:\s*crit\b/i.test(effect.label)) {
      return true;
    }
    for (const component of effect.components) {
      if (component.tag === "IMMUNE" && component.types.some((t) => String(t) === "crit")) {
        return true;
      }
    }
  }

  return false;
}

function buildConfirmBonus(
  attacker: EngineContext,
  line: AttackLineInput,
  attackType: AttackType,
  acType: "normal" | "touch" | "flat",
  adhoc: number,
): { bonus: number; modifiers: { label: string; value: number }[] } {
  const base = { label: "Base", value: finiteOr(line.bonus, 0) };
  const atkMods = collect(
    { effects: attacker.effects },
    "ATK",
    { attackType, acType, crit: false },
  );
  const critMods = collect(
    { effects: attacker.effects },
    "ATK",
    { attackType, acType, crit: true },
  );

  const modifiers = [base, ...atkMods, ...critMods];
  if (adhoc !== 0) {
    modifiers.push({ label: "Ad hoc", value: adhoc });
  }

  const bonus = modifiers.reduce((s, m) => s + m.value, 0);
  return { bonus, modifiers };
}

export type ResolveCriticalInput = {
  attacker: EngineContext;
  target: EngineContext;
  line: AttackLineInput;
  face: number;
  adhoc?: number;
  attackType?: AttackType;
  pendingCrit?: { multiplier: number; threatFace: number; attackName: string };
};

/**
 * Resolve a critical confirmation roll.
 * Face 1 auto fails; face 20 auto confirms (unless immune).
 */
export function resolveCriticalConfirm(
  input: ResolveCriticalInput,
): RuleOutcome<CritConfirmEventPayload> {
  const { attacker, target, line, face } = input;
  const adhoc = finiteOr(input.adhoc, 0);
  const attackType = resolveAttackType(line, input.attackType);

  const immuneToCrit = isImmuneToCrit(target);
  const acType = resolveAcType(attackType, target);
  const { bonus, modifiers } = buildConfirmBonus(attacker, line, attackType, acType, adhoc);
  const acValue = buildAcValue(target, acType, attackType);
  const total = Math.trunc(face) + bonus;

  const autoMiss = face === 1;
  const autoHit = face === 20;

  let confirmed = false;
  if (immuneToCrit) {
    confirmed = false;
  } else if (autoMiss) {
    confirmed = false;
  } else if (autoHit) {
    confirmed = true;
  } else {
    confirmed = total >= acValue;
  }

  const payload: CritConfirmEventPayload = {
    attackName: line.name,
    face: Math.trunc(face),
    bonus,
    adhoc,
    total,
    acType,
    acValue,
    confirmed,
    autoMiss,
    autoHit,
    immuneToCrit,
    modifiers,
  };

  const patches: StatePatch[] = [];

  if (immuneToCrit) {
    patches.push({ combatantId: attacker.id, pendingCrit: null });
  } else if (confirmed && input.pendingCrit) {
    patches.push({ combatantId: attacker.id, pendingCrit: input.pendingCrit });
  } else {
    patches.push({ combatantId: attacker.id, pendingCrit: null });
  }

  return { payload, patches };
}

export type CritDamageInput = {
  baseDice: string;
  baseModifier: number;
  multiplier: number;
  extraComponents?: EffectComponent[];
};

/**
 * Scale weapon damage for a confirmed critical.
 * Multiplies base dice and static modifier; extra energy dice (DMG) are added once.
 */
export function scaleCriticalDamage(input: CritDamageInput): CritDamageResult {
  const mult = Math.max(1, Math.trunc(input.multiplier));
  const modifier = finiteOr(input.baseModifier, 0);

  const diceMatch = /^(\d+)d(\d+)$/i.exec(input.baseDice.trim());
  const qty = diceMatch ? parseInt(diceMatch[1]!, 10) : 1;
  const sides = (diceMatch ? parseInt(diceMatch[2]!, 10) : 8) as DieSides;

  const scaled = applyCriticalDamage([{ qty, sides }], modifier, mult);

  const extraDice: CritDamageResult["extraDice"] = [];
  for (const component of input.extraComponents ?? []) {
    if (component.tag !== "DMG") continue;
    extraDice.push({
      dice: component.dice,
      value: component.value,
      types: component.types,
      descriptors: component.descriptors,
      precision:
        component.types.includes("precision") ||
        component.descriptors.includes("precision"),
    });
  }

  const scaledQty = scaled.dice[0]?.qty ?? qty * mult;
  const scaledSides = scaled.dice[0]?.sides ?? sides;

  return {
    baseDice: input.baseDice,
    baseModifier: modifier,
    multiplier: mult,
    scaledDice: `${scaledQty}d${scaledSides}`,
    scaledModifier: scaled.modifier,
    extraDice,
  };
}
