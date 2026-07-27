import { WEAPON_ABILITY_BY_ID } from "./data/weapon-abilities";
import { WEAPON_BY_ID } from "./data/weapons";
import type {
  CraftBreakdown,
  PriceBreakdown,
  SelectedWeaponAbility,
  WeaponBuildState,
} from "./types";
import {
  MASTERWORK_COST_GP,
  MAX_ENHANCEMENT_EQUIVALENT,
} from "./types";

const ENHANCEMENT_GP_PER_SQUARE = 2000;

export function enhancementMagicCostWeapon(equivalentTotal: number): number {
  if (equivalentTotal <= 0) return 0;
  return equivalentTotal * equivalentTotal * ENHANCEMENT_GP_PER_SQUARE;
}

function abilityEquivalent(selected: SelectedWeaponAbility): number {
  const ability = WEAPON_ABILITY_BY_ID.get(selected.abilityId);
  if (!ability) return 0;
  if (ability.pricing.kind === "equivalent") return ability.pricing.bonus;
  return 0;
}

function abilityFlatGp(selected: SelectedWeaponAbility): number {
  const ability = WEAPON_ABILITY_BY_ID.get(selected.abilityId);
  if (!ability) return 0;
  if (ability.pricing.kind === "flat") return ability.pricing.gp;
  return 0;
}

function abilityDisplayName(selected: SelectedWeaponAbility): string {
  const ability = WEAPON_ABILITY_BY_ID.get(selected.abilityId);
  if (!ability) return selected.abilityId;
  if (selected.subtype) return `${selected.subtype} ${ability.name.toLowerCase()}`;
  return ability.name.toLowerCase();
}

export function formatWeaponItemName(state: WeaponBuildState): string {
  const weapon = WEAPON_BY_ID.get(state.weaponId);
  if (!weapon) return "";

  const abilityNames = state.abilities.map(abilityDisplayName);
  const prefixParts: string[] = [];

  if (state.enhancementBonus > 0) {
    prefixParts.push(`+${state.enhancementBonus}`);
  }

  prefixParts.push(...abilityNames);

  const prefix = prefixParts.join(" ");
  return prefix ? `${prefix} ${weapon.name.toLowerCase()}` : weapon.name.toLowerCase();
}

export function computeWeaponPrice(state: WeaponBuildState): PriceBreakdown {
  const weapon = WEAPON_BY_ID.get(state.weaponId);
  const warnings: string[] = [];
  const lines: PriceBreakdown["lines"] = [];

  if (!weapon) {
    return {
      lines: [],
      totalGp: 0,
      equivalentTotal: 0,
      warnings: ["Invalid weapon."],
      itemName: "",
    };
  }

  const abilityEquivalentTotal = state.abilities.reduce(
    (sum, sel) => sum + abilityEquivalent(sel),
    0,
  );
  const flatAbilityTotal = state.abilities.reduce(
    (sum, sel) => sum + abilityFlatGp(sel),
    0,
  );
  const equivalentTotal = state.enhancementBonus + abilityEquivalentTotal;

  if (state.abilities.length > 0 && state.enhancementBonus < 1) {
    warnings.push(
      "Weapons with special abilities require at least +1 enhancement bonus (SRD).",
    );
  }

  for (const selected of state.abilities) {
    const ability = WEAPON_ABILITY_BY_ID.get(selected.abilityId);
    if (ability?.subtype && !selected.subtype) {
      warnings.push(`${ability.name} requires a subtype (e.g. undead).`);
    }
  }

  if (equivalentTotal > MAX_ENHANCEMENT_EQUIVALENT) {
    warnings.push(
      `Equivalent total (+${equivalentTotal}) exceeds the maximum of +${MAX_ENHANCEMENT_EQUIVALENT}.`,
    );
  }

  if (weapon.costGp > 0) {
    lines.push({ label: weapon.name, gp: weapon.costGp });
  }

  const isMagic = equivalentTotal > 0 || flatAbilityTotal > 0;
  if (isMagic) {
    lines.push({ label: "Masterwork", gp: MASTERWORK_COST_GP });
  }

  if (equivalentTotal > 0) {
    const magicGp = enhancementMagicCostWeapon(equivalentTotal);
    lines.push({
      label: `Magic component (+${equivalentTotal} equivalent)`,
      gp: magicGp,
    });
  }

  for (const selected of state.abilities) {
    const flatGp = abilityFlatGp(selected);
    if (flatGp > 0) {
      lines.push({ label: abilityDisplayName(selected), gp: flatGp });
    }
  }

  const totalGp = lines.reduce((sum, line) => sum + line.gp, 0);

  return {
    lines,
    totalGp,
    equivalentTotal,
    warnings,
    itemName: formatWeaponItemName(state),
  };
}

export function computeWeaponCrafting(
  totalGp: number,
  enhancementBonus: number,
  abilities: SelectedWeaponAbility[],
): CraftBreakdown {
  const materialsGp = Math.round(totalGp / 2);
  const xp = Math.floor(totalGp / 25);
  const days = Math.max(1, Math.ceil(totalGp / 1000));

  const abilityLevels = abilities
    .map((sel) => WEAPON_ABILITY_BY_ID.get(sel.abilityId)?.minCasterLevel ?? 0)
    .filter((cl) => cl > 0);

  const minFromEnhancement = enhancementBonus > 0 ? enhancementBonus * 3 : 0;
  const minFromAbilities =
    abilityLevels.length > 0 ? Math.max(...abilityLevels) : 0;
  const minCasterLevel = Math.max(minFromEnhancement, minFromAbilities);

  return { materialsGp, xp, days, minCasterLevel };
}
