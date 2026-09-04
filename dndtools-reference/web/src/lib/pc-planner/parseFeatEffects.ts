import type { FeatEntry } from "./types";

export type FeatDerivedFeatures = {
  dodgeBonus: number;
  initBonus: number;
};

export function emptyFeatDerivedFeatures(): FeatDerivedFeatures {
  return { dodgeBonus: 0, initBonus: 0 };
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
];

export function mergeFeatDerivedFeatures(
  base: FeatDerivedFeatures,
  add: Partial<FeatDerivedFeatures>,
): FeatDerivedFeatures {
  return {
    dodgeBonus: base.dodgeBonus + (add.dodgeBonus ?? 0),
    initBonus: base.initBonus + (add.initBonus ?? 0),
  };
}

export function deriveFeatEffects(feats: FeatEntry[]): FeatDerivedFeatures {
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
  }
  return result;
}
