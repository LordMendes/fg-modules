import { collect, type ActiveEffect, type EffectCollectContext } from "../effects/applyEffects";
import { collectModifiers, sumModifiers, type ModifierPart } from "./modifiers";
import type { ConditionKey } from "../types";

export type SaveType = "fort" | "ref" | "will";

export type SaveTargetContext = {
  saves: { fort: number; ref: number; will: number };
  conditions?: ConditionKey[];
  effects: ActiveEffect[];
};

export type SaveSourceContext = {
  descriptor?: string;
  label?: string;
};

export type SaveOutcome = {
  saveType: SaveType;
  dc: number;
  face: number;
  bonus: number;
  total: number;
  success: boolean;
  modifiers: { label: string; value: number }[];
  source: string;
};

const SAVE_CONDITION_MODS: Partial<Record<ConditionKey, number>> = {
  shaken: -2,
  frightened: -2,
  panicked: -2,
  sickened: -2,
};

function finite(n: number): number {
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function saveConditionMods(conditions: ConditionKey[] | undefined): ModifierPart[] {
  if (!conditions?.length) return [];
  const parts: ModifierPart[] = [];
  for (const condition of conditions) {
    const value = SAVE_CONDITION_MODS[condition];
    if (value != null) {
      parts.push({ label: condition, value });
    }
  }
  return parts;
}

/**
 * Resolve a saving throw. Natural 1 and 20 do not auto-fail or auto-succeed.
 */
export function resolveSave(
  target: SaveTargetContext,
  saveType: SaveType,
  dc: number,
  face: number,
  source: SaveSourceContext = {},
  adhoc = 0,
): SaveOutcome {
  const effectCtx: EffectCollectContext = { effects: target.effects };
  const saveDescriptor = source.descriptor?.toLowerCase();

  const saveParts = collect(effectCtx, "SAVE", {
    saveType,
    saveDescriptor,
  }).map((m) => ({ label: m.label, value: m.value }));

  const typeTag = saveType === "fort" ? "FORT" : saveType === "ref" ? "REF" : "WILL";
  const typeParts = collect(effectCtx, typeTag, { saveType }).map((m) => ({
    label: m.label,
    value: m.value,
  }));

  const conditionParts = saveConditionMods(target.conditions);
  const baseBonus = finite(target.saves[saveType]);
  const parts: ModifierPart[] = [
    { label: "Base", value: baseBonus },
    ...saveParts,
    ...typeParts,
    ...conditionParts,
  ];

  if (adhoc !== 0) {
    parts.push({ label: "Ad hoc", value: adhoc });
  }

  const modifiers = collectModifiers(parts);
  const bonus = sumModifiers(parts);
  const rollFace = finite(face);
  const total = rollFace + bonus;
  const success = total >= finite(dc);

  return {
    saveType,
    dc: finite(dc),
    face: rollFace,
    bonus,
    total,
    success,
    modifiers,
    source: source.label ?? source.descriptor ?? "",
  };
}
