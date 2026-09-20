import { isEffectSuppressed } from "./derivedField";
import type { FeatEntry } from "./types";

export type FeatDerivedFeatures = {
  dodgeBonus: number;
  initBonus: number;
  speedUnhinderedByEncumbrance: boolean;
  fleetSpeedBonus: number;
  fortBonus: number;
  refBonus: number;
  willBonus: number;
  toughnessHp: number;
  skillBonuses: Record<string, number>;
};

export function emptyFeatDerivedFeatures(): FeatDerivedFeatures {
  return {
    dodgeBonus: 0,
    initBonus: 0,
    speedUnhinderedByEncumbrance: false,
    fleetSpeedBonus: 0,
    fortBonus: 0,
    refBonus: 0,
    willBonus: 0,
    toughnessHp: 0,
    skillBonuses: {},
  };
}

function normalizeFeatName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeSkillKey(raw: string): string {
  return raw.trim().toLowerCase();
}

type FeatEffectRule = {
  match: (normalizedName: string, slug: string) => boolean;
  apply: (feat: FeatEntry) => Partial<FeatDerivedFeatures>;
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
  {
    match: (name) => name === "toughness" || name.startsWith("toughness "),
    apply: () => ({ toughnessHp: 3 }),
  },
  {
    match: (name) => name === "great fortitude" || name.startsWith("great fortitude "),
    apply: () => ({ fortBonus: 2 }),
  },
  {
    match: (name) => name === "lightning reflexes" || name.startsWith("lightning reflexes "),
    apply: () => ({ refBonus: 2 }),
  },
  {
    match: (name) => name === "iron will" || name.startsWith("iron will "),
    apply: () => ({ willBonus: 2 }),
  },
  {
    match: (name) => name === "alertness",
    apply: () => ({
      skillBonuses: { listen: 2, "spot": 2 },
    }),
  },
  {
    match: (name) => name === "stealthy",
    apply: () => ({
      skillBonuses: { hide: 2, "move silently": 2 },
    }),
  },
  {
    match: (name) => name === "skill focus" || name.startsWith("skill focus"),
    apply: (feat) => {
      const skill = feat.skillChoice?.trim();
      if (!skill) return {};
      return { skillBonuses: { [normalizeSkillKey(skill)]: 3 } };
    },
  },
];

export function mergeFeatDerivedFeatures(
  base: FeatDerivedFeatures,
  add: Partial<FeatDerivedFeatures>,
): FeatDerivedFeatures {
  const skillBonuses = { ...base.skillBonuses };
  if (add.skillBonuses) {
    for (const [key, amount] of Object.entries(add.skillBonuses)) {
      skillBonuses[key] = (skillBonuses[key] ?? 0) + amount;
    }
  }
  return {
    dodgeBonus: base.dodgeBonus + (add.dodgeBonus ?? 0),
    initBonus: base.initBonus + (add.initBonus ?? 0),
    speedUnhinderedByEncumbrance:
      base.speedUnhinderedByEncumbrance || Boolean(add.speedUnhinderedByEncumbrance),
    fleetSpeedBonus: Math.max(base.fleetSpeedBonus, add.fleetSpeedBonus ?? 0),
    fortBonus: base.fortBonus + (add.fortBonus ?? 0),
    refBonus: base.refBonus + (add.refBonus ?? 0),
    willBonus: base.willBonus + (add.willBonus ?? 0),
    toughnessHp: base.toughnessHp + (add.toughnessHp ?? 0),
    skillBonuses,
  };
}

export function parseFeatSpeedUnhindered(text: string): boolean {
  return /move at this speed even when wearing medium or heavy armor/i.test(text);
}

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
    if (isEffectSuppressed(feat)) continue;
    const normalized = normalizeFeatName(feat.name);
    const slug = feat.slug.toLowerCase();
    for (const rule of FEAT_EFFECT_RULES) {
      if (rule.match(normalized, slug)) {
        result = mergeFeatDerivedFeatures(result, rule.apply(feat));
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

export function featSkillBonus(
  features: FeatDerivedFeatures,
  skillName: string,
  skillSlug?: string | null,
): number {
  const key = normalizeSkillKey(skillSlug ?? skillName);
  return features.skillBonuses[key] ?? features.skillBonuses[skillName.toLowerCase()] ?? 0;
}

export function featNeedsSkillChoice(feat: Pick<FeatEntry, "name" | "slug">): boolean {
  const normalized = normalizeFeatName(feat.name);
  const slug = feat.slug.toLowerCase();
  return normalized === "skill focus" || slug === "skill-focus" || slug.startsWith("skill-focus-");
}

export function createFeatEntry(
  slug: string,
  name: string,
  choice?: string,
  isFlaw = false,
): FeatEntry {
  const stub = { slug, name };
  const entry: FeatEntry = featNeedsSkillChoice(stub)
    ? { slug, name, skillChoice: choice }
    : choice
      ? { slug, name, choice }
      : { slug, name };
  if (isFlaw) entry.isFlaw = true;
  return entry;
}
