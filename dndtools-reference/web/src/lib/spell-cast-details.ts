import type { SpellFollowUpAction } from "@/lib/fg-spell-actions/types";
import { tryLookupSrdSpell } from "@/lib/npc-creator/srdSpellLookup";

export type SpellCastDetails = {
  save: string | null;
  damage: string | null;
  effect: string | null;
};

const EMPTY: SpellCastDetails = { save: null, damage: null, effect: null };

function normalizeDetail(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || /^none$/i.test(trimmed)) return null;
  return trimmed;
}

function formatFollowUpAction(action: SpellFollowUpAction | undefined): string | null {
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

function formatFollowUps(actions: SpellFollowUpAction[] | undefined): string | null {
  if (!actions?.length) return null;
  const parts = actions.map(formatFollowUpAction).filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : null;
}

function shortLooksLikeDamage(short: string): boolean {
  return /\d+d\d+|\/level|damage|healing|cures|deals|hp\b/i.test(short);
}

export function getSpellCastDetailsFromSrd(name: string, level: number): SpellCastDetails {
  const hit = tryLookupSrdSpell(name);
  if (!hit) return EMPTY;

  const save = normalizeDetail(hit.save);
  const structuredDamage =
    formatFollowUpAction(hit.action2 as SpellFollowUpAction | undefined) ??
    formatFollowUps(hit.actions as SpellFollowUpAction[] | undefined);
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

  void level;
  return { save, damage, effect };
}

export function getSpellCastDetailsFromFields(
  fields: Record<string, string | null>,
  descriptionText?: string | null,
): SpellCastDetails {
  const save = normalizeDetail(fields["Saving Throw"]);
  const effect =
    normalizeDetail(descriptionText?.split("\n").find((line) => line.trim()) ?? null) ?? null;
  return { save, damage: null, effect };
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
