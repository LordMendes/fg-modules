import type {
  PcSpecialAttackEntry,
  PcSpecialAttackKind,
  PcSpecialAttackSaveType,
} from "./types";

export type SpecialAttackTemplate = {
  id: string;
  kind: PcSpecialAttackKind;
  name: string;
  count: number;
  primary: boolean;
  damageM: string;
  damageS: string;
  damageType: string;
  critical?: string | null;
  saveDc?: number | null;
  saveType?: PcSpecialAttackSaveType | null;
  notes?: string;
  /** Short blurb for the catalog list. */
  blurb: string;
};

/** Medium-creature defaults; Small uses damageS when size attack mod > 0. */
export const SPECIAL_ATTACK_CATALOG: SpecialAttackTemplate[] = [
  {
    id: "bite",
    kind: "natural",
    name: "Bite",
    count: 1,
    primary: true,
    damageM: "1d6",
    damageS: "1d4",
    damageType: "Piercing and Bludgeoning",
    critical: "x2",
    blurb: "Primary natural attack",
  },
  {
    id: "claw",
    kind: "natural",
    name: "Claw",
    count: 2,
    primary: false,
    damageM: "1d4",
    damageS: "1d3",
    damageType: "Slashing and Piercing",
    critical: "x2",
    blurb: "Secondary; typically two attacks",
  },
  {
    id: "gore",
    kind: "natural",
    name: "Gore",
    count: 1,
    primary: true,
    damageM: "1d8",
    damageS: "1d6",
    damageType: "Piercing",
    critical: "x2",
    blurb: "Primary natural attack",
  },
  {
    id: "slam",
    kind: "natural",
    name: "Slam",
    count: 1,
    primary: true,
    damageM: "1d6",
    damageS: "1d4",
    damageType: "Bludgeoning",
    critical: "x2",
    blurb: "Primary natural attack",
  },
  {
    id: "sting",
    kind: "natural",
    name: "Sting",
    count: 1,
    primary: false,
    damageM: "1d4",
    damageS: "1d3",
    damageType: "Piercing",
    critical: "x2",
    blurb: "Secondary; often with poison",
  },
  {
    id: "tail-slap",
    kind: "natural",
    name: "Tail slap",
    count: 1,
    primary: false,
    damageM: "1d8",
    damageS: "1d6",
    damageType: "Bludgeoning",
    critical: "x2",
    blurb: "Secondary natural attack",
  },
  {
    id: "tentacle",
    kind: "natural",
    name: "Tentacle",
    count: 1,
    primary: false,
    damageM: "1d4",
    damageS: "1d3",
    damageType: "Bludgeoning",
    critical: "x2",
    blurb: "Secondary natural attack",
  },
  {
    id: "hoof",
    kind: "natural",
    name: "Hoof",
    count: 2,
    primary: false,
    damageM: "1d4",
    damageS: "1d3",
    damageType: "Bludgeoning",
    critical: "x2",
    blurb: "Secondary; typically two attacks",
  },
  {
    id: "wing",
    kind: "natural",
    name: "Wing",
    count: 2,
    primary: false,
    damageM: "1d4",
    damageS: "1d3",
    damageType: "Bludgeoning",
    critical: "x2",
    blurb: "Secondary; typically two attacks",
  },
  {
    id: "talon",
    kind: "natural",
    name: "Talon",
    count: 2,
    primary: false,
    damageM: "1d4",
    damageS: "1d3",
    damageType: "Slashing and Piercing",
    critical: "x2",
    blurb: "Secondary; typically two attacks",
  },
  {
    id: "breath",
    kind: "special",
    name: "Breath weapon",
    count: 1,
    primary: true,
    damageM: "6d6",
    damageS: "6d6",
    damageType: "Fire",
    saveDc: 14,
    saveType: "ref",
    notes: "Cone or line; half damage on successful save. Usable every 1d4 rounds.",
    blurb: "Area damage + Reflex save",
  },
  {
    id: "constrict",
    kind: "special",
    name: "Constrict",
    count: 1,
    primary: true,
    damageM: "1d6",
    damageS: "1d4",
    damageType: "Bludgeoning",
    notes: "Automatic damage against a grappled foe.",
    blurb: "Grapple damage",
  },
  {
    id: "rend",
    kind: "special",
    name: "Rend",
    count: 1,
    primary: true,
    damageM: "2d6",
    damageS: "1d8",
    damageType: "Slashing",
    notes: "Extra damage when both claws hit the same target.",
    blurb: "Bonus damage after two claw hits",
  },
  {
    id: "swallow-whole",
    kind: "special",
    name: "Swallow whole",
    count: 1,
    primary: true,
    damageM: "1d8",
    damageS: "1d6",
    damageType: "Bludgeoning and Acid",
    notes: "After a successful bite grapple; swallowed foe takes damage each round.",
    blurb: "Bite grapple follow-up",
  },
  {
    id: "trample",
    kind: "special",
    name: "Trample",
    count: 1,
    primary: true,
    damageM: "2d6",
    damageS: "1d8",
    damageType: "Bludgeoning",
    saveDc: 14,
    saveType: "ref",
    notes: "Overrun smaller foes; half damage on successful Reflex save.",
    blurb: "Overrun + Reflex save",
  },
  {
    id: "custom",
    kind: "natural",
    name: "Custom attack",
    count: 1,
    primary: true,
    damageM: "1d6",
    damageS: "1d4",
    damageType: "Bludgeoning",
    critical: "x2",
    blurb: "Build your own natural or special attack",
  },
];

export function getSpecialAttackTemplate(id: string): SpecialAttackTemplate | undefined {
  return SPECIAL_ATTACK_CATALOG.find((t) => t.id === id);
}

export function filterSpecialAttackCatalog(query: string): SpecialAttackTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return SPECIAL_ATTACK_CATALOG;
  return SPECIAL_ATTACK_CATALOG.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.id.includes(q) ||
      t.blurb.toLowerCase().includes(q) ||
      t.kind.includes(q),
  );
}

export function entryFromTemplate(
  template: SpecialAttackTemplate,
  id: string,
): PcSpecialAttackEntry {
  return {
    id,
    kind: template.kind,
    templateId: template.id,
    name: template.name,
    count: Math.max(1, template.count),
    primary: template.primary,
    damageM: template.damageM,
    damageS: template.damageS,
    damageType: template.damageType,
    critical: template.critical ?? null,
    attackMisc: 0,
    damageMisc: 0,
    saveDc: template.saveDc ?? null,
    saveType: template.saveType ?? null,
    notes: template.notes ?? "",
  };
}
