import { COMPONENT_MAP, QUALITY_RANK } from "./components";
import {
  getDepthAdjustmentPerSpace,
  getHeightDepthCost,
} from "./height-depth";
import {
  getClimateModifier,
  getNearbyFeatureModifier,
  getSettlementModifier,
  getTerrainModifier,
  NEARBY_FEATURE_OPTIONS,
  SETTLEMENT_OPTIONS,
  TERRAIN_OPTIONS,
  CLIMATE_OPTIONS,
} from "./site-modifiers";
import {
  getHeightSpellDiscountPercent,
  getHewnStoneSpellDiscount,
  getWoodSpellDiscount,
} from "./spell-discounts";
import { getStaffWage } from "./staff";
import type {
  ComponentPrerequisite,
  ComponentQuality,
  SelectedComponent,
  StaffRoleKey,
  StrongholdComponent,
  StrongholdInput,
  StrongholdResult,
  StrongholdWarning,
  WallMaterialKey,
} from "./types";
import {
  getTerrainWallDiscountPercent,
  getWallMaterialCost,
  getWallPercentages,
} from "./walls";

function mergeStaff(
  base: Partial<Record<StaffRoleKey, number>>,
  addition: Partial<Record<StaffRoleKey, number>>,
): Partial<Record<StaffRoleKey, number>> {
  const result = { ...base };
  for (const [role, count] of Object.entries(addition)) {
    const key = role as StaffRoleKey;
    result[key] = (result[key] ?? 0) + (count ?? 0);
  }
  return result;
}

function expandComponents(
  selections: SelectedComponent[],
): { component: StrongholdComponent; quantity: number }[] {
  const expanded: { component: StrongholdComponent; quantity: number }[] = [];
  for (const sel of selections) {
    const component = COMPONENT_MAP.get(sel.componentId);
    if (!component || sel.quantity <= 0) continue;
    expanded.push({ component, quantity: sel.quantity });
  }
  return expanded;
}

function hasComponentFamily(
  expanded: { component: StrongholdComponent; quantity: number }[],
  match: string,
  orBetter?: boolean,
): boolean {
  for (const { component, quantity } of expanded) {
    if (quantity <= 0) continue;
    if (orBetter && component.family === match) {
      return true;
    }
    if (!orBetter && component.id === match) {
      return true;
    }
    if (orBetter && component.id.startsWith(match)) {
      return true;
    }
    if (orBetter && component.family === match.replace(/-basic|-fancy|-luxury$/, "")) {
      return true;
    }
  }

  for (const { component, quantity } of expanded) {
    if (quantity <= 0) continue;
    if (component.id === match) return true;
    if (orBetter && component.family) {
      const familyMatch = match.replace(/-basic|-fancy|-luxury$/, "");
      if (
        component.family === familyMatch ||
        component.family === match ||
        component.id.startsWith(`${match}-`) ||
        component.id.startsWith(`${familyMatch}-`)
      ) {
        return true;
      }
      if (component.family === match) {
        const requiredRank = QUALITY_RANK[match.split("-").pop() ?? ""] ?? -1;
        const compRank = QUALITY_RANK[component.quality ?? "basic"] ?? 0;
        if (compRank >= requiredRank) return true;
      }
    }
  }
  return false;
}

function satisfiesPrerequisite(
  prereq: ComponentPrerequisite,
  expanded: { component: StrongholdComponent; quantity: number }[],
  staff: Partial<Record<StaffRoleKey, number>>,
): boolean {
  if (prereq.type === "staff") {
    return (staff[prereq.role] ?? 0) >= prereq.count;
  }

  if (prereq.orBetter) {
    const family = prereq.match;
    for (const { component, quantity } of expanded) {
      if (quantity <= 0) continue;
      if (
        component.family === family ||
        component.id.startsWith(`${family}-`) ||
        component.id.startsWith(family)
      ) {
        return true;
      }
    }
    return false;
  }

  return hasComponentFamily(expanded, prereq.match, false);
}

function collectPrerequisiteStaff(
  expanded: { component: StrongholdComponent; quantity: number }[],
): Partial<Record<StaffRoleKey, number>> {
  const staff: Partial<Record<StaffRoleKey, number>> = {};
  for (const { component, quantity } of expanded) {
    for (const prereq of component.prerequisites) {
      if (prereq.type === "staff") {
        staff[prereq.role] =
          (staff[prereq.role] ?? 0) + prereq.count * quantity;
      }
    }
  }
  return staff;
}

function validatePrerequisites(
  expanded: { component: StrongholdComponent; quantity: number }[],
  staff: Partial<Record<StaffRoleKey, number>>,
): StrongholdWarning[] {
  const warnings: StrongholdWarning[] = [];
  for (const { component, quantity } of expanded) {
    if (quantity <= 0) continue;
    for (const prereq of component.prerequisites) {
      if (satisfiesPrerequisite(prereq, expanded, staff)) continue;
      if (prereq.type === "component") {
        warnings.push({
          type: "prerequisite",
          message: `${component.name} requires ${prereq.orBetter ? `${prereq.match} or better` : prereq.match}`,
        });
      } else {
        warnings.push({
          type: "staff",
          message: `${component.name} requires ${prereq.count} ${prereq.role}(s)`,
        });
      }
    }
  }
  return warnings;
}

function computeWallSideCost(
  totalSpaces: number,
  percentage: number,
  material: WallMaterialKey,
  terrain: StrongholdInput["terrain"],
  climate: StrongholdInput["climate"],
  spellDiscounts: StrongholdInput["spellDiscounts"],
  isInterior: boolean,
): number {
  if (totalSpaces <= 0 || percentage <= 0) return 0;

  if (material === "wood" && isInterior) {
    return 0;
  }

  let costPerSpace = getWallMaterialCost(material);
  if (costPerSpace <= 0) return 0;

  const terrainDiscount = getTerrainWallDiscountPercent(
    material,
    terrain,
    climate,
  );
  let spellDiscount = 0;
  if (material === "stone-hewn") {
    spellDiscount = getHewnStoneSpellDiscount(spellDiscounts);
  } else if (material === "wood") {
    spellDiscount = getWoodSpellDiscount(spellDiscounts);
  }

  const totalDiscount = Math.min(100, terrainDiscount + spellDiscount);
  costPerSpace = Math.round(costPerSpace * (1 - totalDiscount / 100));

  return Math.round(totalSpaces * costPerSpace * percentage);
}

function countSpacesByQuality(
  expanded: { component: StrongholdComponent; quantity: number }[],
): Record<ComponentQuality | "other", number> {
  const counts: Record<ComponentQuality | "other", number> = {
    basic: 0,
    fancy: 0,
    luxury: 0,
    other: 0,
  };
  for (const { component, quantity } of expanded) {
    const spaces = component.size * quantity;
    if (component.quality) {
      counts[component.quality] += spaces;
    } else {
      counts.other += spaces;
    }
  }
  return counts;
}

function computeFabricateDiscount(
  componentCost: number,
  qualityCounts: Record<ComponentQuality | "other", number>,
  totalSpaces: number,
): number {
  if (totalSpaces <= 0) return 0;
  const avgCostPerSpace = componentCost / totalSpaces;
  let discount = 0;
  discount += qualityCounts.luxury * avgCostPerSpace * 0.5;
  discount += qualityCounts.fancy * avgCostPerSpace * 0.2;
  discount += qualityCounts.other * avgCostPerSpace * 0.05;
  discount += qualityCounts.basic * avgCostPerSpace * 0.05;
  return Math.round(discount);
}

export function calculateStronghold(input: StrongholdInput): StrongholdResult {
  const expanded = expandComponents(input.components);

  let componentCost = 0;
  let totalSpaces = 0;
  const lineItems: StrongholdResult["lineItems"] = [];

  for (const { component, quantity } of expanded) {
    const cost = component.cost * quantity;
    const spaces = component.size * quantity;
    componentCost += cost;
    totalSpaces += spaces;
    lineItems.push({
      label: `${component.name}${quantity > 1 ? ` × ${quantity}` : ""}`,
      amount: cost,
      detail: `${spaces} ss`,
    });
  }

  let heightDepthCost = getHeightDepthCost(
    totalSpaces,
    input.storiesAboveGround,
    input.subterraneanLayers,
  );

  const heightSpellDiscount = getHeightSpellDiscountPercent(
    input.spellDiscounts,
  );
  if (heightSpellDiscount > 0 && heightDepthCost > 0) {
    const rawHeightDepth = heightDepthCost;
    heightDepthCost = Math.round(
      heightDepthCost * (1 - heightSpellDiscount / 100),
    );
    lineItems.push({
      label: "Height/depth adjustment",
      amount: heightDepthCost,
      detail:
        heightSpellDiscount > 0
          ? `${rawHeightDepth} gp before ${heightSpellDiscount}% spell discount`
          : undefined,
    });
  } else if (heightDepthCost > 0) {
    lineItems.push({
      label: "Height/depth adjustment",
      amount: heightDepthCost,
    });
  }

  const wallPct = getWallPercentages(totalSpaces);
  const interiorWallCost = computeWallSideCost(
    totalSpaces,
    wallPct.interior,
    input.interiorWall,
    input.terrain,
    input.climate,
    input.spellDiscounts,
    true,
  );
  const exteriorWallCost = computeWallSideCost(
    totalSpaces,
    wallPct.exterior,
    input.exteriorWall,
    input.terrain,
    input.climate,
    input.spellDiscounts,
    false,
  );
  const wallCost = interiorWallCost + exteriorWallCost;

  if (wallCost > 0) {
    lineItems.push({
      label: "Walls",
      amount: wallCost,
      detail: `${Math.round(wallPct.interior * 100)}% interior, ${Math.round(wallPct.exterior * 100)}% exterior`,
    });
  }

  const extrasCost = input.extrasCost ?? 0;
  if (extrasCost > 0) {
    lineItems.push({ label: "Extras", amount: extrasCost });
  }

  let subtotalBeforeModifiers =
    componentCost + heightDepthCost + wallCost + extrasCost;

  let spellDiscountAmount = 0;
  const qualityCounts = countSpacesByQuality(expanded);

  if (input.spellDiscounts.fabricate) {
    const fabricateDiscount = computeFabricateDiscount(
      componentCost,
      qualityCounts,
      totalSpaces,
    );
    spellDiscountAmount += fabricateDiscount;
  }

  if (input.spellDiscounts["move-earth"] && totalSpaces > 0) {
    spellDiscountAmount += Math.round(subtotalBeforeModifiers * 0.03);
  }

  subtotalBeforeModifiers = Math.max(
    0,
    subtotalBeforeModifiers - spellDiscountAmount,
  );

  const siteModifiers: StrongholdResult["siteModifiers"] = [];

  if (input.climate) {
    const mod = getClimateModifier(input.climate);
    if (mod !== 0) {
      const label =
        CLIMATE_OPTIONS.find((c) => c.value === input.climate)?.label ??
        input.climate;
      siteModifiers.push({ label: `Climate (${label})`, percent: mod });
    }
  }

  const terrainMod = getTerrainModifier(input.terrain);
  if (terrainMod !== 0) {
    const label =
      TERRAIN_OPTIONS.find((t) => t.value === input.terrain)?.label ??
      input.terrain;
    siteModifiers.push({
      label: `Terrain (${label})`,
      percent: terrainMod,
    });
  }

  const settlementMod = getSettlementModifier(
    input.settlement,
    input.settlementDistance,
  );
  if (settlementMod !== 0) {
    const settlementLabel =
      SETTLEMENT_OPTIONS.find((s) => s.value === input.settlement)?.label ??
      input.settlement;
    siteModifiers.push({
      label: `Settlement (${settlementLabel})`,
      percent: settlementMod,
    });
  }

  for (const feature of input.nearbyFeatures) {
    const mod = getNearbyFeatureModifier(feature);
    if (mod !== 0) {
      const label =
        NEARBY_FEATURE_OPTIONS.find((f) => f.value === feature)?.label ??
        feature;
      siteModifiers.push({ label, percent: mod });
    }
  }

  const siteModifierPercent = siteModifiers.reduce(
    (sum, m) => sum + m.percent,
    0,
  );
  const costAfterSiteModifiers = Math.round(
    subtotalBeforeModifiers * (1 + siteModifierPercent / 100),
  );

  const rushPercent = Math.min(70, Math.max(0, input.rushPercent));
  const rushCost =
    rushPercent > 0
      ? Math.round(costAfterSiteModifiers * (rushPercent / 100))
      : 0;
  const grandTotal = costAfterSiteModifiers + rushCost;

  const buildWeeks = Math.max(1, Math.ceil(costAfterSiteModifiers / 10000));
  const buildWeeksRushed = Math.max(
    1,
    Math.ceil(buildWeeks * (1 - rushPercent / 100)),
  );

  const prerequisiteStaff = collectPrerequisiteStaff(expanded);
  const staffRequired = mergeStaff(prerequisiteStaff, input.staff);

  let monthlyUpkeep = 0;
  for (const [role, count] of Object.entries(staffRequired)) {
    monthlyUpkeep += getStaffWage(role as StaffRoleKey) * (count ?? 0);
  }

  const warnings = validatePrerequisites(expanded, staffRequired);

  return {
    totalSpaces,
    componentCost,
    heightDepthCost,
    wallCost,
    extrasCost,
    subtotalBeforeModifiers,
    spellDiscountAmount,
    siteModifierPercent,
    siteModifiers,
    costAfterSiteModifiers,
    rushCost,
    grandTotal,
    buildWeeks,
    buildWeeksRushed,
    monthlyUpkeep,
    lineItems,
    warnings,
    staffRequired,
  };
}

export function formatGp(amount: number): string {
  return `${amount.toLocaleString()} gp`;
}
