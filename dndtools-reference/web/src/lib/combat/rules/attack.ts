import { collect, type EffectCollectFilter } from "../effects/applyEffects";
import type { AttackEventPayload, ItemizedModifier, RuleOutcome, StatePatch } from "../events/types";
import type { CombatAttackMode } from "../types";
import { computeMissChance, resolveConcealment } from "./concealment";
import type { EngineContext } from "./engineContext";
import { targetIsHelpless, targetLosesDex } from "./engineContext";
import type { ItemizedModifier as ModItem } from "./modifiers";

export type AttackType = "melee" | "ranged" | "mtouch" | "rtouch" | "grapple";

export type AttackLineInput = {
  name: string;
  bonus: number;
  mode: CombatAttackMode;
  threatMin?: number;
  critMultiplier?: number;
  attackType?: AttackType;
  iterativeModifiers?: number[];
};

export type ResolveAttackInput = {
  attacker: EngineContext;
  target: EngineContext;
  line: AttackLineInput;
  face: number;
  adhoc?: number;
  attackType?: AttackType;
  /** d100 face when concealment applies; omit to skip concealment roll. */
  concealmentFace?: number;
};

export type AttackResolution = RuleOutcome<AttackEventPayload>;

function finiteOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveAttackType(line: AttackLineInput, override?: AttackType): AttackType {
  if (override) return override;
  if (line.attackType) return line.attackType;
  return line.mode;
}

export function resolveAcType(attackType: AttackType, target: EngineContext): "normal" | "touch" | "flat" {
  if (attackType === "mtouch" || attackType === "rtouch") return "touch";
  if (targetLosesDex(target)) return "flat";
  return "normal";
}

function coverBonus(target: EngineContext): number {
  let bonus = 0;
  for (const effect of target.effects) {
    if (effect.active === false) continue;
    for (const component of effect.components) {
      if (component.tag === "COVER") bonus = Math.max(bonus, 4);
      if (component.tag === "SCOVER") bonus = Math.max(bonus, 8);
    }
  }
  return bonus;
}

function conditionMods(attacker: EngineContext, attackType: AttackType): ModItem[] {
  const mods: ModItem[] = [];

  if (attacker.conditions.has("shaken")) {
    mods.push({ label: "Shaken", value: -2 });
  }
  if (attacker.conditions.has("sickened")) {
    mods.push({ label: "Sickened", value: -2 });
  }
  if (attacker.conditions.has("dazzled")) {
    mods.push({ label: "Dazzled", value: -1 });
  }
  if (attacker.conditions.has("frightened") || attacker.conditions.has("panicked")) {
    mods.push({ label: "Frightened", value: -2 });
  }
  if (attacker.conditions.has("entangled")) {
    mods.push({ label: "Entangled", value: -2 });
  }
  if (attacker.conditions.has("grappled") && attackType !== "grapple") {
    mods.push({ label: "Grappled", value: -4 });
  }
  if (attacker.conditions.has("prone") && attackType === "melee") {
    mods.push({ label: "Prone (melee)", value: -4 });
  }

  return mods;
}

function situationalMods(
  attacker: EngineContext,
  target: EngineContext,
  attackType: AttackType,
): ModItem[] {
  const mods: ModItem[] = [];

  if (attacker.conditions.has("invisible")) {
    mods.push({ label: "Invisible", value: 2 });
  }

  if (targetIsHelpless(target) && attackType === "melee") {
    mods.push({ label: "Helpless target (melee)", value: 4 });
  }

  if (target.conditions.has("prone")) {
    if (attackType === "melee") {
      mods.push({ label: "Prone target (melee)", value: 4 });
    } else if (attackType === "ranged") {
      mods.push({ label: "Prone target (ranged)", value: -4 });
    }
  }

  return mods;
}

function effectFilter(attackType: AttackType, acType: "normal" | "touch" | "flat"): EffectCollectFilter {
  return { attackType, acType, crit: false };
}

function sumMods(mods: ModItem[]): number {
  return mods.reduce((s, m) => s + m.value, 0);
}

export function buildAttackBonus(
  attacker: EngineContext,
  target: EngineContext,
  line: AttackLineInput,
  attackType: AttackType,
  acType: "normal" | "touch" | "flat",
  adhoc: number,
): { bonus: number; modifiers: ItemizedModifier[] } {
  const base: ModItem = { label: "Base", value: finiteOr(line.bonus, 0) };

  const atkFilter = effectFilter(attackType, acType);
  const atkMods = collect({ effects: attacker.effects }, "ATK", atkFilter);
  const condMods = conditionMods(attacker, attackType);
  const sitMods = situationalMods(attacker, target, attackType);

  const modifiers: ItemizedModifier[] = [
    base,
    ...atkMods,
    ...condMods,
    ...sitMods,
  ];

  if (adhoc !== 0) {
    modifiers.push({ label: "Ad hoc", value: adhoc });
  }

  const bonus = sumMods(modifiers);
  return { bonus, modifiers };
}

export function buildAcValue(
  target: EngineContext,
  acType: "normal" | "touch" | "flat",
  attackType: AttackType,
): number {
  const baseAc = target.ac[acType];
  const acMods = collect(
    { effects: target.effects },
    "AC",
    { attackType, acType, crit: false },
  );
  const cover = coverBonus(target);
  return baseAc + sumMods(acMods) + cover;
}

/**
 * Resolve a single attack roll against one target.
 */
export function resolveAttack(input: ResolveAttackInput): AttackResolution {
  const { attacker, target, line, face } = input;
  const adhoc = finiteOr(input.adhoc, 0);
  const attackType = resolveAttackType(line, input.attackType);
  const threatMin = finiteOr(line.threatMin, 20);
  const critMultiplier = finiteOr(line.critMultiplier, 2);

  // Grapple: log only, no auto compare
  if (attackType === "grapple") {
    const bonus = finiteOr(line.bonus, 0) + adhoc;
    const total = face + bonus;
    const payload: AttackEventPayload = {
      attackName: line.name,
      attackType: "grapple",
      face: Math.trunc(face),
      bonus: finiteOr(line.bonus, 0),
      adhoc,
      total,
      acType: "normal",
      acValue: 0,
      hit: false,
      autoMiss: false,
      autoHit: false,
      threat: false,
      modifiers: [{ label: "Base", value: finiteOr(line.bonus, 0) }],
      grappleLog: `[GRAPPLE] ${line.name} ${total}`,
    };
    return { payload, patches: [] };
  }

  const acType = resolveAcType(attackType, target);
  const { bonus, modifiers } = buildAttackBonus(attacker, target, line, attackType, acType, adhoc);
  const acValue = buildAcValue(target, acType, attackType);
  const total = Math.trunc(face) + bonus;

  const autoHit = face === 20;
  const autoMiss = face === 1;

  let hit = autoHit ? true : autoMiss ? false : total >= acValue;

  let concealmentRoll: AttackEventPayload["concealmentRoll"];
  const missChance = computeMissChance(attacker, target);
  if (missChance > 0 && input.concealmentFace != null) {
    const roll = resolveConcealment(missChance, input.concealmentFace);
    if (roll) {
      concealmentRoll = roll;
      if (roll.missed) {
        hit = false;
      }
    }
  }

  const threat = hit && !autoMiss && face >= threatMin && face <= 20;

  const payload: AttackEventPayload = {
    attackName: line.name,
    attackType,
    face: Math.trunc(face),
    bonus,
    adhoc,
    total,
    acType,
    acValue,
    hit,
    autoMiss,
    autoHit,
    threat,
    concealmentRoll,
    modifiers,
  };

  const patches: StatePatch[] = [];

  if (hit) {
    const pendingIds = [target.id];
    patches.push({ combatantId: attacker.id, pendingTargetIds: pendingIds });
  }

  if (threat) {
    patches.push({
      combatantId: attacker.id,
      pendingCrit: {
        multiplier: critMultiplier,
        threatFace: Math.trunc(face),
        attackName: line.name,
      },
    });
  }

  return { payload, patches };
}

/** Resolve iterative attacks (one face per bonus) against a target. */
export function resolveIterativeAttacks(
  attacker: EngineContext,
  target: EngineContext,
  line: AttackLineInput,
  faces: number[],
  adhoc = 0,
  concealmentFaces?: number[],
): AttackResolution[] {
  const bonuses = line.iterativeModifiers ?? [line.bonus];
  const results: AttackResolution[] = [];
  const pendingTargets: string[] = [];
  let pendingCrit: StatePatch["pendingCrit"] = null;

  for (let i = 0; i < bonuses.length; i++) {
    const iterLine = { ...line, bonus: bonuses[i]! };
    const result = resolveAttack({
      attacker,
      target,
      line: iterLine,
      face: faces[i] ?? 1,
      adhoc,
      concealmentFace: concealmentFaces?.[i],
    });

    if (result.payload.hit) {
      pendingTargets.push(target.id);
    }
    if (result.payload.threat) {
      pendingCrit = {
        multiplier: finiteOr(line.critMultiplier, 2),
        threatFace: result.payload.face,
        attackName: line.name,
      };
    }

    results.push(result);
  }

  // Merge pending state into last result patches
  if (results.length > 0 && (pendingTargets.length > 0 || pendingCrit)) {
    const last = results[results.length - 1]!;
    const merged: StatePatch[] = [];
    if (pendingTargets.length > 0) {
      merged.push({ combatantId: attacker.id, pendingTargetIds: [...new Set(pendingTargets)] });
    }
    if (pendingCrit) {
      merged.push({ combatantId: attacker.id, pendingCrit });
    }
    return [...results.slice(0, -1), { payload: last.payload, patches: merged }];
  }

  return results;
}
