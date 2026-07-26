import type { SpellDiscountKey } from "./types";

export type SpellDiscount = {
  key: SpellDiscountKey;
  label: string;
  description: string;
  castingsPerSpace?: number;
};

export const SPELL_DISCOUNTS: SpellDiscount[] = [
  {
    key: "air-walk",
    label: "Air walk / fly / levitate",
    description: "–25% of height cost adjustment per space",
    castingsPerSpace: 2,
  },
  {
    key: "fabricate",
    label: "Fabricate",
    description: "–50% luxury, –20% fancy, –5% other component spaces",
    castingsPerSpace: 2,
  },
  {
    key: "move-earth",
    label: "Move earth",
    description: "–3% per ground-floor space (site preparation)",
    castingsPerSpace: 1,
  },
  {
    key: "stone-shape",
    label: "Stone shape",
    description: "–5% per space with hewn stone walls",
    castingsPerSpace: 3,
  },
  {
    key: "telekinesis",
    label: "Telekinesis",
    description: "–50% of height cost adjustment per space",
    castingsPerSpace: 10,
  },
  {
    key: "wall-of-stone-9",
    label: "Wall of stone (9th-level caster)",
    description: "–15% on hewn stone walls",
    castingsPerSpace: 8,
  },
  {
    key: "wall-of-stone-12",
    label: "Wall of stone (12th-level caster)",
    description: "–50% on hewn stone walls",
    castingsPerSpace: 12,
  },
  {
    key: "wall-of-stone-16",
    label: "Wall of stone (16th-level caster)",
    description: "Hewn stone walls for free",
    castingsPerSpace: 12,
  },
  {
    key: "wall-of-stone-20",
    label: "Wall of stone (20th-level caster)",
    description: "Hewn stone walls for free",
    castingsPerSpace: 5,
  },
  {
    key: "wood-shape",
    label: "Wood shape",
    description: "–5% per space with wood walls",
    castingsPerSpace: 2,
  },
];

export function getHewnStoneSpellDiscount(
  enabled: Partial<Record<SpellDiscountKey, boolean>>,
): number {
  if (enabled["wall-of-stone-16"] || enabled["wall-of-stone-20"]) return 100;
  if (enabled["wall-of-stone-12"]) return 50;
  if (enabled["wall-of-stone-9"]) return 15;
  if (enabled["stone-shape"]) return 5;
  return 0;
}

export function getWoodSpellDiscount(
  enabled: Partial<Record<SpellDiscountKey, boolean>>,
): number {
  return enabled["wood-shape"] ? 5 : 0;
}

export function getHeightSpellDiscountPercent(
  enabled: Partial<Record<SpellDiscountKey, boolean>>,
): number {
  if (enabled.telekinesis) return 50;
  if (enabled["air-walk"]) return 25;
  return 0;
}
