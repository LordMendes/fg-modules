import { abilityModifier, formatModifier } from "./combatStats";
import type {
  AbilityKey,
  DamageAbilityMult,
  FeatEntry,
  InventoryRow,
  PcPlanState,
} from "./types";

function isRangedWeapon(row: InventoryRow): boolean {
  return (row.handed ?? "").toLowerCase() === "ranged";
}

function isLightWeapon(row: InventoryRow): boolean {
  return (row.handed ?? "").toLowerCase() === "light";
}

function isTwoHandedWeapon(row: InventoryRow): boolean {
  return (row.handed ?? "").toLowerCase() === "two";
}

function hasWeaponFinesse(feats: FeatEntry[]): boolean {
  return feats.some((feat) => {
    const name = feat.name.trim().toLowerCase();
    const slug = feat.slug.toLowerCase();
    return (
      name === "weapon finesse" ||
      slug === "weapon-finesse" ||
      slug.startsWith("weapon-finesse-")
    );
  });
}

export type ResolvedWeaponAbility = {
  key: AbilityKey | "none";
  mod: number;
  label: string;
};

export type ResolvedDamageAbility = ResolvedWeaponAbility & {
  mult: DamageAbilityMult;
};

const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: "Str",
  dex: "Dex",
  con: "Con",
  int: "Int",
  wis: "Wis",
  cha: "Cha",
};

export function abilityChoiceLabel(key: AbilityKey | "none"): string {
  if (key === "none") return "None";
  return ABILITY_LABELS[key];
}

/** Default attack ability: Dex ranged/finesse light melee, else Str. */
export function defaultAttackAbility(
  item: InventoryRow,
  feats: PcPlanState["feats"],
): AbilityKey {
  const mode = isRangedWeapon(item) ? "ranged" : "melee";
  const light = isLightWeapon(item);
  const finesse = hasWeaponFinesse(feats);
  if (mode === "ranged" || (finesse && light && mode === "melee")) {
    return "dex";
  }
  return "str";
}

/** Default damage ability: Str melee, none ranged. */
export function defaultDamageAbility(item: InventoryRow): AbilityKey | "none" {
  return isRangedWeapon(item) ? "none" : "str";
}

/** Default damage multiplier: 1.5 two-handed, else 1. */
export function defaultDamageAbilityMult(item: InventoryRow): DamageAbilityMult {
  return isTwoHandedWeapon(item) ? 1.5 : 1;
}

type WeaponAbilityContext = Pick<PcPlanState, "abilities" | "feats">;

export function resolveAttackAbility(
  item: InventoryRow,
  state: WeaponAbilityContext,
): ResolvedWeaponAbility {
  const autoKey = defaultAttackAbility(item, state.feats);
  const choice = item.attackAbility;
  if (choice === undefined) {
    const mod = abilityModifier(state.abilities[autoKey]);
    return { key: autoKey, mod, label: ABILITY_LABELS[autoKey] };
  }
  if (choice === "none") {
    return { key: "none", mod: 0, label: "None" };
  }
  const mod = abilityModifier(state.abilities[choice]);
  return { key: choice, mod, label: ABILITY_LABELS[choice] };
}

export function resolveDamageAbilityMult(item: InventoryRow): DamageAbilityMult {
  return item.damageAbilityMult ?? defaultDamageAbilityMult(item);
}

/**
 * Apply multiplier to a positive ability mod (1.5 rounds down).
 * Negative mods use the full penalty.
 */
export function applyDamageAbilityMult(
  mod: number,
  mult: DamageAbilityMult,
): number {
  if (mod <= 0 || mult === 1) return mod;
  return Math.floor(mod * mult);
}

export function resolveDamageAbility(
  item: InventoryRow,
  state: WeaponAbilityContext,
): ResolvedDamageAbility {
  const autoKey = defaultDamageAbility(item);
  const mult = resolveDamageAbilityMult(item);
  const choice = item.damageAbility;
  let key: AbilityKey | "none";
  if (choice === undefined) {
    key = autoKey;
  } else {
    key = choice;
  }
  const rawMod =
    key === "none" ? 0 : abilityModifier(state.abilities[key as AbilityKey]);
  const mod = applyDamageAbilityMult(rawMod, mult);
  const label = key === "none" ? "None" : ABILITY_LABELS[key as AbilityKey];
  return { key, mod, label, mult };
}

/** Editor / preview: format ability line with optional multiplier. */
export function formatDamageAbilityLine(resolved: ResolvedDamageAbility): string {
  if (resolved.key === "none" || resolved.mod === 0) return "";
  const multSuffix = resolved.mult === 1.5 ? " x1.5" : "";
  return `${resolved.label}${multSuffix} (${formatModifier(resolved.mod)})`;
}

export type WeaponCompositionContext = {
  abilities: PcPlanState["abilities"];
  feats: FeatEntry[];
};

/** Item-scoped attack bonus parts for the editor summary line. */
export function buildAttackCompositionSummary(
  item: InventoryRow,
  ctx: WeaponCompositionContext,
  parts: {
    magicAttack: number;
    attackMisc: number;
    featAttackParts: { label: string; amount: number }[];
  },
): string {
  const attack = resolveAttackAbility(item, ctx);
  const segments: string[] = [];
  if (attack.key !== "none" && attack.mod !== 0) {
    segments.push(`${attack.label} ${formatModifier(attack.mod)}`);
  }
  if (parts.attackMisc !== 0) {
    segments.push(`misc ${formatModifier(parts.attackMisc)}`);
  }
  if (parts.magicAttack !== 0) {
    const label =
      (item.enhancementBonus ?? 0) > 0 ? "enhancement" : "masterwork";
    segments.push(`${label} ${formatModifier(parts.magicAttack)}`);
  }
  for (const part of parts.featAttackParts) {
    if (part.amount !== 0) {
      segments.push(`${part.label} ${formatModifier(part.amount)}`);
    }
  }
  return segments.length > 0 ? segments.join(" + ") : "No attack modifiers";
}

/** Item-scoped damage summary for the editor (dice + ability + misc + magic + feats). */
export function buildDamageCompositionSummary(
  item: InventoryRow,
  ctx: WeaponCompositionContext,
  parts: {
    primaryDice: string;
    magicDamage: number;
    damageMisc: number;
    featDamageParts: { label: string; amount: number }[];
  },
): string {
  const damage = resolveDamageAbility(item, ctx);
  const segments: string[] = [];
  if (parts.primaryDice) segments.push(parts.primaryDice);
  const abilityLine = formatDamageAbilityLine(damage);
  if (abilityLine) segments.push(abilityLine);
  if (parts.damageMisc !== 0) {
    segments.push(`misc ${formatModifier(parts.damageMisc)}`);
  }
  if (parts.magicDamage !== 0) {
    segments.push(`enhancement ${formatModifier(parts.magicDamage)}`);
  }
  for (const part of parts.featDamageParts) {
    if (part.amount !== 0) {
      segments.push(`${part.label} ${formatModifier(part.amount)}`);
    }
  }
  return segments.length > 0 ? segments.join(" + ") : "No damage modifiers";
}
