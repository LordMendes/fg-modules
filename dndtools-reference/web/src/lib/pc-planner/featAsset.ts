import type { CategoryKey } from "@/lib/categories";
import type { FeatEntry } from "./types";

/** What a choice feat is filled with. */
export type FeatAssetKind = "weapon" | "exotic-weapon" | "school" | "metamagic" | "skill";

export type FeatAssetSpec = {
  kind: FeatAssetKind;
  /** Short name of the thing being chosen. */
  label: string;
  /** Button label before a choice is saved. */
  emptyLabel: string;
  /** Search box placeholder. */
  placeholder: string;
  /** One line under the dialog title. */
  prompt: string;
  categories?: CategoryKey[];
  fields?: Record<string, string[]>;
};

const SPELL_SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
] as const;

export const FEAT_ASSET_SCHOOLS: readonly string[] = SPELL_SCHOOLS;

const SPECS: Record<FeatAssetKind, FeatAssetSpec> = {
  weapon: {
    kind: "weapon",
    label: "Weapon",
    emptyLabel: "Choose a weapon",
    placeholder: "Search weapons…",
    prompt: "Pick the weapon this feat applies to.",
    categories: ["equipment"],
    fields: { kind: ["weapon"] },
  },
  "exotic-weapon": {
    kind: "exotic-weapon",
    label: "Exotic weapon",
    emptyLabel: "Choose an exotic weapon",
    placeholder: "Search exotic weapons…",
    prompt: "Pick the exotic weapon this feat applies to.",
    categories: ["equipment"],
    fields: { kind: ["weapon"], category: ["exotic"] },
  },
  school: {
    kind: "school",
    label: "School",
    emptyLabel: "Choose a school",
    placeholder: "Search schools…",
    prompt: "Pick the school of magic this feat applies to.",
  },
  metamagic: {
    kind: "metamagic",
    label: "Metamagic feat",
    emptyLabel: "Choose a metamagic feat",
    placeholder: "Search metamagic feats…",
    prompt: "Pick the metamagic feat this feat applies to.",
    categories: ["feats"],
    fields: { type: ["Metamagic"] },
  },
  skill: {
    kind: "skill",
    label: "Skill",
    emptyLabel: "Choose a skill",
    placeholder: "Search skills…",
    prompt: "Pick the skill this feat applies to.",
    categories: ["skills"],
  },
};

const RULES: { kind: FeatAssetKind; names: readonly string[] }[] = [
  { kind: "skill", names: ["skill focus", "epic skill focus"] },
  { kind: "school", names: ["spell focus", "greater spell focus", "epic spell focus"] },
  { kind: "metamagic", names: ["divine metamagic"] },
  { kind: "exotic-weapon", names: ["exotic weapon proficiency"] },
  {
    kind: "weapon",
    names: [
      "weapon focus",
      "greater weapon focus",
      "epic weapon focus",
      "weapon specialization",
      "greater weapon specialization",
      "epic weapon specialization",
      "improved critical",
    ],
  },
];

function baseFeatName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Choice family for this feat name, including names that already contain the asset. */
export function featAssetKind(name: string): FeatAssetKind | null {
  const base = baseFeatName(name);
  for (const rule of RULES) {
    if (rule.names.includes(base)) return rule.kind;
  }
  return null;
}

/**
 * Picker for a generic choice feat such as Weapon Focus.
 * Catalog entries that already name the asset, such as Spell Focus (Chaos), are left as written.
 */
export function featAssetSpec(feat: Pick<FeatEntry, "name">): FeatAssetSpec | null {
  if (/\([^)]+\)/.test(feat.name)) return null;
  const kind = featAssetKind(feat.name);
  return kind ? SPECS[kind] : null;
}

export function readFeatAsset(feat: FeatEntry): string {
  if (featAssetKind(feat.name) === "skill") return feat.skillChoice?.trim() ?? "";
  return feat.choice?.trim() ?? "";
}

/** Store the chosen asset on the skill or general choice field. */
export function applyFeatAsset(feat: FeatEntry, value: string): void {
  const trimmed = value.trim();
  if (featAssetKind(feat.name) === "skill") {
    feat.skillChoice = trimmed || undefined;
    feat.choice = undefined;
    return;
  }
  feat.choice = trimmed || undefined;
  feat.skillChoice = undefined;
}
