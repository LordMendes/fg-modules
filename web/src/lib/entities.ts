import { prisma } from "@/lib/prisma";
import type { CategoryKey } from "@/lib/categories";
import type { Prisma } from "@/generated/prisma/client";
import { parseSpellComponents, spellDescriptionSnippet } from "@/lib/spell-utils";
import type { SpellComponentFlags } from "@/lib/spell-utils";

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

export async function listEntities(
  category: CategoryKey,
  options: {
    cursor?: string;
    search?: string;
    sourceAbbrev?: string;
    edition?: string;
    filter?: string;
  } = {},
): Promise<{ items: EntityListItem[]; nextCursor: string | null }> {
  const { cursor, search, sourceAbbrev, edition, filter } = options;

  const sourceWhere: Prisma.SourceWhereInput = {};
  if (sourceAbbrev) sourceWhere.abbrev = sourceAbbrev;
  if (edition) sourceWhere.edition = edition;

  const baseWhere = {
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(Object.keys(sourceWhere).length ? { source: sourceWhere } : {}),
  };

  const take = PAGE_SIZE + 1;

  switch (category) {
    case "spells": {
      const where: Prisma.SpellWhereInput = {
        ...baseWhere,
        ...(filter ? { school: filter } : {}),
      };
      const rows = await prisma.spell.findMany({
        where,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        school: r.school,
        level: r.minLevel?.toString() ?? null,
        components: r.components,
      }));
    }
    case "feats": {
      const where: Prisma.FeatWhereInput = {
        ...baseWhere,
        ...(filter ? { featType: filter } : {}),
      };
      const rows = await prisma.feat.findMany({
        where,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({ type: r.featType }));
    }
    case "monsters": {
      const where: Prisma.MonsterWhereInput = {
        ...baseWhere,
        ...(filter ? { creatureType: filter } : {}),
      };
      const rows = await prisma.monster.findMany({
        where,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
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
        where: baseWhere,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        hitDie: r.hitDie,
        skillPoints: r.skillPoints,
      }));
    }
    case "skills": {
      const rows = await prisma.skill.findMany({
        where: baseWhere,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        keyAbility: r.keyAbility,
        trainedOnly: r.trainedOnly?.toString() ?? null,
      }));
    }
    case "races": {
      const rows = await prisma.race.findMany({
        where: baseWhere,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        type: r.creatureType,
        la: r.levelAdjustment,
      }));
    }
    case "items": {
      const where: Prisma.ItemWhereInput = {
        ...baseWhere,
        ...(filter ? { itemType: filter } : {}),
      };
      const rows = await prisma.item.findMany({
        where,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({ type: r.itemType, price: r.price }));
    }
    case "equipment": {
      const where: Prisma.EquipmentWhereInput = {
        ...baseWhere,
        ...(filter ? { kind: filter } : {}),
      };
      const rows = await prisma.equipment.findMany({
        where,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        kind: r.kind,
        cost: r.cost,
      }));
    }
    case "domains": {
      const rows = await prisma.domain.findMany({
        where: baseWhere,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        type: r.domainType,
      }));
    }
    case "deities": {
      const rows = await prisma.deity.findMany({
        where: baseWhere,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        alignment: r.alignment,
        pantheon: r.pantheon,
      }));
    }
    case "psionics": {
      const where: Prisma.PsionicWhereInput = {
        ...baseWhere,
        ...(filter ? { discipline: filter } : {}),
      };
      const rows = await prisma.psionic.findMany({
        where,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        discipline: r.discipline,
        powerPoints: r.powerPoints,
      }));
    }
    case "templates": {
      const rows = await prisma.template.findMany({
        where: baseWhere,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
        include: { source: sourceSelect() },
      });
      return formatList(rows, (r) => ({
        type: r.templateType,
        cr: r.crChange,
      }));
    }
    case "rules": {
      const where: Prisma.RuleWhereInput = {
        ...baseWhere,
        ...(filter ? { category: filter } : {}),
      };
      const rows = await prisma.rule.findMany({
        where,
        take,
        ...(cursor ? { cursor: { slug: cursor }, skip: 1 } : {}),
        orderBy: { name: "asc" },
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
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: { Type: r.featType },
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
      return {
        slug: r.slug, name: r.name, sourceUrl: r.sourceUrl,
        descriptionHtml: r.descriptionHtml, descriptionText: r.descriptionText,
        source: { ...r.source, page: null },
        fields: {
          Type: r.creatureType,
          Subtypes: r.subtypes,
          "Challenge Rating": r.challengeRating,
          "Hit Dice": r.hitDice,
        },
        related: [
          ...r.feats.map((f) => ({ label: f.feat.name, href: `/feats/${f.feat.slug}` })),
          ...r.abilities.map((a) => ({ label: a.rule.name, href: `/rules/${a.rule.slug}` })),
        ],
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
