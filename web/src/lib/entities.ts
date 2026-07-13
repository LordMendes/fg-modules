import { prisma } from "@/lib/prisma";
import type { CategoryKey } from "@/lib/categories";
import type { Prisma } from "@/generated/prisma/client";
import { parseSpellComponents, spellDescriptionSnippet } from "@/lib/spell-utils";
import type { SpellComponentFlags } from "@/lib/spell-utils";
import {
  CATEGORY_FILTER_FIELDS,
  CLASS_TYPE_FILTER_OPTIONS,
  SPELL_COMPONENT_FILTER_OPTIONS,
  formatBooleanFilterLabel,
  normalizeFilterValues,
  type CategoryFilterOptions,
  type FilterFieldDef,
} from "@/lib/entity-filters";
import { buildEntityOrderBy } from "@/lib/entity-sort";
import type { TableSort } from "@/lib/table-sort";

export type EntityListItem = {
  slug: string;
  name: string;
  sourceAbbrev: string | null;
  edition: string | null;
  extra: Record<string, string | null>;
};

export type EntityDetail = {
  slug: string;
  name: string;
  sourceUrl: string | null;
  descriptionHtml: string | null;
  descriptionText: string | null;
  source: { name: string; abbrev: string | null; edition: string; page: number | null };
  fields: Record<string, string | null>;
  related: { label: string; href: string; meta?: string }[];
  statLine?: string | null;
  featLinks?: { label: string; href: string }[];
  specialAbilities?: { label: string; href?: string }[];
  flavorHtml?: string | null;
  combatHtml?: string | null;
  sections?: { title: string; html: string }[];
  advancementHtml?: string | null;
  spellLevels?: ClassSpellLevelSummary[];
  classSkills?: ClassSkillRef[];
};

export type ClassSkillRef = {
  name: string;
  slug: string | null;
  ability: string | null;
};

export type ClassSpellLevelSummary = {
  level: number;
  label: string;
  count: number;
};

export type ClassSpellRef = {
  slug: string;
  name: string;
  school: string | null;
  description: string | null;
  components: SpellComponentFlags;
  sourceAbbrev: string | null;
  edition: string | null;
};

export type SpellPreview = {
  slug: string;
  name: string;
  source: { name: string; abbrev: string | null; edition: string };
  fields: Record<string, string | null>;
  descriptionHtml: string | null;
  descriptionText: string | null;
};

export function formatSpellLevelLabel(level: number): string {
  if (level === 0) return "0 Level";
  const mod100 = level % 100;
  const mod10 = level % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : mod10 === 1
        ? "st"
        : mod10 === 2
          ? "nd"
          : mod10 === 3
            ? "rd"
            : "th";
  return `${level}${suffix} Level`;
}

const PAGE_SIZE = 50;

function sourceSelect() {
  return { select: { name: true, abbrev: true, edition: true } };
}

const MONSTER_STAT_FIELDS: [label: string, key: string][] = [
  ["Hit Dice", "hit_dice"],
  ["Initiative", "initiative"],
  ["Speed", "speed"],
  ["Armor Class", "armor_class"],
  ["Base Attack / Grapple", "base_attack_grapple"],
  ["Attack", "attack"],
  ["Full Attack", "full_attack"],
  ["STR", "str"],
  ["DEX", "dex"],
  ["CON", "con"],
  ["INT", "int"],
  ["WIS", "wis"],
  ["CHA", "cha"],
  ["Fort / Ref / Will", "fort_ref_will"],
  ["Challenge Rating", "challenge_rating"],
  ["Alignment", "alignment"],
  ["Organization", "organization"],
  ["Treasure", "treasure"],
  ["Environment", "environment"],
  ["Level Adjustment", "level_adjustment"],
  ["Spell Resistance", "spell_resistance"],
  ["Caster Level", "caster_level"],
];

function indexString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.includes("Do not touch this field")) return null;
  return value;
}

function indexNumber(data: Record<string, unknown>, key: string): number | null {
  const value = data[key];
  return typeof value === "number" ? value : null;
}

function parseMonsterAbilities(
  indexData: Record<string, unknown>,
  linked: { label: string; href: string }[],
): { label: string; href?: string }[] {
  const stored = indexData.specialAbilities;
  if (Array.isArray(stored)) {
    return stored
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const label = typeof record.name === "string" ? record.name : null;
        if (!label) return null;
        const slug = typeof record.slug === "string" ? record.slug : null;
        return slug ? { label, href: `/rules/${slug}` } : { label };
      })
      .filter((item): item is { label: string; href?: string } => item !== null);
  }
  return linked.map(({ label, href }) => ({ label, href }));
}

function buildFeatSections(indexData: Record<string, unknown>): { title: string; html: string }[] {
  const mapping: [string, string][] = [
    ["Prerequisite", "prerequisiteHtml"],
    ["Benefit", "benefitHtml"],
    ["Normal", "normalHtml"],
    ["Special", "specialHtml"],
  ];

  return mapping.flatMap(([title, key]) => {
    const html = indexString(indexData, key);
    return html ? [{ title, html }] : [];
  });
}

function buildClassSections(indexData: Record<string, unknown>): { title: string; html: string }[] {
  const html = indexString(indexData, "requirementsHtml");
  return html ? [{ title: "Requirements", html }] : [];
}

function buildMonsterFields(
  indexData: Record<string, unknown>,
  record: {
    creatureType: string | null;
    subtypes: string | null;
    challengeRating: string | null;
    hitDice: string | null;
  },
): Record<string, string | null> {
  const fields: Record<string, string | null> = {};

  for (const [label, key] of MONSTER_STAT_FIELDS) {
    const value = indexString(indexData, key) ?? null;
    if (value) fields[label] = value;
  }

  if (!fields["Hit Dice"]) fields["Hit Dice"] = record.hitDice;
  if (!fields["Challenge Rating"]) fields["Challenge Rating"] = record.challengeRating;

  return fields;
}

function parseClassSkills(value: unknown): ClassSkillRef[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name : null;
      if (!name) return null;

      const slug = typeof record.slug === "string" ? record.slug : null;
      const ability =
        typeof record.ability === "string"
          ? record.ability
          : typeof record.keyAbility === "string"
            ? record.keyAbility
            : null;

      return { name, slug, ability };
    })
    .filter((item): item is ClassSkillRef => item !== null);
}

export type ListEntitiesOptions = {
  cursor?: string;
  search?: string;
  description?: string;
  /** @deprecated Prefer `sources`. Kept for source-page callers. */
  sourceAbbrev?: string;
  /** @deprecated Prefer `editions`. */
  edition?: string;
  sources?: string[];
  editions?: string[];
  /** Map of URL param → selected values (multi). */
  fields?: Record<string, string[]>;
  sort?: TableSort | null;
};

function buildSourceWhere(options: ListEntitiesOptions): Prisma.SourceWhereInput | undefined {
  const sources = [
    ...(options.sources ?? []),
    ...(options.sourceAbbrev ? [options.sourceAbbrev] : []),
  ];
  const editions = [
    ...(options.editions ?? []),
    ...(options.edition ? [options.edition] : []),
  ];
  const uniqueSources = [...new Set(sources)];
  const uniqueEditions = [...new Set(editions)];

  const sourceWhere: Prisma.SourceWhereInput = {};
  if (uniqueSources.length) sourceWhere.abbrev = { in: uniqueSources };
  if (uniqueEditions.length) sourceWhere.edition = { in: uniqueEditions };
  return Object.keys(sourceWhere).length ? sourceWhere : undefined;
}

function componentContainsClause(component: string): Prisma.StringFilter {
  // Prefer whole-token style matches so "F" does not match only via "DF".
  if (component === "F") {
    return { contains: "F", mode: "insensitive" };
  }
  return { contains: component, mode: "insensitive" };
}

/** Build Prisma field filters from category field defs + selected URL values. */
function buildFieldWhere(
  category: CategoryKey,
  fields: Record<string, string[]> | undefined,
): Record<string, unknown> {
  if (!fields) return {};
  const where: Record<string, unknown> = {};
  const andClauses: Record<string, unknown>[] = [];

  for (const def of CATEGORY_FILTER_FIELDS[category]) {
    const raw = fields[def.param];
    if (!raw?.length) continue;

    if (def.valueType === "component") {
      for (const component of raw) {
        andClauses.push({ components: componentContainsClause(component) });
      }
      continue;
    }

    if (def.valueType === "relation" && def.param === "class") {
      if (category === "spells") {
        where.classLevels = {
          some: { class: { slug: { in: raw } } },
        };
      } else if (category === "psionics") {
        where.classes = {
          some: { class: { slug: { in: raw } } },
        };
      }
      continue;
    }

    if (def.valueType === "prestige") {
      const wantsBase = raw.includes("base");
      const wantsPrestige = raw.includes("prestige");
      if (wantsBase && !wantsPrestige) where.isPrestige = false;
      else if (wantsPrestige && !wantsBase) where.isPrestige = true;
      continue;
    }

    if (def.param === "subtype") {
      // OR across subtypes: match any selected subtype token inside the subtypes string.
      where.OR = raw.map((subtype) => ({
        subtypes: { contains: subtype, mode: "insensitive" as const },
      }));
      continue;
    }

    const normalized = normalizeFilterValues(def, raw);
    if (!normalized.length) continue;
    where[def.prismaField] = { in: normalized };
  }

  if (andClauses.length) {
    where.AND = [...((where.AND as Record<string, unknown>[]) ?? []), ...andClauses];
  }

  return where;
}

export async function listEntities(
  category: CategoryKey,
  options: ListEntitiesOptions = {},
): Promise<{ items: EntityListItem[]; nextCursor: string | null }> {
  const { cursor, search, description, fields } = options;

  const sourceWhere = buildSourceWhere(options);
  const fieldWhere = buildFieldWhere(category, fields);

  const baseWhere = {
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(description
      ? { descriptionText: { contains: description, mode: "insensitive" as const } }
      : {}),
    ...(sourceWhere ? { source: sourceWhere } : {}),
    ...fieldWhere,
  };

  const take = PAGE_SIZE + 1;
  const orderBy = buildEntityOrderBy(category, options.sort);

  switch (category) {
    case "spells": {
      const rows = await prisma.spell.findMany({
        where: baseWhere as Prisma.SpellWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.SpellOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        school: r.school,
        level: r.minLevel?.toString() ?? null,
        components: r.components,
      }));
    }
    case "feats": {
      const rows = await prisma.feat.findMany({
        where: baseWhere as Prisma.FeatWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.FeatOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({ type: r.featType }));
    }
    case "monsters": {
      const rows = await prisma.monster.findMany({
        where: baseWhere as Prisma.MonsterWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.MonsterOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        type: r.creatureType,
        cr: r.challengeRating,
        hd: r.hitDice,
      }));
    }
    case "classes": {
      const rows = await prisma.dndClass.findMany({
        where: baseWhere as Prisma.DndClassWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.DndClassOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        hitDie: r.hitDie,
        skillPoints: r.skillPoints,
      }));
    }
    case "skills": {
      const rows = await prisma.skill.findMany({
        where: baseWhere as Prisma.SkillWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.SkillOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        keyAbility: r.keyAbility,
        trainedOnly:
          r.trainedOnly == null ? null : formatBooleanFilterLabel(r.trainedOnly),
      }));
    }
    case "races": {
      const rows = await prisma.race.findMany({
        where: baseWhere as Prisma.RaceWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.RaceOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        type: r.creatureType,
        la: r.levelAdjustment,
      }));
    }
    case "items": {
      const rows = await prisma.item.findMany({
        where: baseWhere as Prisma.ItemWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.ItemOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({ type: r.itemType, price: r.price }));
    }
    case "equipment": {
      const rows = await prisma.equipment.findMany({
        where: baseWhere as Prisma.EquipmentWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.EquipmentOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        kind: r.kind,
        cost: r.cost,
      }));
    }
    case "domains": {
      // Domains description search should also match granted power text.
      const domainWhere: Prisma.DomainWhereInput = {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(sourceWhere ? { source: sourceWhere } : {}),
        ...(description
          ? {
              OR: [
                { descriptionText: { contains: description, mode: "insensitive" } },
                { grantedPowerText: { contains: description, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      const rows = await prisma.domain.findMany({
        where: domainWhere,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.DomainOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        type: r.domainType,
      }));
    }
    case "deities": {
      const rows = await prisma.deity.findMany({
        where: baseWhere as Prisma.DeityWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.DeityOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        alignment: r.alignment,
        pantheon: r.pantheon,
      }));
    }
    case "psionics": {
      const rows = await prisma.psionic.findMany({
        where: baseWhere as Prisma.PsionicWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.PsionicOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        discipline: r.discipline,
        powerPoints: r.powerPoints,
      }));
    }
    case "templates": {
      const rows = await prisma.template.findMany({
        where: baseWhere as Prisma.TemplateWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.TemplateOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        type: r.templateType,
        cr: r.crChange,
      }));
    }
    case "rules": {
      const rows = await prisma.rule.findMany({
        where: baseWhere as Prisma.RuleWhereInput,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: orderBy as Prisma.RuleOrderByWithRelationInput[],
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        category: r.category,
        subcategory: r.subcategory,
      }));
    }
    default:
      return { items: [], nextCursor: null };
  }
}

type FilterOption = { value: string; label: string };

export async function getCategoryFilterOptions(
  category: CategoryKey,
): Promise<CategoryFilterOptions> {
  const sourcesWithCategory = await prisma.source.findMany({
    where: {
      [category]: { some: {} },
    },
    select: { abbrev: true, edition: true },
    orderBy: [{ abbrev: "asc" }],
  });

  const sourceOpts: FilterOption[] = sourcesWithCategory
    .filter((s) => s.abbrev)
    .map((s) => ({ value: s.abbrev!, label: s.abbrev! }));

  const editionSet = new Set<string>();
  for (const s of sourcesWithCategory) {
    if (s.edition) editionSet.add(s.edition);
  }
  const editionOpts: FilterOption[] = [...editionSet]
    .sort()
    .map((e) => ({ value: e, label: e }));

  const fieldDefs = CATEGORY_FILTER_FIELDS[category];
  const fields: Record<string, FilterOption[]> = {};

  for (const def of fieldDefs) {
    fields[def.param] = await getFieldFilterOptions(category, def);
  }

  return {
    sources: sourceOpts,
    editions: editionOpts,
    fields,
  };
}

async function getFieldFilterOptions(
  category: CategoryKey,
  def: FilterFieldDef,
): Promise<FilterOption[]> {
  const field = def.prismaField;

  if (def.valueType === "component") {
    return SPELL_COMPONENT_FILTER_OPTIONS;
  }
  if (def.valueType === "prestige") {
    return CLASS_TYPE_FILTER_OPTIONS;
  }

  switch (category) {
    case "spells": {
      if (field === "minLevel") {
        const rows = await prisma.spell.groupBy({
          by: ["minLevel"],
          where: { minLevel: { not: null } },
          _count: { minLevel: true },
          orderBy: { minLevel: "asc" },
        });
        return rows
          .filter((r) => r.minLevel != null)
          .map((r) => ({
            value: String(r.minLevel),
            label: String(r.minLevel),
          }));
      }
      if (field === "school") {
        const rows = await prisma.spell.groupBy({
          by: ["school"],
          where: { school: { not: null } },
          _count: { school: true },
          orderBy: { _count: { school: "desc" } },
        });
        return rows
          .filter((r) => r.school)
          .map((r) => ({ value: r.school!, label: r.school! }));
      }
      if (def.valueType === "relation" && def.param === "class") {
        const rows = await prisma.dndClass.findMany({
          where: { spellLevels: { some: {} } },
          select: { slug: true, name: true },
          orderBy: { name: "asc" },
        });
        return rows.map((r) => ({ value: r.slug, label: r.name }));
      }
      break;
    }
    case "feats": {
      const rows = await prisma.feat.groupBy({
        by: ["featType"],
        where: { featType: { not: null } },
        _count: { featType: true },
        orderBy: { _count: { featType: "desc" } },
      });
      return rows
        .filter((r) => r.featType)
        .map((r) => ({ value: r.featType!, label: r.featType! }));
    }
    case "monsters": {
      if (field === "creatureType") {
        const rows = await prisma.monster.groupBy({
          by: ["creatureType"],
          where: { creatureType: { not: null } },
          _count: { creatureType: true },
          orderBy: { _count: { creatureType: "desc" } },
        });
        return rows
          .filter((r) => r.creatureType)
          .map((r) => ({ value: r.creatureType!, label: r.creatureType! }));
      }
      if (field === "subtypes") {
        const rows = await prisma.monster.groupBy({
          by: ["subtypes"],
          where: { subtypes: { not: null } },
          _count: { subtypes: true },
        });
        const tokens = new Set<string>();
        for (const row of rows) {
          if (!row.subtypes) continue;
          for (const part of row.subtypes.split(/[,;/]/)) {
            const token = part.trim();
            if (token && token !== "—" && token !== "-") tokens.add(token);
          }
        }
        return [...tokens].sort((a, b) => a.localeCompare(b)).map((t) => ({
          value: t,
          label: t,
        }));
      }
      if (field === "challengeRating") {
        const rows = await prisma.monster.groupBy({
          by: ["challengeRating"],
          where: { challengeRating: { not: null } },
          _count: { challengeRating: true },
          orderBy: { _count: { challengeRating: "desc" } },
        });
        return rows
          .filter((r) => r.challengeRating)
          .map((r) => ({ value: r.challengeRating!, label: r.challengeRating! }));
      }
      break;
    }
    case "classes": {
      if (field === "hitDie") {
        const rows = await prisma.dndClass.groupBy({
          by: ["hitDie"],
          where: { hitDie: { not: null } },
          _count: { hitDie: true },
          orderBy: { _count: { hitDie: "desc" } },
        });
        return rows
          .filter((r) => r.hitDie)
          .map((r) => ({ value: r.hitDie!, label: r.hitDie! }));
      }
      if (field === "skillPoints") {
        const rows = await prisma.dndClass.groupBy({
          by: ["skillPoints"],
          where: { skillPoints: { not: null } },
          _count: { skillPoints: true },
          orderBy: { _count: { skillPoints: "desc" } },
        });
        return rows
          .filter((r) => r.skillPoints)
          .map((r) => ({ value: r.skillPoints!, label: r.skillPoints! }));
      }
      break;
    }
    case "skills": {
      if (field === "trainedOnly" || field === "armorCheckPenalty") {
        return [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ];
      }
      break;
    }
    case "races": {
      if (field === "size") {
        const rows = await prisma.race.groupBy({
          by: ["size"],
          where: { size: { not: null } },
          _count: { size: true },
          orderBy: { _count: { size: "desc" } },
        });
        return rows
          .filter((r) => r.size)
          .map((r) => ({ value: r.size!, label: r.size! }));
      }
      if (field === "levelAdjustment") {
        const rows = await prisma.race.groupBy({
          by: ["levelAdjustment"],
          where: { levelAdjustment: { not: null } },
          _count: { levelAdjustment: true },
          orderBy: { _count: { levelAdjustment: "desc" } },
        });
        return rows
          .filter((r) => r.levelAdjustment)
          .map((r) => ({ value: r.levelAdjustment!, label: r.levelAdjustment! }));
      }
      break;
    }
    case "items": {
      if (field === "itemType") {
        const rows = await prisma.item.groupBy({
          by: ["itemType"],
          where: { itemType: { not: null } },
          _count: { itemType: true },
          orderBy: { _count: { itemType: "desc" } },
        });
        return rows
          .filter((r) => r.itemType)
          .map((r) => ({ value: r.itemType!, label: r.itemType! }));
      }
      break;
    }
    case "equipment": {
      if (field === "kind") {
        const rows = await prisma.equipment.groupBy({
          by: ["kind"],
          where: { kind: { not: null } },
          _count: { kind: true },
          orderBy: { _count: { kind: "desc" } },
        });
        return rows
          .filter((r) => r.kind)
          .map((r) => ({ value: r.kind!, label: r.kind! }));
      }
      if (field === "category") {
        const rows = await prisma.equipment.groupBy({
          by: ["category"],
          where: { category: { not: null } },
          _count: { category: true },
          orderBy: { _count: { category: "desc" } },
        });
        return rows
          .filter((r) => r.category)
          .map((r) => ({ value: r.category!, label: r.category! }));
      }
      break;
    }
    case "deities": {
      if (field === "alignment") {
        const rows = await prisma.deity.groupBy({
          by: ["alignment"],
          where: { alignment: { not: null } },
          _count: { alignment: true },
          orderBy: { _count: { alignment: "desc" } },
        });
        return rows
          .filter((r) => r.alignment)
          .map((r) => ({ value: r.alignment!, label: r.alignment! }));
      }
      if (field === "pantheon") {
        const rows = await prisma.deity.groupBy({
          by: ["pantheon"],
          where: { pantheon: { not: null } },
          _count: { pantheon: true },
          orderBy: { _count: { pantheon: "desc" } },
        });
        return rows
          .filter((r) => r.pantheon)
          .map((r) => ({ value: r.pantheon!, label: r.pantheon! }));
      }
      break;
    }
    case "psionics": {
      if (field === "discipline") {
        const rows = await prisma.psionic.groupBy({
          by: ["discipline"],
          where: { discipline: { not: null } },
          _count: { discipline: true },
          orderBy: { _count: { discipline: "desc" } },
        });
        return rows
          .filter((r) => r.discipline)
          .map((r) => ({ value: r.discipline!, label: r.discipline! }));
      }
      if (field === "powerPoints") {
        const rows = await prisma.psionic.groupBy({
          by: ["powerPoints"],
          where: { powerPoints: { not: null } },
          _count: { powerPoints: true },
          orderBy: { _count: { powerPoints: "desc" } },
        });
        return rows
          .filter((r) => r.powerPoints)
          .map((r) => ({ value: r.powerPoints!, label: r.powerPoints! }));
      }
      if (def.valueType === "relation" && def.param === "class") {
        const rows = await prisma.dndClass.findMany({
          where: { psionicLevels: { some: {} } },
          select: { slug: true, name: true },
          orderBy: { name: "asc" },
        });
        return rows.map((r) => ({ value: r.slug, label: r.name }));
      }
      break;
    }
    case "templates": {
      if (field === "templateType") {
        const rows = await prisma.template.groupBy({
          by: ["templateType"],
          where: { templateType: { not: null } },
          _count: { templateType: true },
          orderBy: { _count: { templateType: "desc" } },
        });
        return rows
          .filter((r) => r.templateType)
          .map((r) => ({ value: r.templateType!, label: r.templateType! }));
      }
      break;
    }
    case "rules": {
      if (field === "category") {
        const rows = await prisma.rule.groupBy({
          by: ["category"],
          where: { category: { not: null } },
          _count: { category: true },
          orderBy: { _count: { category: "desc" } },
        });
        return rows
          .filter((r) => r.category)
          .map((r) => ({ value: r.category!, label: r.category! }));
      }
      if (field === "subcategory") {
        const rows = await prisma.rule.groupBy({
          by: ["subcategory"],
          where: { subcategory: { not: null } },
          _count: { subcategory: true },
          orderBy: { _count: { subcategory: "desc" } },
        });
        return rows
          .filter((r) => r.subcategory)
          .map((r) => ({ value: r.subcategory!, label: r.subcategory! }));
      }
      break;
    }
  }
  return [];
}

function formatList<T extends { slug: string; name: string; source: { abbrev: string | null; edition: string } }>(
  rows: T[],
  extraFn: (row: T) => Record<string, string | null>,
): { items: EntityListItem[]; nextCursor: string | null } {
  const hasMore = rows.length > PAGE_SIZE;
  const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return {
    items: slice.map((r) => ({
      slug: r.slug,
      name: r.name,
      sourceAbbrev: r.source.abbrev,
      edition: r.source.edition,
      extra: extraFn(r),
    })),
    nextCursor: hasMore ? slice[slice.length - 1].slug : null,
  };
}

export async function getEntityDetail(
  category: CategoryKey,
  slug: string,
): Promise<EntityDetail | null> {
  const src = sourceSelect();

  switch (category) {
    case "spells": {
      const r = await prisma.spell.findUnique({
        where: { slug },
        include: {
          source: src,
          classLevels: { include: { class: { select: { slug: true, name: true } } }, orderBy: { level: "asc" } },
          domains: { include: { domain: { select: { slug: true, name: true } } } },
        },
      });
      if (!r) return null;
      return {
        slug: r.slug,
        name: r.name,
        sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml,
        descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: {
          School: r.school,
          "Casting Time": r.castingTime,
          Components: r.components,
          Range: r.range,
          Target: r.target,
          Duration: r.duration,
          "Saving Throw": r.savingThrow,
          "Spell Resistance": r.spellResistance,
        },
        related: [
          ...r.classLevels.map((cl) => ({
            label: cl.class.name,
            href: `/classes/${cl.class.slug}`,
            meta: `Level ${cl.level}`,
          })),
          ...r.domains.map((d) => ({
            label: d.domain.name,
            href: `/domains/${d.domain.slug}`,
          })),
        ],
      };
    }
    case "feats": {
      const r = await prisma.feat.findUnique({ where: { slug }, include: { source: src } });
      if (!r) return null;
      const indexData = r.indexData as Record<string, unknown>;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: indexNumber(indexData, "sourcePage") },
        statLine: r.featType ? `${r.featType} feat` : null,
        fields: {},
        sections: buildFeatSections(indexData),
        related: [],
      };
    }
    case "monsters": {
      const r = await prisma.monster.findUnique({
        where: { slug },
        include: {
          source: src,
          feats: { include: { feat: { select: { slug: true, name: true } } } },
          abilities: { include: { rule: { select: { slug: true, name: true } } } },
        },
      });
      if (!r) return null;
      const indexData = r.indexData as Record<string, unknown>;
      const linkedAbilities = r.abilities.map((a) => ({
        label: a.rule.name,
        href: `/rules/${a.rule.slug}`,
      }));
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: indexNumber(indexData, "sourcePage") },
        statLine: indexString(indexData, "stat_line"),
        fields: buildMonsterFields(indexData, r),
        flavorHtml: indexString(indexData, "flavorHtml"),
        combatHtml: indexString(indexData, "combatHtml"),
        featLinks: r.feats.map((f) => ({
          label: f.feat.name,
          href: `/feats/${f.feat.slug}`,
        })),
        specialAbilities: parseMonsterAbilities(indexData, linkedAbilities),
        related: [],
      };
    }
    case "classes": {
      const r = await prisma.dndClass.findUnique({
        where: { slug },
        include: {
          source: src,
        },
      });
      if (!r) return null;

      const levelCounts = await prisma.spellClassLevel.groupBy({
        by: ["level"],
        where: { classId: r.id },
        _count: { spellId: true },
        orderBy: { level: "asc" },
      });

      const indexData = r.indexData as Record<string, unknown>;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: { "Hit Die": r.hitDie, "Skill Points": r.skillPoints },
        sections: buildClassSections(indexData),
        advancementHtml: (indexData?.advancementHtml as string) ?? null,
        spellLevels: levelCounts.map((row) => ({
          level: row.level,
          label: formatSpellLevelLabel(row.level),
          count: row._count.spellId,
        })),
        classSkills: parseClassSkills(indexData?.classSkills),
        related: [],
      };
    }
    case "skills": {
      const r = await prisma.skill.findUnique({ where: { slug }, include: { source: src } });
      if (!r) return null;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: {
          "Key Ability": r.keyAbility,
          "Trained Only": r.trainedOnly?.toString() ?? null,
          "Armor Check Penalty": r.armorCheckPenalty?.toString() ?? null,
        },
        related: [],
      };
    }
    case "races": {
      const r = await prisma.race.findUnique({ where: { slug }, include: { source: src } });
      if (!r) return null;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: { Size: r.size, Type: r.creatureType, "Level Adjustment": r.levelAdjustment },
        related: [],
      };
    }
    case "items": {
      const r = await prisma.item.findUnique({ where: { slug }, include: { source: src } });
      if (!r) return null;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: { Type: r.itemType, Price: r.price, "Caster Level": r.casterLevel, Aura: r.aura },
        related: [],
      };
    }
    case "equipment": {
      const r = await prisma.equipment.findUnique({ where: { slug }, include: { source: src } });
      if (!r) return null;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: { Kind: r.kind, Category: r.category, Cost: r.cost, Weight: r.weight },
        related: [],
      };
    }
    case "domains": {
      const r = await prisma.domain.findUnique({
        where: { slug },
        include: {
          source: src,
          domainSpells: {
            include: { spell: { select: { slug: true, name: true } } },
            orderBy: { position: "asc" },
          },
        },
      });
      if (!r) return null;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.grantedPowerHtml ?? r.descriptionHtml,
        descriptionText: r.grantedPowerText ?? r.descriptionText,
        source: { ...r.source, page: null },
        fields: { Type: r.domainType },
        related: r.domainSpells.map((ds) => ({
          label: ds.spell.name,
          href: `/spells/${ds.spell.slug}`,
          meta: `Position ${ds.position}`,
        })),
      };
    }
    case "deities": {
      const r = await prisma.deity.findUnique({ where: { slug }, include: { source: src } });
      if (!r) return null;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: { Alignment: r.alignment, Pantheon: r.pantheon, Portfolio: r.portfolio },
        related: [],
      };
    }
    case "psionics": {
      const r = await prisma.psionic.findUnique({
        where: { slug },
        include: {
          source: src,
          classes: { include: { class: { select: { slug: true, name: true } } } },
          disciplines: { include: { domain: { select: { slug: true, name: true } } } },
        },
      });
      if (!r) return null;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: {
          "Power Points": r.powerPoints,
          Discipline: r.discipline,
          "Manifesting Time": r.manifestingTime,
          Range: r.range,
        },
        related: [
          ...r.classes.map((c) => ({
            label: c.class.name,
            href: `/classes/${c.class.slug}`,
            meta: `Level ${c.level}`,
          })),
          ...r.disciplines.map((d) => ({
            label: d.domain.name,
            href: `/domains/${d.domain.slug}`,
          })),
        ],
      };
    }
    case "templates": {
      const r = await prisma.template.findUnique({
        where: { slug },
        include: {
          source: src,
          sampleMonsters: { include: { monster: { select: { slug: true, name: true } } } },
        },
      });
      if (!r) return null;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: { "CR Change": r.crChange, "Level Adjustment": r.levelAdjustment },
        related: r.sampleMonsters
          .filter((s) => s.monster)
          .map((s) => ({
            label: s.monster!.name,
            href: `/monsters/${s.monster!.slug}`,
          })),
      };
    }
    case "rules": {
      const r = await prisma.rule.findUnique({ where: { slug }, include: { source: src } });
      if (!r) return null;
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: { Category: r.category, Subcategory: r.subcategory },
        related: [],
      };
    }
    default:
      return null;
  }
}

export async function searchAll(query: string, limit = 20): Promise<
  { category: CategoryKey; slug: string; name: string; snippet: string | null }[]
> {
  if (!query || query.length < 2) return [];

  const pattern = `%${query}%`;
  const results: { category: CategoryKey; slug: string; name: string; snippet: string | null }[] = [];

  const searches: [CategoryKey, () => Promise<{ slug: string; name: string; descriptionText: string | null }[]>][] = [
    ["spells", () => prisma.spell.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: limit, select: { slug: true, name: true, descriptionText: true } })],
    ["feats", () => prisma.feat.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: limit, select: { slug: true, name: true, descriptionText: true } })],
    ["monsters", () => prisma.monster.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: limit, select: { slug: true, name: true, descriptionText: true } })],
    ["classes", () => prisma.dndClass.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: limit, select: { slug: true, name: true, descriptionText: true } })],
    ["skills", () => prisma.skill.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: limit, select: { slug: true, name: true, descriptionText: true } })],
    ["races", () => prisma.race.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: limit, select: { slug: true, name: true, descriptionText: true } })],
    ["items", () => prisma.item.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: limit, select: { slug: true, name: true, descriptionText: true } })],
    ["domains", () => prisma.domain.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: limit, select: { slug: true, name: true, descriptionText: true } })],
    ["psionics", () => prisma.psionic.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: limit, select: { slug: true, name: true, descriptionText: true } })],
    ["rules", () => prisma.rule.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: limit, select: { slug: true, name: true, descriptionText: true } })],
  ];

  void pattern;
  for (const [cat, fn] of searches) {
    if (results.length >= limit) break;
    const rows = await fn();
    for (const row of rows) {
      results.push({
        category: cat,
        slug: row.slug,
        name: row.name,
        snippet: row.descriptionText?.slice(0, 120) ?? null,
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function getClassSpellsAtLevel(
  classSlug: string,
  level: number,
): Promise<ClassSpellRef[]> {
  const rows = await prisma.spellClassLevel.findMany({
    where: { class: { slug: classSlug }, level },
    orderBy: { spell: { name: "asc" } },
    select: {
      spell: {
        select: {
          slug: true,
          name: true,
          school: true,
          components: true,
          descriptionText: true,
          indexData: true,
          source: { select: { abbrev: true, edition: true } },
        },
      },
    },
  });

  return rows.map(({ spell }) => ({
    slug: spell.slug,
    name: spell.name,
    school: spell.school,
    description: spellDescriptionSnippet(spell.indexData, spell.descriptionText),
    components: parseSpellComponents(spell.components, spell.indexData),
    sourceAbbrev: spell.source.abbrev,
    edition: spell.source.edition,
  }));
}

export async function getSpellPreview(spellSlug: string): Promise<SpellPreview | null> {
  const r = await prisma.spell.findUnique({
    where: { slug: spellSlug },
    include: { source: { select: { name: true, abbrev: true, edition: true } } },
  });
  if (!r) return null;

  return {
    slug: r.slug,
    name: r.name,
    source: r.source,
    fields: {
      School: r.school,
      "Casting Time": r.castingTime,
      Components: r.components,
      Range: r.range,
      Target: r.target,
      Duration: r.duration,
      "Saving Throw": r.savingThrow,
      "Spell Resistance": r.spellResistance,
    },
    descriptionHtml: r.descriptionHtml,
    descriptionText: r.descriptionText,
  };
}

export async function listSources(): Promise<
  { id: string; name: string; abbrev: string | null; edition: string; counts: number }[]
> {
  const sources = await prisma.source.findMany({
    orderBy: [{ edition: "asc" }, { abbrev: "asc" }],
    include: {
      _count: {
        select: {
          spells: true, feats: true, monsters: true, classes: true,
          skills: true, races: true, items: true, equipment: true,
          domains: true, deities: true, psionics: true, templates: true, rules: true,
        },
      },
    },
  });

  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    abbrev: s.abbrev,
    edition: s.edition,
    counts: Object.values(s._count).reduce((a, b) => a + b, 0),
  }));
}

/** Live entity totals per category for hub UI. */
export async function getCategoryCounts(): Promise<Record<CategoryKey, number>> {
  const [
    spells,
    feats,
    monsters,
    classes,
    skills,
    races,
    items,
    equipment,
    domains,
    deities,
    psionics,
    templates,
    rules,
  ] = await Promise.all([
    prisma.spell.count(),
    prisma.feat.count(),
    prisma.monster.count(),
    prisma.dndClass.count(),
    prisma.skill.count(),
    prisma.race.count(),
    prisma.item.count(),
    prisma.equipment.count(),
    prisma.domain.count(),
    prisma.deity.count(),
    prisma.psionic.count(),
    prisma.template.count(),
    prisma.rule.count(),
  ]);

  return {
    spells,
    feats,
    monsters,
    classes,
    skills,
    races,
    items,
    equipment,
    domains,
    deities,
    psionics,
    templates,
    rules,
  };
}

export async function getSourceByAbbrev(abbrev: string) {
  return prisma.source.findFirst({
    where: { abbrev },
    include: {
      _count: {
        select: {
          spells: true, feats: true, monsters: true, classes: true,
          skills: true, races: true, items: true, equipment: true,
          domains: true, deities: true, psionics: true, templates: true, rules: true,
        },
      },
    },
  });
}

export async function getSourceContent(abbrev: string, category: CategoryKey, cursor?: string) {
  const source = await prisma.source.findFirst({ where: { abbrev } });
  if (!source) return { items: [], nextCursor: null };

  return listEntities(category, { cursor, sourceAbbrev: abbrev });
}

export type SitemapSlugEntry = {
  slug: string;
  lastModified: Date | null;
};

/** Lightweight slug listing for sitemap generation (no joins / heavy fields). */
export async function listEntitySlugsForSitemap(
  category: CategoryKey,
): Promise<SitemapSlugEntry[]> {
  const select = { slug: true, scrapedAt: true } as const;
  const orderBy = { slug: "asc" as const };

  let rows: { slug: string; scrapedAt: Date | null }[];

  switch (category) {
    case "spells":
      rows = await prisma.spell.findMany({ select, orderBy });
      break;
    case "feats":
      rows = await prisma.feat.findMany({ select, orderBy });
      break;
    case "monsters":
      rows = await prisma.monster.findMany({ select, orderBy });
      break;
    case "classes":
      rows = await prisma.dndClass.findMany({ select, orderBy });
      break;
    case "skills":
      rows = await prisma.skill.findMany({ select, orderBy });
      break;
    case "races":
      rows = await prisma.race.findMany({ select, orderBy });
      break;
    case "items":
      rows = await prisma.item.findMany({ select, orderBy });
      break;
    case "equipment":
      rows = await prisma.equipment.findMany({ select, orderBy });
      break;
    case "domains":
      rows = await prisma.domain.findMany({ select, orderBy });
      break;
    case "deities":
      rows = await prisma.deity.findMany({ select, orderBy });
      break;
    case "psionics":
      rows = await prisma.psionic.findMany({ select, orderBy });
      break;
    case "templates":
      rows = await prisma.template.findMany({ select, orderBy });
      break;
    case "rules":
      rows = await prisma.rule.findMany({ select, orderBy });
      break;
    default:
      return [];
  }

  return rows.map((r) => ({
    slug: r.slug,
    lastModified: r.scrapedAt,
  }));
}

/** Source abbrevs for `/sources/{abbrev}` sitemap entries. */
export async function listSourceAbbrevsForSitemap(): Promise<
  { abbrev: string }[]
> {
  const rows = await prisma.source.findMany({
    where: { abbrev: { not: null } },
    select: { abbrev: true },
    orderBy: { abbrev: "asc" },
  });
  const seen = new Set<string>();
  const result: { abbrev: string }[] = [];
  for (const row of rows) {
    if (!row.abbrev || seen.has(row.abbrev)) continue;
    seen.add(row.abbrev);
    result.push({ abbrev: row.abbrev });
  }
  return result;
}
