import type { SpellFollowUpAction } from "@/lib/fg-spell-actions/types";
import { tryLookupSrdSpell } from "@/lib/npc-creator/srdSpellLookup";

export type SpellCastDetails = {
  save: string | null;
  damage: string | null;
  effect: string | null;
};

export type SpellCastContext = {
  casterLevel: number;
  spellLevel: number;
  dcModifier: number;
};

const EMPTY: SpellCastDetails = { save: null, damage: null, effect: null };

function normalizeDetail(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || /^none$/i.test(trimmed)) return null;
  return trimmed;
}

export function spellSaveDc(context: SpellCastContext): number {
  return 10 + context.spellLevel + context.dcModifier;
}

function parseDiceSides(dice: string): number {
  const match = dice.match(/d(\d+)$/i);
  return match ? Number(match[1]) : 6;
}

function normalizeDice(dice: string): string {
  return dice.startsWith("d") ? `1${dice}` : dice;
}

function usesBonusPerLevelScaling(short: string | null | undefined): boolean {
  return /\+\d+\s*\/\s*level|\+1 per level/i.test(short ?? "");
}

function computeDamageFromAction(
  action: SpellFollowUpAction,
  casterLevel: number,
  short?: string | null,
): string | null {
  switch (action.type) {
    case "heal": {
      const dice = normalizeDice(action.dice);
      const bonus = Math.min(casterLevel * (action.statmult ?? 1), action.statmax);
      return `${dice}+${bonus}`;
    }
    case "effect":
      return action.label;
    case "damage": {
      const sides = parseDiceSides(action.dice);
      const baseDice = normalizeDice(action.dice);
      const typeSuffix = action.dmgType ? ` ${action.dmgType}` : "";

      if (action.dicestat === "cl") {
        if (usesBonusPerLevelScaling(short)) {
          const levelBonus = Math.min(casterLevel, action.dicestatmax ?? casterLevel);
          const totalBonus = (action.bonus ?? 0) + levelBonus;
          return `${baseDice}${totalBonus > 0 ? `+${totalBonus}` : ""}${typeSuffix}`.trim();
        }
        const count = Math.min(casterLevel, action.dicestatmax ?? casterLevel);
        const bonus = action.bonus ?? 0;
        const bonusText =
          bonus > 0 ? `+${bonus}` : bonus < 0 ? String(bonus) : "";
        return `${count}d${sides}${bonusText}${typeSuffix}`.trim();
      }

      if (action.dicestat === "halfcl") {
        const count = Math.max(1, Math.floor(casterLevel / 2));
        const capped = action.dicestatmax
          ? Math.min(count, action.dicestatmax)
          : count;
        return `${capped}d${sides}${typeSuffix}`.trim();
      }

      const bonus = action.bonus ?? 0;
      return `${baseDice}${bonus > 0 ? `+${bonus}` : bonus < 0 ? String(bonus) : ""}${typeSuffix}`.trim();
    }
    default:
      return null;
  }
}

function computeDamageFromShort(
  short: string,
  casterLevel: number,
  spellLevel: number,
): string | null {
  const perLevelMax = short.match(
    /(\d+)d(\d+)[^.;]*(?:per caster level|\/level)[^.;]*\(max(?:imum)?\s+(\d+)d/i,
  );
  if (perLevelMax) {
    const count = Math.min(casterLevel, Number(perLevelMax[3]));
    const typeMatch = short.match(/\b(fire|cold|acid|electricity|sonic|force|negative)\b/i);
    const typeSuffix = typeMatch ? ` ${typeMatch[1].toLowerCase()}` : "";
    return `${count}d${perLevelMax[2]}${typeSuffix}`.trim();
  }

  if (/missile/i.test(short)) {
    const maxMatch = short.match(/max\s+(\d+)/i);
    const maxMissiles = maxMatch ? Number(maxMatch[1]) : 5;
    const missiles = Math.min(
      1 + Math.floor(Math.max(0, casterLevel - spellLevel) / 2),
      maxMissiles,
    );
    return `${missiles}× (1d4+1) force (${missiles}d4+${missiles})`;
  }

  const bonusPerLevel = short.match(/(\d+d\d+)\s+damage\s+\+(\d+)\/level\s+\(max\s+\+(\d+)\)/i);
  if (bonusPerLevel) {
    const bonus = Math.min(casterLevel, Number(bonusPerLevel[3]));
    return `${bonusPerLevel[1]}+${bonus}`;
  }

  return null;
}

function applySaveDc(save: string | null, context: SpellCastContext): string | null {
  if (!save) return null;
  if (/\bDC\s+\d+/i.test(save)) return save;
  return `${save} (DC ${spellSaveDc(context)})`;
}

function buildBaseDetails(name: string, spellLevel: number): {
  details: SpellCastDetails;
  short: string | null;
  actions: SpellFollowUpAction[];
} {
  const hit = tryLookupSrdSpell(name);
  if (!hit) {
    return { details: EMPTY, short: null, actions: [] };
  }

  const save = normalizeDetail(hit.save);
  const actions: SpellFollowUpAction[] = [];
  if (hit.action2) actions.push(hit.action2 as SpellFollowUpAction);
  if (hit.actions) actions.push(...(hit.actions as SpellFollowUpAction[]));

  const structuredDamage =
    actions.map((action) => formatFollowUpActionStatic(action)).find(Boolean) ?? null;
  const short = normalizeDetail(hit.short);

  let damage = structuredDamage;
  let effect: string | null = null;

  if (structuredDamage) {
    effect = short && !shortLooksLikeDamage(short) ? short : null;
  } else if (short && shortLooksLikeDamage(short)) {
    damage = short;
  } else {
    effect = short;
  }

  void spellLevel;
  return {
    details: { save, damage, effect },
    short,
    actions,
  };
}

function formatFollowUpActionStatic(action: SpellFollowUpAction | undefined): string | null {
  if (!action) return null;
  switch (action.type) {
    case "damage": {
      const dice = action.dice.startsWith("d") ? `1${action.dice}` : action.dice;
      let text = dice;
      if (action.dicestat === "cl") {
        text = `${dice}/level`;
        if (action.dicestatmax) text += ` (max ${action.dicestatmax}${action.dice})`;
      } else if (action.bonus) {
        text += action.bonus > 0 ? `+${action.bonus}` : String(action.bonus);
      }
      if (action.dmgType) text += ` ${action.dmgType}`;
      return text;
    }
    case "heal": {
      const dice = action.dice.startsWith("d") ? `1${action.dice}` : action.dice;
      return `${dice}+1/level (max +${action.statmax})`;
    }
    case "effect":
      return action.label;
    default:
      return null;
  }
}

function shortLooksLikeDamage(short: string): boolean {
  if (/\d+d\d+/.test(short)) return true;
  if (/damage|healing|cures|deals|\d+\s*hp\b/i.test(short)) return true;
  if (/\+\d+\s*\/\s*level|\d+d\d+\s*\/\s*level|\d+\s*\/\s*level\s*\(max/i.test(short)) {
    return true;
  }
  return false;
}

function resolveDamage(
  base: SpellCastDetails,
  short: string | null,
  actions: SpellFollowUpAction[],
  context: SpellCastContext,
): string | null {
  for (const action of actions) {
    const computed = computeDamageFromAction(action, context.casterLevel, short);
    if (computed) return computed;
  }

  if (base.damage && short) {
    const fromShort = computeDamageFromShort(short, context.casterLevel, context.spellLevel);
    if (fromShort) return fromShort;
  }

  if (base.damage && shortLooksLikeDamage(base.damage)) {
    const fromShort = computeDamageFromShort(
      base.damage,
      context.casterLevel,
      context.spellLevel,
    );
    if (fromShort) return fromShort;
  }

  return base.damage;
}

export function resolveSpellCastDetails(
  name: string,
  context: SpellCastContext,
): SpellCastDetails {
  const { details: base, short, actions } = buildBaseDetails(name, context.spellLevel);
  return {
    save: applySaveDc(base.save, context),
    damage: resolveDamage(base, short, actions, context),
    effect: base.effect,
  };
}

export function getSpellCastDetailsFromSrd(name: string, level: number): SpellCastDetails {
  const { details } = buildBaseDetails(name, level);
  return details;
}

export function getSpellCastDetailsFromFields(
  fields: Record<string, string | null>,
  descriptionText?: string | null,
  context?: SpellCastContext,
): SpellCastDetails {
  const save = normalizeDetail(fields["Saving Throw"]);
  const effect =
    normalizeDetail(descriptionText?.split("\n").find((line) => line.trim()) ?? null) ?? null;
  return {
    save: context ? applySaveDc(save, context) : save,
    damage: null,
    effect,
  };
}

export function mergeSpellCastDetails(
  primary: SpellCastDetails,
  fallback: SpellCastDetails,
): SpellCastDetails {
  return {
    save: primary.save ?? fallback.save,
    damage: primary.damage ?? fallback.damage,
    effect: primary.effect ?? fallback.effect,
  };
}

export function hasSpellCastDetails(details: SpellCastDetails): boolean {
  return Boolean(details.save || details.damage || details.effect);
}
