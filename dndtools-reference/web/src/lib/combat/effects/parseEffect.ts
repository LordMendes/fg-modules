import type { EffectComponent } from "../types";
import {
  abilityFromTag,
  isAttackDescriptor,
  isBareFlagTag,
  isKnownTag,
  normalizeCondition,
  parseBonusType,
  parseDamageType,
  parseNumericOrDice,
  type BareFlagTag,
  type ValueTag,
} from "./grammar";

export type ParseEffectResult = {
  components: EffectComponent[];
  warnings: string[];
};

const DICE_VALUE_TAGS = new Set(["DMG", "DMGO"]);
const BYPASS_TAGS = new Set(["DR", "REGEN"]);
const TYPE_AMOUNT_TAGS = new Set(["RESIST"]);
const IMMUNE_SPECIAL_TYPES = new Set(["crit", "precision", "nonlethal"]);

/**
 * Parse a Fantasy Grounds-style effect string into structured components.
 * Never throws on user text; returns warnings for unrecognized input.
 */
export function parseEffect(input: string): ParseEffectResult {
  const warnings: string[] = [];
  const components: EffectComponent[] = [];

  const trimmed = input.trim();
  if (!trimmed) {
    return { components, warnings };
  }

  const clauses = trimmed.split(";").map((c) => c.trim()).filter(Boolean);

  for (const clause of clauses) {
    const condition = normalizeCondition(clause);
    if (condition) {
      components.push({ tag: "COND", condition });
      continue;
    }

    if (isBareFlagTag(clause)) {
      components.push({ tag: clause as BareFlagTag });
      continue;
    }

    const colonIdx = clause.indexOf(":");
    if (colonIdx === -1) {
      components.push({ tag: "LABEL", text: clause });
      continue;
    }

    const rawTag = clause.slice(0, colonIdx).trim();
    const tag = rawTag.toUpperCase();

    if (!isKnownTag(tag)) {
      warnings.push(`Unknown tag: ${rawTag}`);
      components.push({ tag: "LABEL", text: clause });
      continue;
    }

    const remainder = clause.slice(colonIdx + 1).trim();
    const parsed = parseTagClause(tag, remainder, warnings);
    if (parsed) {
      components.push(parsed);
    }
  }

  return { components, warnings };
}

function parseTagClause(
  tag: string,
  remainder: string,
  warnings: string[],
): EffectComponent | null {
  const ability = abilityFromTag(tag);
  if (ability) {
    return parseAbilityClause(ability, remainder, warnings);
  }

  if (tag === "IMMUNE") {
    return parseImmuneClause(remainder, warnings);
  }

  if (tag === "VULN") {
    return parseVulnClause(remainder, warnings);
  }

  if (tag === "CONC" || tag === "TCONC" || tag === "COVER" || tag === "SCOVER") {
    if (remainder) {
      warnings.push(`Unexpected value for ${tag}: ${remainder}`);
    }
    return { tag: tag as BareFlagTag };
  }

  if (DICE_VALUE_TAGS.has(tag)) {
    return parseDamageClause(tag as "DMG" | "DMGO", remainder, warnings);
  }

  if (BYPASS_TAGS.has(tag)) {
    return parseBypassClause(tag as "DR" | "REGEN", remainder, warnings);
  }

  if (TYPE_AMOUNT_TAGS.has(tag)) {
    return parseResistVulnClause(tag as "RESIST" | "VULN", remainder, warnings);
  }

  if (tag === "FHEAL") {
    return parseAmountClause(tag, remainder, warnings);
  }

  return parseModifierClause(tag as ValueTag, remainder, warnings);
}

function parseAbilityClause(
  ability: NonNullable<ReturnType<typeof abilityFromTag>>,
  remainder: string,
  warnings: string[],
): EffectComponent | null {
  const { valuePart, bonusType, descriptors } = splitRemainder(remainder, warnings);
  const numeric = parseNumericOrDice(valuePart);
  if (!numeric) {
    warnings.push(`Missing or invalid value for ${ability.toUpperCase()}: ${remainder}`);
    return null;
  }
  if (descriptors.length > 0) {
    warnings.push(`Ignored descriptors on ${ability.toUpperCase()}: ${descriptors.join(" ")}`);
  }
  return {
    tag: "ABIL",
    ability,
    value: numeric.value,
    ...(bonusType ? { bonusType } : {}),
  };
}

function parseModifierClause(
  tag: ValueTag,
  remainder: string,
  warnings: string[],
): EffectComponent | null {
  const { valuePart, bonusType, descriptors } = splitRemainder(remainder, warnings);
  const numeric = parseNumericOrDice(valuePart);
  if (!numeric) {
    warnings.push(`Missing or invalid value for ${tag}: ${remainder}`);
    return null;
  }
  return {
    tag,
    value: numeric.value,
    descriptors,
    ...(bonusType ? { bonusType } : {}),
  } as EffectComponent;
}

function parseDamageClause(
  tag: "DMG" | "DMGO",
  remainder: string,
  warnings: string[],
): EffectComponent | null {
  const { valuePart, bonusType, descriptors, damageTypes } = splitRemainder(
    remainder,
    warnings,
    { collectDamageTypes: true },
  );

  if (bonusType) {
    warnings.push(`Ignored bonus type on ${tag}: ${bonusType}`);
  }

  const numeric = parseNumericOrDice(valuePart);
  if (!numeric) {
    warnings.push(`Missing or invalid value for ${tag}: ${remainder}`);
    return null;
  }

  if (tag === "DMGO") {
    if (!numeric.dice) {
      warnings.push(`DMGO expects dice notation: ${remainder}`);
    }
    return {
      tag: "DMGO",
      dice: numeric.dice || valuePart,
      types: damageTypes,
    };
  }

  return {
    tag: "DMG",
    dice: numeric.dice,
    value: numeric.value,
    types: damageTypes,
    descriptors,
  };
}

function parseBypassClause(
  tag: "DR" | "REGEN",
  remainder: string,
  warnings: string[],
): EffectComponent | null {
  const { valuePart, bonusType, descriptors, damageTypes } = splitRemainder(
    remainder,
    warnings,
    { collectDamageTypes: true },
  );

  if (bonusType) {
    warnings.push(`Ignored bonus type on ${tag}: ${bonusType}`);
  }
  if (descriptors.length > 0) {
    warnings.push(`Ignored descriptors on ${tag}: ${descriptors.join(" ")}`);
  }

  const numeric = parseNumericOrDice(valuePart);
  if (!numeric) {
    warnings.push(`Missing or invalid amount for ${tag}: ${remainder}`);
    return null;
  }

  if (tag === "DR") {
    return { tag: "DR", amount: numeric.value, bypass: damageTypes };
  }

  return { tag: "REGEN", amount: numeric.value, bypass: damageTypes };
}

function parseResistVulnClause(
  tag: "RESIST" | "VULN",
  remainder: string,
  warnings: string[],
): EffectComponent | null {
  const { valuePart, bonusType, descriptors, damageTypes } = splitRemainder(
    remainder,
    warnings,
    { collectDamageTypes: true },
  );

  if (bonusType) {
    warnings.push(`Ignored bonus type on ${tag}: ${bonusType}`);
  }
  if (descriptors.length > 0) {
    warnings.push(`Ignored descriptors on ${tag}: ${descriptors.join(" ")}`);
  }

  const numeric = parseNumericOrDice(valuePart);
  if (!numeric) {
    warnings.push(`Missing or invalid amount for ${tag}: ${remainder}`);
    return null;
  }

  if (damageTypes.length === 0) {
    warnings.push(`${tag} requires at least one damage type: ${remainder}`);
  }

  return { tag, amount: numeric.value, types: damageTypes };
}

function parseImmuneClause(
  remainder: string,
  warnings: string[],
): EffectComponent | null {
  const { damageTypes, descriptors, bonusType } = splitRemainder(remainder, warnings, {
    collectDamageTypes: true,
    noValue: true,
  });

  if (bonusType) {
    warnings.push(`Ignored bonus type on IMMUNE: ${bonusType}`);
  }

  const types = collectImmuneTypes(damageTypes, descriptors, warnings, "IMMUNE");
  if (types.length === 0) {
    warnings.push(`IMMUNE requires at least one type: ${remainder}`);
    return null;
  }

  return { tag: "IMMUNE", types };
}

function parseVulnClause(
  remainder: string,
  warnings: string[],
): EffectComponent | null {
  const { damageTypes, descriptors, bonusType } = splitRemainder(remainder, warnings, {
    collectDamageTypes: true,
    noValue: true,
  });

  if (bonusType) {
    warnings.push(`Ignored bonus type on VULN: ${bonusType}`);
  }

  const types = collectImmuneTypes(damageTypes, descriptors, warnings, "VULN");
  if (types.length === 0) {
    warnings.push(`VULN requires at least one type: ${remainder}`);
    return null;
  }

  return { tag: "VULN", amount: 0, types };
}

function collectImmuneTypes(
  damageTypes: import("../types").DamageType[],
  descriptors: string[],
  warnings: string[],
  tag: string,
): import("../types").DamageType[] {
  const types = [...damageTypes];
  for (const desc of descriptors) {
    const lower = desc.toLowerCase();
    if (IMMUNE_SPECIAL_TYPES.has(lower)) {
      if (!types.includes(lower as import("../types").DamageType)) {
        types.push(lower as import("../types").DamageType);
      }
    } else {
      warnings.push(`Unknown ${tag} descriptor: ${desc}`);
    }
  }
  return types;
}

function parseAmountClause(
  tag: "FHEAL",
  remainder: string,
  warnings: string[],
): EffectComponent | null {
  const numeric = parseNumericOrDice(remainder.trim());
  if (!numeric) {
    warnings.push(`Missing or invalid amount for ${tag}: ${remainder}`);
    return null;
  }
  return { tag: "FHEAL", amount: numeric.value };
}

type SplitOptions = {
  collectDamageTypes?: boolean;
  noValue?: boolean;
};

type SplitResult = {
  valuePart: string;
  bonusType?: import("../types").BonusType;
  descriptors: string[];
  damageTypes: import("../types").DamageType[];
};

function splitRemainder(
  remainder: string,
  warnings: string[],
  options: SplitOptions = {},
): SplitResult {
  const tokens = tokenize(remainder);
  const damageTypes: import("../types").DamageType[] = [];
  const descriptors: string[] = [];
  let bonusType: import("../types").BonusType | undefined;
  let valuePart = "";
  let i = 0;

  if (!options.noValue && tokens.length > 0) {
    const first = tokens[0]!;
    const numeric = parseNumericOrDice(first);
    if (numeric) {
      valuePart = first;
      i = 1;
    }
  }

  while (i < tokens.length) {
    const token = tokens[i]!;

    if (token.toLowerCase() === "vs") {
      const vsParts: string[] = [];
      i += 1;
      while (i < tokens.length) {
        const next = tokens[i]!;
        const dmg = options.collectDamageTypes ? parseDamageType(next) : null;
        const bonus = parseBonusType(next);
        if (dmg || bonus || isAttackDescriptor(next)) {
          break;
        }
        vsParts.push(next);
        i += 1;
      }
      if (vsParts.length > 0) {
        descriptors.push(`vs ${vsParts.join(" ")}`);
      } else {
        warnings.push(`Expected descriptor after "vs" in: ${remainder}`);
      }
      continue;
    }

    const dmg = options.collectDamageTypes ? parseDamageType(token) : null;
    if (dmg) {
      if (!damageTypes.includes(dmg)) {
        damageTypes.push(dmg);
      }
      i += 1;
      continue;
    }

    const bonus = parseBonusType(token);
    if (bonus && !bonusType) {
      bonusType = bonus;
      i += 1;
      continue;
    }

    if (isAttackDescriptor(token)) {
      descriptors.push(token.toLowerCase());
      i += 1;
      continue;
    }

    if (options.collectDamageTypes) {
      warnings.push(`Unknown descriptor: ${token}`);
    } else {
      descriptors.push(token);
    }
    i += 1;
  }

  return { valuePart, bonusType, descriptors, damageTypes };
}

/** Split on whitespace while keeping "cold iron" as one token. */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const lower = text.toLowerCase();
  let i = 0;

  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i]!)) i += 1;
    if (i >= text.length) break;

    if (lower.startsWith("cold iron", i)) {
      tokens.push("cold iron");
      i += "cold iron".length;
      continue;
    }

    if (lower.startsWith("mind-affecting", i)) {
      tokens.push("mind-affecting");
      i += "mind-affecting".length;
      continue;
    }

    const match = /^[^\s]+/.exec(text.slice(i));
    if (match) {
      tokens.push(match[0]!);
      i += match[0]!.length;
    } else {
      i += 1;
    }
  }

  return tokens;
}
