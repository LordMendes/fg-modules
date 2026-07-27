import { ARMOR_ABILITY_BY_ID } from "./data/armor-abilities";
import { GEAR_BY_ID } from "./data/armor";
import type {
  ArmorBuildState,
  CraftBreakdown,
  PriceBreakdown,
  SelectedArmorAbility,
} from "./types";
import { MAX_ENHANCEMENT_EQUIVALENT } from "./types";

const ENHANCEMENT_GP_PER_SQUARE = 1000;

export function enhancementMagicCostArmor(equivalentTotal: number): number {
  if (equivalentTotal <= 0) return 0;
  return equivalentTotal * equivalentTotal * ENHANCEMENT_GP_PER_SQUARE;
}

function abilityEquivalent(selected: SelectedArmorAbility): number {
  const ability = ARMOR_ABILITY_BY_ID.get(selected.abilityId);
  if (!ability) return 0;
  if (ability.pricing.kind === "equivalent") return ability.pricing.bonus;
  return 0;
}

function abilityFlatGp(selected: SelectedArmorAbility): number {
  const ability = ARMOR_ABILITY_BY_ID.get(selected.abilityId);
  if (!ability) return 0;
  if (ability.pricing.kind === "flat") return ability.pricing.gp;
  return 0;
}

function abilityDisplayName(selected: SelectedArmorAbility): string {
  const ability = ARMOR_ABILITY_BY_ID.get(selected.abilityId);
  if (!ability) return selected.abilityId;
  return ability.name.toLowerCase();
}

export function formatArmorItemName(state: ArmorBuildState): string {
  const gear = GEAR_BY_ID.get(state.gearId);
  if (!gear) return "";

  const abilityNames = state.abilities.map(abilityDisplayName);
  const prefixParts: string[] = [];

  if (state.enhancementBonus > 0) {
    prefixParts.push(`+${state.enhancementBonus}`);
  }

  prefixParts.push(...abilityNames);

  const prefix = prefixParts.join(" ");
  return prefix ? `${prefix} ${gear.name.toLowerCase()}` : gear.name.toLowerCase();
}

export function computeArmorPrice(state: ArmorBuildState): PriceBreakdown {
  const gear = GEAR_BY_ID.get(state.gearId);
  const warnings: string[] = [];
  const lines: PriceBreakdown["lines"] = [];

  if (!gear) {
    return {
      lines: [],
      totalGp: 0,
      equivalentTotal: 0,
      warnings: ["Invalid armor or shield."],
      itemName: "",
    };
  }

  const abilityEquivalentTotal = state.abilities.reduce(
    (sum, sel) => sum + abilityEquivalent(sel),
    0,
  );
  const equivalentTotal = state.enhancementBonus + abilityEquivalentTotal;

  if (state.abilities.length > 0 && state.enhancementBonus < 1) {
    warnings.push(
      "Armor and shields with special abilities require at least +1 enhancement bonus (SRD).",
    );
  }

  if (equivalentTotal > MAX_ENHANCEMENT_EQUIVALENT) {
    warnings.push(
      `Equivalent total (+${equivalentTotal}) exceeds the maximum of +${MAX_ENHANCEMENT_EQUIVALENT}.`,
    );
  }

  if (gear.costGp > 0) {
    lines.push({ label: gear.name, gp: gear.costGp });
  }

  if (equivalentTotal > 0) {
    const magicGp = enhancementMagicCostArmor(equivalentTotal);
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
    itemName: formatArmorItemName(state),
  };
}

export function computeArmorCrafting(
  totalGp: number,
  enhancementBonus: number,
  abilities: SelectedArmorAbility[],
): CraftBreakdown {
  const materialsGp = Math.round(totalGp / 2);
  const xp = Math.floor(totalGp / 25);
  const days = Math.max(1, Math.ceil(totalGp / 1000));

  const abilityLevels = abilities
    .map((sel) => ARMOR_ABILITY_BY_ID.get(sel.abilityId)?.minCasterLevel ?? 0)
    .filter((cl) => cl > 0);

  const minFromEnhancement = enhancementBonus > 0 ? enhancementBonus * 3 : 0;
  const minFromAbilities =
    abilityLevels.length > 0 ? Math.max(...abilityLevels) : 0;
  const minCasterLevel = Math.max(minFromEnhancement, minFromAbilities);

  return { materialsGp, xp, days, minCasterLevel };
}
