import type { FeatEntry } from "./types";

export type FeatDerivedFeatures = {
  dodgeBonus: number;
  initBonus: number;
  /** Same dwarf-style exception from a feat benefit. */
  speedUnhinderedByEncumbrance: boolean;
  /** Conditional +10 land speed (Fleet of Foot). */
  fleetSpeedBonus: number;
};

export function emptyFeatDerivedFeatures(): FeatDerivedFeatures {
  return {
    dodgeBonus: 0,
    initBonus: 0,
    speedUnhinderedByEncumbrance: false,
    fleetSpeedBonus: 0,
  };
}

function normalizeFeatName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type FeatEffectRule = {
  match: (normalizedName: string, slug: string) => boolean;
  apply: () => Partial<FeatDerivedFeatures>;
};

const FEAT_EFFECT_RULES: FeatEffectRule[] = [
  {
    match: (name, slug) => name === "dodge" || slug === "dodge" || slug.startsWith("dodge-"),
    apply: () => ({ dodgeBonus: 1 }),
  },
  {
    match: (name, slug) =>
      name === "improved initiative" ||
      slug === "improved-initiative" ||
      slug.startsWith("improved-initiative-"),
    apply: () => ({ initBonus: 4 }),
  },
  {
    match: (name, slug) =>
      name === "fleet of foot" ||
      slug === "fleet-of-foot" ||
      slug.startsWith("fleet-of-foot-"),
    apply: () => ({ fleetSpeedBonus: 10 }),
  },
];

export function mergeFeatDerivedFeatures(
  base: FeatDerivedFeatures,
  add: Partial<FeatDerivedFeatures>,
): FeatDerivedFeatures {
  return {
    dodgeBonus: base.dodgeBonus + (add.dodgeBonus ?? 0),
    initBonus: base.initBonus + (add.initBonus ?? 0),
    speedUnhinderedByEncumbrance:
      base.speedUnhinderedByEncumbrance || Boolean(add.speedUnhinderedByEncumbrance),
    fleetSpeedBonus: Math.max(base.fleetSpeedBonus, add.fleetSpeedBonus ?? 0),
  };
}

/** Benefit text like dwarf speed: not reduced by medium/heavy armor or load. */
export function parseFeatSpeedUnhindered(text: string): boolean {
  return /move at this speed even when wearing medium or heavy armor/i.test(text);
}

/** “faster than the norm for your race by 10 feet” style bonus. */
export function parseFleetSpeedBonusFromText(text: string): number {
  const match = text.match(
    /(?:land )?speed is faster than the norm for your race by (\d+)\s*feet/i,
  );
  if (!match) return 0;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : 0;
}

export function deriveFeatEffects(
  feats: FeatEntry[],
  featBenefitTexts: ReadonlyMap<string, string> = new Map(),
): FeatDerivedFeatures {
  let result = emptyFeatDerivedFeatures();
  for (const feat of feats) {
    const normalized = normalizeFeatName(feat.name);
    const slug = feat.slug.toLowerCase();
    for (const rule of FEAT_EFFECT_RULES) {
      if (rule.match(normalized, slug)) {
        result = mergeFeatDerivedFeatures(result, rule.apply());
        break;
      }
    }
    const benefit =
      featBenefitTexts.get(feat.slug) ?? featBenefitTexts.get(slug) ?? "";
    if (benefit) {
      const fromText: Partial<FeatDerivedFeatures> = {};
      if (parseFeatSpeedUnhindered(benefit)) {
        fromText.speedUnhinderedByEncumbrance = true;
      }
      const fleet = parseFleetSpeedBonusFromText(benefit);
      if (fleet > 0) fromText.fleetSpeedBonus = fleet;
      if (Object.keys(fromText).length > 0) {
        result = mergeFeatDerivedFeatures(result, fromText);
      }
    }
  }
  return result;
}
