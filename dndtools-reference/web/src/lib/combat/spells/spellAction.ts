import type { ActiveEffect } from "@/lib/combat/effects/applyEffects";
import { spellSaveDc } from "@/lib/combat/spells/dc";
import {
  rollDamageTotal,
  scaleSpellDamage,
  scaleSpellHeal,
} from "@/lib/combat/spells/scaling";
import type {
  AttackEventPayload,
  CastEventPayload,
  CombatEventKind,
  SaveEventPayload,
  SrEventPayload,
} from "@/lib/combat/events/types";
import { resolveAttack } from "@/lib/combat/rules/attack";
import type { EngineContext } from "@/lib/combat/rules/engineContext";
import { resolveSave } from "@/lib/combat/rules/saves";
import { resolveSpellResistance } from "@/lib/combat/rules/spellResistance";
import type { CombatSpellEntry, ConditionKey, DamagePacket, Defenses } from "@/lib/combat/types";
import type { DicePoolItem } from "@/lib/dice/types";
import type { SpellFollowUpAction } from "@/lib/fg-spell-actions/types";

/**
 * Face pool assignment order (deterministic):
 * 1. One d20 per target that requires an SR check (in target order)
 * 2. One d20 per target for save or touch/ranged touch attack (in target order)
 * 3. Shared damage dice (single pool for the spell)
 * 4. Shared heal dice (one die for heal follow-up)
 * 5. Shared effect duration dice (if durdice is set)
 */

export type SpellCastCaster = {
  id: string;
  name: string;
  init: number;
  effects: ActiveEffect[];
  spellUses: Record<string, number>;
  engine: EngineContext;
  attackBonus?: number;
};

export type SpellCastTarget = {
  id: string;
  name: string;
  engine: EngineContext;
  defenses: Defenses;
};

export type ResolveSpellCastOpts = {
  casterLevel: number;
  spellLevel: number;
  castingStatMod: number;
  featMods?: number;
  adhoc?: number;
  attackBonus?: number;
  dmOverrideSlots?: boolean;
};

export type SpellCastEventDraft = {
  kind: CombatEventKind;
  payload:
    | CastEventPayload
    | SrEventPayload
    | AttackEventPayload
    | SaveEventPayload
    | { text: string };
  targetCombatantId?: string | null;
  actorCombatantId?: string | null;
};

export type SpellCastDamagePlan = {
  targetId: string;
  packets: DamagePacket[];
  half: boolean;
  skip: boolean;
};

export type SpellCastHealPlan = {
  targetId: string;
  amount: number;
};

export type SpellCastEffectPlan = {
  targetId: string;
  label: string;
  duration: number | null;
  durationUnit: "round" | "minute" | "hour" | "day";
};

export type SpellCastResolution = {
  events: SpellCastEventDraft[];
  damagePlans: SpellCastDamagePlan[];
  healPlans: SpellCastHealPlan[];
  effectPlans: SpellCastEffectPlan[];
  consumeUseKey: string | null;
  blocked?: string;
};

type TargetOutcome = {
  target: SpellCastTarget;
  srPassed: boolean;
  applyFollowUps: boolean;
  hit: boolean;
  saveSuccess: boolean;
  halfDamage: boolean;
};

function saveTypeFromCast(
  savetype: string | undefined,
): "fort" | "ref" | "will" | null {
  const lower = (savetype ?? "").toLowerCase();
  if (lower === "fort" || lower === "fortitude") return "fort";
  if (lower === "ref" || lower === "reflex") return "ref";
  if (lower === "will") return "will";
  return null;
}

function followUps(entry: CombatSpellEntry): SpellFollowUpAction[] {
  const set = entry.actions;
  const list = [...(set.followUps ?? [])];
  if (set.action2 && !list.includes(set.action2)) list.unshift(set.action2);
  return list;
}

function dmgTypes(raw: string): DamagePacket["types"] {
  const lower = raw.toLowerCase();
  if (lower === "fire") return ["fire", "spell"];
  if (lower === "cold") return ["cold", "spell"];
  if (lower === "acid") return ["acid", "spell"];
  if (lower === "electricity") return ["electricity", "spell"];
  if (lower === "sonic") return ["sonic", "spell"];
  if (lower === "force") return ["force", "spell"];
  if (lower === "negative") return ["negative", "spell"];
  if (lower === "positive") return ["positive", "spell"];
  return ["spell"];
}

function effectDuration(
  action: Extract<SpellFollowUpAction, { type: "effect" }>,
  casterLevel: number,
  durationFace: number | null,
): { duration: number | null; durationUnit: "round" | "minute" | "hour" | "day" } {
  const unit = action.durunit || "round";
  let mod = action.durmod ?? 1;
  if (action.durdice) {
    mod += durationFace ?? 1;
  }
  const total = mod * Math.max(1, casterLevel);
  return {
    duration: total,
    durationUnit: unit === "minute" || unit === "hour" || unit === "day" ? unit : "round",
  };
}

function slotUseKey(entry: CombatSpellEntry): string | null {
  if (entry.kind === "sla") return `sla:${entry.key}`;
  if (entry.level != null) return `slot:${entry.level}`;
  return null;
}

function ordinal(level: number): string {
  const suffix =
    level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix}`;
}

export function spellCastDicePool(
  entry: CombatSpellEntry,
  targets: Array<Pick<SpellCastTarget, "defenses">>,
  casterLevel: number,
): DicePoolItem[] {
  const cast = entry.actions.cast;
  const pool: DicePoolItem[] = [];
  const srAllowed = !cast.srnotallowed;
  const srCount = srAllowed
    ? targets.filter((t) => (t.defenses.sr ?? 0) > 0).length
    : 0;
  if (srCount > 0) pool.push({ qty: srCount, sides: 20 });

  if (cast.atktype || cast.savetype) {
    pool.push({ qty: targets.length, sides: 20 });
  }

  const actions = followUps(entry);
  const damageAction = actions.find((a) => a.type === "damage");
  if (damageAction && damageAction.type === "damage") {
    const scaled = scaleSpellDamage(damageAction, casterLevel);
    pool.push({ qty: scaled.qty, sides: scaled.sides as DicePoolItem["sides"] });
  }
  if (actions.some((a) => a.type === "heal")) {
    pool.push({ qty: 1, sides: 8 });
  }
  const effectAction = actions.find((a) => a.type === "effect");
  if (effectAction && effectAction.type === "effect" && effectAction.durdice) {
    const sides = Number(effectAction.durdice.match(/d(\d+)/i)?.[1] ?? 6);
    pool.push({ qty: 1, sides: sides as DicePoolItem["sides"] });
  }

  if (pool.length === 0) pool.push({ qty: 1, sides: 20 });
  return pool;
}

export function resolveSpellCast(
  caster: SpellCastCaster,
  targets: SpellCastTarget[],
  entry: CombatSpellEntry,
  faces: number[],
  opts: ResolveSpellCastOpts,
): SpellCastResolution {
  const cast = entry.actions.cast;
  const actions = followUps(entry);
  const events: SpellCastEventDraft[] = [];
  const damagePlans: SpellCastDamagePlan[] = [];
  const healPlans: SpellCastHealPlan[] = [];
  const effectPlans: SpellCastEffectPlan[] = [];

  const useKey = slotUseKey(entry);
  if (useKey && !opts.dmOverrideSlots) {
    const remaining = caster.spellUses[useKey];
    if (remaining != null && remaining <= 0) {
      return {
        events: [],
        damagePlans: [],
        healPlans: [],
        effectPlans: [],
        consumeUseKey: null,
        blocked: `No ${entry.level != null ? `${ordinal(entry.level)} level` : ""} slots remaining for ${entry.name}`,
      };
    }
  }

  let faceIndex = 0;
  const takeFace = () => faces[faceIndex++] ?? 1;

  const dc = spellSaveDc({
    spellLevel: opts.spellLevel,
    castingStatMod: opts.castingStatMod,
    featMods: opts.featMods,
    effects: caster.effects,
    descriptors: cast.schoolShort ? [cast.schoolShort] : [],
  });

  const saveType = saveTypeFromCast(cast.savetype);
  const attackType =
    cast.atktype === "rtouch" ? "rtouch" : cast.atktype === "mtouch" ? "mtouch" : null;
  const srAllowed = !cast.srnotallowed;
  const actionList = followUps(entry);
  const damageAction = actionList.find(
    (a): a is Extract<SpellFollowUpAction, { type: "damage" }> => a.type === "damage",
  );
  const healAction = actionList.find(
    (a): a is Extract<SpellFollowUpAction, { type: "heal" }> => a.type === "heal",
  );
  const effectAction = actionList.find(
    (a): a is Extract<SpellFollowUpAction, { type: "effect" }> => a.type === "effect",
  );
  const skipHarmlessHealSave =
    Boolean(healAction && !damageAction && !effectAction && cast.srnotallowed);

  events.push({
    kind: "cast",
    payload: {
      spellName: entry.name,
      casterLevel: opts.casterLevel,
      targetNames: targets.map((t) => t.name),
    },
    actorCombatantId: caster.id,
  });

  const outcomes: TargetOutcome[] = targets.map((target) => ({
    target,
    srPassed: true,
    applyFollowUps: true,
    hit: true,
    saveSuccess: false,
    halfDamage: false,
  }));

  for (const outcome of outcomes) {
    const sr = outcome.target.defenses.sr;
    if (srAllowed && sr != null && sr > 0) {
      const face = takeFace();
      const srResult = resolveSpellResistance({
        casterLevel: opts.casterLevel,
        face,
        sr,
        effects: caster.effects,
      });
      outcome.srPassed = srResult.success;
      events.push({
        kind: "sr",
        payload: {
          spellName: entry.name,
          face: srResult.face,
          casterLevel: srResult.casterLevel,
          clBonus: srResult.clBonus,
          total: srResult.total,
          sr: srResult.sr,
          success: srResult.success,
        },
        targetCombatantId: outcome.target.id,
        actorCombatantId: caster.id,
      });
      if (!srResult.success) {
        outcome.applyFollowUps = false;
      }
    }
  }

  for (const outcome of outcomes) {
    if (!outcome.applyFollowUps) continue;

    if (attackType) {
      const face = takeFace();
      const bonus = opts.attackBonus ?? caster.attackBonus ?? 0;
      const attack = resolveAttack({
        attacker: caster.engine,
        target: outcome.target.engine,
        line: {
          name: entry.name,
          bonus,
          mode: attackType === "rtouch" ? "ranged" : "melee",
          attackType,
        },
        face,
        adhoc: opts.adhoc ?? 0,
        attackType,
      });
      outcome.hit = attack.payload.hit;
      events.push({
        kind: "attack",
        payload: attack.payload,
        targetCombatantId: outcome.target.id,
        actorCombatantId: caster.id,
      });
      if (!attack.payload.hit) {
        outcome.applyFollowUps = cast.onmissdamage === "half";
        outcome.halfDamage = cast.onmissdamage === "half";
      }
    } else if (saveType && !skipHarmlessHealSave) {
      const face = takeFace();
      const save = resolveSave(
        {
          saves: outcome.target.engine.saves,
          conditions: [...outcome.target.engine.conditions] as ConditionKey[],
          effects: outcome.target.engine.effects,
        },
        saveType,
        dc,
        face,
        { label: entry.name, descriptor: cast.schoolShort },
        opts.adhoc ?? 0,
      );
      outcome.saveSuccess = save.success;
      const halfOnSave = cast.onmissdamage === "half";
      if (save.success) {
        outcome.halfDamage = halfOnSave;
        outcome.applyFollowUps = halfOnSave || actions.some((a) => a.type === "heal");
      }
      events.push({
        kind: "save",
        payload: {
          saveType: save.saveType,
          dc: save.dc,
          face: save.face,
          bonus: save.bonus,
          total: save.total,
          success: save.success,
          autoFail: false,
          source: entry.name,
          consequence: save.success ? (halfOnSave ? "half" : "negate") : undefined,
        },
        targetCombatantId: outcome.target.id,
        actorCombatantId: caster.id,
      });
    }
  }

  let damageFaces: number[] = [];
  if (damageAction) {
    const scaled = scaleSpellDamage(damageAction, opts.casterLevel);
    damageFaces = faces.slice(faceIndex, faceIndex + scaled.qty);
    faceIndex += scaled.qty;
  }

  let healFaces: number[] = [];
  if (healAction) {
    healFaces = faces.slice(faceIndex, faceIndex + 1);
    faceIndex += 1;
  }

  let durationFace: number | null = null;
  if (effectAction?.durdice) {
    durationFace = faces[faceIndex] ?? 1;
    faceIndex += 1;
  }

  for (const outcome of outcomes) {
    if (!outcome.applyFollowUps) {
      damagePlans.push({
        targetId: outcome.target.id,
        packets: [],
        half: false,
        skip: true,
      });
      continue;
    }

    if (damageAction) {
      if (attackType && !outcome.hit && cast.onmissdamage !== "half") {
        damagePlans.push({
          targetId: outcome.target.id,
          packets: [],
          half: false,
          skip: true,
        });
      } else if (saveType && outcome.saveSuccess && !outcome.halfDamage) {
        damagePlans.push({
          targetId: outcome.target.id,
          packets: [],
          half: false,
          skip: true,
        });
      } else {
        const scaled = scaleSpellDamage(damageAction, opts.casterLevel);
        const amount = rollDamageTotal(scaled, damageFaces);
        damagePlans.push({
          targetId: outcome.target.id,
          packets: [
            {
              amount,
              types: dmgTypes(scaled.dmgType),
              source: entry.name,
            },
          ],
          half: outcome.halfDamage,
          skip: false,
        });
      }
    }

    if (healAction) {
      const amount = scaleSpellHeal(healAction, opts.casterLevel, healFaces);
      healPlans.push({ targetId: outcome.target.id, amount });
    }

    if (effectAction && !outcome.saveSuccess) {
      const dur = effectDuration(effectAction, opts.casterLevel, durationFace);
      effectPlans.push({
        targetId: outcome.target.id,
        label: effectAction.label,
        duration: dur.duration,
        durationUnit: dur.durationUnit,
      });
    }
  }

  if (useKey) {
    const remaining = caster.spellUses[useKey];
    if (remaining != null) {
      events.push({
        kind: "note",
        payload: {
          text: `[SLOT] ${entry.name}: ${entry.level != null ? `${ordinal(entry.level)} level, ` : ""}${Math.max(0, remaining - 1)} left`,
        },
        actorCombatantId: caster.id,
      });
    }
  }

  return {
    events,
    damagePlans,
    healPlans,
    effectPlans,
    consumeUseKey: useKey,
  };
}
