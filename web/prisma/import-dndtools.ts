import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { PrismaClient, EntityCategory, DomainType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const DATA_DIR = process.env.DATA_DIR ?? resolve(__dirname, "../../data/dndtools");
const BATCH_SIZE = 500;

type LinkRef = {
  name?: string;
  slug?: string;
  url?: string;
  id?: number | string | null;
  level?: number | null;
};

type SourceData = {
  name?: string;
  abbrev?: string | null;
  edition?: string;
  page?: number | null;
  url?: string | null;
};

type RecordBase = {
  id?: number | string | null;
  slug: string;
  name: string;
  source_url?: string;
  scraped_at?: string;
  index?: Record<string, unknown>;
  source?: SourceData;
  description_html?: string | null;
  description_text?: string | null;
  [key: string]: unknown;
};

const CATEGORY_FILES = [
  "skills",
  "rules",
  "classes",
  "feats",
  "races",
  "deities",
  "equipment",
  "items",
  "domains",
  "monsters",
  "templates",
  "spells",
  "psionics",
] as const;

const ENTITY_CATEGORY_MAP: Record<string, EntityCategory> = {
  spells: "SPELL",
  feats: "FEAT",
  monsters: "MONSTER",
  templates: "TEMPLATE",
  classes: "CLASS",
  skills: "SKILL",
  equipment: "EQUIPMENT",
  items: "ITEM",
  races: "RACE",
  deities: "DEITY",
  domains: "DOMAIN",
  psionics: "PSIONIC",
  rules: "RULE",
};

const slugMaps: Record<string, Map<string, string>> = {};
let unresolvedCount = 0;

function loadJson(filename: string): RecordBase[] {
  const path = join(DATA_DIR, `${filename}.json`);
  if (!existsSync(path)) {
    throw new Error(`Missing data file: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as RecordBase[];
}

function parseExternalId(id: unknown): number | null {
  if (typeof id === "number") return id;
  if (typeof id === "string" && /^\d+$/.test(id)) return parseInt(id, 10);
  return null;
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function sourceKey(source: SourceData): string {
  const name = source.name ?? "Core";
  const abbrev = source.abbrev ?? "";
  const edition = source.edition ?? "3.5";
  return `${name}::${abbrev}::${edition}`;
}

async function pass1Sources(): Promise<Map<string, string>> {
  console.log("Pass 1: Importing sources...");
  const sourceMap = new Map<string, string>();
  const seen = new Set<string>();

  for (const file of CATEGORY_FILES) {
    const records = loadJson(file);
    for (const record of records) {
      const src = record.source ?? {};
      const index = record.index ?? {};
      const merged: SourceData = {
        name: src.name ?? "Core",
        abbrev: src.abbrev ?? (index.source_abbrev as string) ?? null,
        edition: src.edition ?? (index.edition as string) ?? "3.5",
        page: src.page ?? null,
        url: src.url ?? null,
      };
      const key = sourceKey(merged);
      if (seen.has(key)) continue;
      seen.add(key);

      const row = await prisma.source.upsert({
        where: {
          name_abbrev_edition: {
            name: merged.name!,
            abbrev: merged.abbrev ?? null,
            edition: merged.edition!,
          },
        },
        create: {
          name: merged.name!,
          abbrev: merged.abbrev ?? null,
          edition: merged.edition!,
        },
        update: {},
      });
      sourceMap.set(key, row.id);
    }
  }

  console.log(`  ${sourceMap.size} unique sources`);
  return sourceMap;
}

function getSourceId(record: RecordBase, sourceMap: Map<string, string>): string {
  const src = record.source ?? {};
  const index = record.index ?? {};
  const merged: SourceData = {
    name: src.name ?? "Core",
    abbrev: src.abbrev ?? (index.source_abbrev as string) ?? null,
    edition: src.edition ?? (index.edition as string) ?? "3.5",
  };
  const id = sourceMap.get(sourceKey(merged));
  if (!id) throw new Error(`Source not found for ${record.slug}`);
  return id;
}

async function batchUpsert<T>(
  items: T[],
  handler: (batch: T[]) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await handler(items.slice(i, i + BATCH_SIZE));
  }
}

async function logUnresolved(
  fromCategory: EntityCategory,
  fromSlug: string,
  toCategory: EntityCategory,
  ref: LinkRef,
  field: string,
): Promise<void> {
  unresolvedCount++;
  await prisma.unresolvedRef.create({
    data: {
      fromCategory,
      fromSlug,
      toCategory,
      toSlug: ref.slug ?? null,
      toExternalId: parseExternalId(ref.id),
      field,
    },
  });
}

function resolveId(
  category: string,
  ref: LinkRef,
): string | null {
  const map = slugMaps[category];
  if (!map) return null;
  if (ref.slug && map.has(ref.slug)) return map.get(ref.slug)!;
  if (ref.id && ref.id !== "sample") {
    const extId = parseExternalId(ref.id);
    if (extId !== null) {
      for (const [slug, id] of map) {
        void slug;
        // slug map is slug->id only; external id lookup done separately
      }
    }
  }
  return null;
}

async function buildSlugMaps(): Promise<void> {
  const tables: [string, () => Promise<{ slug: string; id: string; externalId: number | null }[]>][] = [
    ["classes", () => prisma.dndClass.findMany({ select: { slug: true, id: true, externalId: true } })],
    ["spells", () => prisma.spell.findMany({ select: { slug: true, id: true, externalId: true } })],
    ["feats", () => prisma.feat.findMany({ select: { slug: true, id: true, externalId: true } })],
    ["monsters", () => prisma.monster.findMany({ select: { slug: true, id: true, externalId: true } })],
    ["domains", () => prisma.domain.findMany({ select: { slug: true, id: true, externalId: true } })],
    ["rules", () => prisma.rule.findMany({ select: { slug: true, id: true, externalId: true } })],
    ["psionics", () => prisma.psionic.findMany({ select: { slug: true, id: true, externalId: true } })],
    ["templates", () => prisma.template.findMany({ select: { slug: true, id: true, externalId: true } })],
  ];

  for (const [cat, fetcher] of tables) {
    const rows = await fetcher();
    const map = new Map<string, string>();
    const extMap = new Map<number, string>();
    for (const row of rows) {
      map.set(row.slug, row.id);
      if (row.externalId !== null) extMap.set(row.externalId, row.id);
    }
    slugMaps[cat] = map;
    slugMaps[`${cat}_ext`] = extMap as unknown as Map<string, string>;
  }
}

function lookupRef(category: string, ref: LinkRef): string | null {
  const slugMap = slugMaps[category];
  if (ref.slug && slugMap?.has(ref.slug)) return slugMap.get(ref.slug)!;
  const extId = parseExternalId(ref.id);
  if (extId !== null) {
    const extMap = slugMaps[`${category}_ext`] as unknown as Map<number, string>;
    if (extMap?.has(extId)) return extMap.get(extId)!;
  }
  return null;
}

async function pass2Entities(sourceMap: Map<string, string>): Promise<Record<string, number>> {
  console.log("Pass 2: Importing entities...");
  const counts: Record<string, number> = {};

  // Skills
  {
    const records = loadJson("skills");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        await prisma.skill.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            keyAbility: (r.index as Record<string, string>)?.key_ability ?? (r.key_ability as string) ?? null,
            trainedOnly: (r.index as Record<string, boolean>)?.trained_only ?? null,
            armorCheckPenalty: (r.index as Record<string, boolean>)?.armor_check_penalty ?? null,
          },
          update: {
            name: r.name,
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
          },
        });
      }
    });
    counts.skills = records.length;
    console.log(`  skills: ${records.length}`);
  }

  // Rules
  {
    const records = loadJson("rules");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        await prisma.rule.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            category: (r.index as Record<string, string>)?.category ?? (r.category as string) ?? null,
            subcategory: (r.index as Record<string, string>)?.subcategory ?? (r.subcategory as string) ?? null,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.rules = records.length;
    console.log(`  rules: ${records.length}`);
  }

  // Classes
  {
    const records = loadJson("classes");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        const index = r.index as Record<string, string> | undefined;
        await prisma.dndClass.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            hitDie: (r.hit_die as string) ?? index?.hit_die ?? null,
            skillPoints: (r.skill_points as string) ?? index?.skill_points ?? null,
            isPrestige: Boolean(index?.prestige_level && index.prestige_level !== ""),
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.classes = records.length;
    console.log(`  classes: ${records.length}`);
  }

  // Feats
  {
    const records = loadJson("feats");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        const index = r.index as Record<string, string> | undefined;
        await prisma.feat.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            featType: (r.type as string) ?? index?.type ?? null,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.feats = records.length;
    console.log(`  feats: ${records.length}`);
  }

  // Races
  {
    const records = loadJson("races");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        const index = r.index as Record<string, string> | undefined;
        await prisma.race.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            size: (r.size as string) ?? null,
            creatureType: (r.type as string) ?? index?.type ?? null,
            levelAdjustment: (r.level_adjustment as string) ?? index?.level_adjustment ?? null,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.races = records.length;
    console.log(`  races: ${records.length}`);
  }

  // Deities
  {
    const records = loadJson("deities");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        await prisma.deity.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            alignment: (r.alignment as string) ?? null,
            pantheon: (r.pantheon as string) ?? null,
            portfolio: (r.portfolio as string) ?? null,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.deities = records.length;
    console.log(`  deities: ${records.length}`);
  }

  // Equipment
  {
    const records = loadJson("equipment");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        const index = r.index as Record<string, string> | undefined;
        await prisma.equipment.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            kind: (r.kind as string) ?? index?.kind ?? null,
            category: (r.category as string) ?? index?.category ?? null,
            cost: (r.cost as string) ?? index?.cost ?? null,
            weight: (r.weight as string) ?? index?.weight ?? null,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.equipment = records.length;
    console.log(`  equipment: ${records.length}`);
  }

  // Items
  {
    const records = loadJson("items");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        const index = r.index as Record<string, string> | undefined;
        await prisma.item.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            itemType: (r.type as string) ?? index?.type ?? null,
            price: (r.price as string) ?? index?.price ?? null,
            casterLevel: (r.caster_level as string) ?? null,
            aura: (r.aura as string) ?? null,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.items = records.length;
    console.log(`  items: ${records.length}`);
  }

  // Domains
  {
    const records = loadJson("domains");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        await prisma.domain.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            grantedPowerHtml: (r.granted_power_html as string) ?? null,
            grantedPowerText: (r.granted_power_text as string) ?? null,
            domainType: DomainType.CLERIC,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.domains = records.length;
    console.log(`  domains: ${records.length}`);
  }

  // Monsters
  {
    const records = loadJson("monsters");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        const index = r.index as Record<string, string> | undefined;
        await prisma.monster.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            creatureType: (r.type as string) ?? index?.type ?? null,
            subtypes: (r.subtypes as string) ?? index?.subtypes ?? null,
            challengeRating: (r.challenge_rating as string) ?? index?.cr ?? null,
            hitDice: (r.hit_dice as string) ?? index?.hd ?? null,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.monsters = records.length;
    console.log(`  monsters: ${records.length}`);
  }

  // Templates
  {
    const records = loadJson("templates");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        const index = r.index as Record<string, string> | undefined;
        await prisma.template.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            templateType: (r.type_change as string) ?? index?.type ?? null,
            crChange: (r.cr_change as string) ?? index?.cr ?? null,
            levelAdjustment: (r.level_adjustment as string) ?? index?.la ?? null,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.templates = records.length;
    console.log(`  templates: ${records.length}`);
  }

  // Spells
  {
    const records = loadJson("spells");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        const classes = (r.classes as LinkRef[]) ?? [];
        const levels = classes.map((c) => c.level).filter((l): l is number => typeof l === "number");
        const minLevel = levels.length > 0 ? Math.min(...levels) : null;
        await prisma.spell.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            school: (r.school as string) ?? (r.index as Record<string, string>)?.school ?? null,
            castingTime: (r.casting_time as string) ?? null,
            components: (r.components as string) ?? null,
            range: (r.range as string) ?? null,
            minLevel,
            target: (r.target as string) ?? null,
            duration: (r.duration as string) ?? null,
            savingThrow: (r.saving_throw as string) ?? null,
            spellResistance: (r.spell_resistance as string) ?? null,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object, minLevel },
        });
      }
    });
    counts.spells = records.length;
    console.log(`  spells: ${records.length}`);
  }

  // Psionics
  {
    const records = loadJson("psionics");
    await batchUpsert(records, async (batch) => {
      for (const r of batch) {
        const index = r.index as Record<string, string> | undefined;
        await prisma.psionic.upsert({
          where: { slug: r.slug },
          create: {
            slug: r.slug,
            externalId: parseExternalId(r.id),
            name: r.name,
            sourceUrl: r.source_url ?? null,
            scrapedAt: parseDate(r.scraped_at),
            sourceId: getSourceId(r, sourceMap),
            indexData: (r.index ?? {}) as object,
            descriptionHtml: (r.description_html as string) ?? null,
            descriptionText: (r.description_text as string) ?? null,
            powerPoints: (r.power_points as string) ?? index?.power_points ?? null,
            discipline: index?.discipline ?? null,
            manifestingTime: (r.manifesting_time as string) ?? null,
            range: (r.range as string) ?? null,
          },
          update: { name: r.name, indexData: (r.index ?? {}) as object },
        });
      }
    });
    counts.psionics = records.length;
    console.log(`  psionics: ${records.length}`);
  }

  return counts;
}

async function pass3Junctions(): Promise<void> {
  console.log("Pass 3: Importing relations...");
  await buildSlugMaps();

  // Mark psionic disciplines
  const psionics = loadJson("psionics");
  const disciplineSlugs = new Set<string>();
  for (const p of psionics) {
    for (const d of (p.disciplines as LinkRef[]) ?? []) {
      if (d.slug) disciplineSlugs.add(d.slug);
    }
  }
  if (disciplineSlugs.size > 0) {
    await prisma.domain.updateMany({
      where: { slug: { in: [...disciplineSlugs] } },
      data: { domainType: DomainType.PSIONIC_DISCIPLINE },
    });
    console.log(`  marked ${disciplineSlugs.size} psionic disciplines`);
  }

  // Spell <-> Class
  const spells = loadJson("spells");
  const spellClassRows: { spellId: string; classId: string; level: number }[] = [];
  for (const s of spells) {
    for (const ref of (s.classes as LinkRef[]) ?? []) {
      const spellId = lookupRef("spells", { slug: s.slug });
      const classId = lookupRef("classes", ref);
      if (!spellId || !classId) {
        if (!classId) await logUnresolved("SPELL", s.slug, "CLASS", ref, "classes");
        continue;
      }
      if (typeof ref.level === "number") {
        spellClassRows.push({ spellId, classId, level: ref.level });
      }
    }
  }
  await prisma.spellClassLevel.deleteMany();
  await batchUpsert(spellClassRows, async (batch) => {
    await prisma.spellClassLevel.createMany({ data: batch, skipDuplicates: true });
  });
  console.log(`  spell-class levels: ${spellClassRows.length}`);

  // Spell <-> Domain
  const spellDomainRows: { spellId: string; domainId: string }[] = [];
  for (const s of spells) {
    const domains = s.domains as LinkRef[] | null;
    if (!domains) continue;
    const spellId = lookupRef("spells", { slug: s.slug });
    for (const ref of domains) {
      const domainId = lookupRef("domains", ref);
      if (!spellId || !domainId) {
        if (!domainId) await logUnresolved("SPELL", s.slug, "DOMAIN", ref, "domains");
        continue;
      }
      spellDomainRows.push({ spellId, domainId });
    }
  }
  await prisma.spellDomain.deleteMany();
  await batchUpsert(spellDomainRows, async (batch) => {
    await prisma.spellDomain.createMany({ data: batch, skipDuplicates: true });
  });
  console.log(`  spell-domain links: ${spellDomainRows.length}`);

  // Domain -> Spell (ordered)
  const domains = loadJson("domains");
  const domainSpellRows: { domainId: string; spellId: string; position: number }[] = [];
  for (const d of domains) {
    const domainId = lookupRef("domains", { slug: d.slug });
    const domainSpells = (d.domain_spells as LinkRef[]) ?? [];
    domainSpells.forEach((ref, idx) => {
      const spellId = lookupRef("spells", ref);
      if (!domainId || !spellId) {
        if (!spellId) void logUnresolved("DOMAIN", d.slug, "SPELL", ref, "domain_spells");
        return;
      }
      domainSpellRows.push({ domainId, spellId, position: idx + 1 });
    });
  }
  await prisma.domainSpell.deleteMany();
  await batchUpsert(domainSpellRows, async (batch) => {
    await prisma.domainSpell.createMany({ data: batch, skipDuplicates: true });
  });
  console.log(`  domain spells: ${domainSpellRows.length}`);

  // Psionic <-> Class
  const psionicClassRows: { psionicId: string; classId: string; level: number }[] = [];
  for (const p of psionics) {
    const psionicId = lookupRef("psionics", { slug: p.slug });
    for (const ref of (p.classes as LinkRef[]) ?? []) {
      const classId = lookupRef("classes", ref);
      if (!psionicId || !classId) {
        if (!classId) await logUnresolved("PSIONIC", p.slug, "CLASS", ref, "classes");
        continue;
      }
      if (typeof ref.level === "number") {
        psionicClassRows.push({ psionicId, classId, level: ref.level });
      }
    }
  }
  await prisma.psionicClassLevel.deleteMany();
  await batchUpsert(psionicClassRows, async (batch) => {
    await prisma.psionicClassLevel.createMany({ data: batch, skipDuplicates: true });
  });
  console.log(`  psionic-class levels: ${psionicClassRows.length}`);

  // Psionic <-> Discipline (domain)
  const psionicDiscRows: { psionicId: string; domainId: string; level: number | null }[] = [];
  for (const p of psionics) {
    const psionicId = lookupRef("psionics", { slug: p.slug });
    for (const ref of (p.disciplines as LinkRef[]) ?? []) {
      const domainId = lookupRef("domains", ref);
      if (!psionicId || !domainId) {
        if (!domainId) await logUnresolved("PSIONIC", p.slug, "DOMAIN", ref, "disciplines");
        continue;
      }
      psionicDiscRows.push({
        psionicId,
        domainId,
        level: typeof ref.level === "number" ? ref.level : null,
      });
    }
  }
  await prisma.psionicDiscipline.deleteMany();
  await batchUpsert(psionicDiscRows, async (batch) => {
    await prisma.psionicDiscipline.createMany({ data: batch, skipDuplicates: true });
  });
  console.log(`  psionic disciplines: ${psionicDiscRows.length}`);

  // Monster <-> Feat
  const monsters = loadJson("monsters");
  const monsterFeatRows: { monsterId: string; featId: string }[] = [];
  for (const m of monsters) {
    const monsterId = lookupRef("monsters", { slug: m.slug });
    for (const ref of (m.feats as LinkRef[]) ?? []) {
      const featId = lookupRef("feats", ref);
      if (!monsterId || !featId) {
        if (!featId) await logUnresolved("MONSTER", m.slug, "FEAT", ref, "feats");
        continue;
      }
      monsterFeatRows.push({ monsterId, featId });
    }
  }
  await prisma.monsterFeat.deleteMany();
  await batchUpsert(monsterFeatRows, async (batch) => {
    await prisma.monsterFeat.createMany({ data: batch, skipDuplicates: true });
  });
  console.log(`  monster feats: ${monsterFeatRows.length}`);

  // Monster <-> Rule (special abilities)
  const monsterAbilityRows: { monsterId: string; ruleId: string }[] = [];
  for (const m of monsters) {
    const monsterId = lookupRef("monsters", { slug: m.slug });
    for (const ref of (m.special_abilities as LinkRef[]) ?? []) {
      const ruleId = lookupRef("rules", ref);
      if (!monsterId || !ruleId) {
        if (!ruleId) await logUnresolved("MONSTER", m.slug, "RULE", ref, "special_abilities");
        continue;
      }
      monsterAbilityRows.push({ monsterId, ruleId });
    }
  }
  await prisma.monsterAbility.deleteMany();
  await batchUpsert(monsterAbilityRows, async (batch) => {
    await prisma.monsterAbility.createMany({ data: batch, skipDuplicates: true });
  });
  console.log(`  monster abilities: ${monsterAbilityRows.length}`);

  // Template <-> Monster samples
  const templates = loadJson("templates");
  await prisma.templateSampleMonster.deleteMany();
  const templateSampleRows: { templateId: string; monsterId: string | null; sampleName: string | null }[] = [];
  for (const t of templates) {
    const templateId = lookupRef("templates", { slug: t.slug });
    for (const ref of (t.sample_monsters as LinkRef[]) ?? []) {
      const monsterId =
        ref.id === "sample" ? null : lookupRef("monsters", ref);
      if (!templateId) continue;
      templateSampleRows.push({
        templateId,
        monsterId,
        sampleName: ref.name ?? null,
      });
    }
  }
  await batchUpsert(templateSampleRows, async (batch) => {
    await prisma.templateSampleMonster.createMany({ data: batch });
  });
  console.log(`  template samples: ${templateSampleRows.length}`);
}

async function updateSearchVectors(): Promise<void> {
  console.log("Updating full-text search vectors...");
  const tables = [
    "Spell", "Feat", "Monster", "Template", "classes", "Skill",
    "Equipment", "Item", "Race", "Deity", "Domain", "Psionic", "Rule",
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`
      UPDATE "${table}" SET "searchVector" = to_tsvector('english', coalesce("name", '') || ' ' || coalesce("descriptionText", ''))
    `);
  }
  console.log("  search vectors updated");
}

async function main(): Promise<void> {
  const started = Date.now();
  const importRun = await prisma.importRun.create({ data: { status: "running" } });

  try {
    unresolvedCount = 0;
    await prisma.unresolvedRef.deleteMany();

    const sourceMap = await pass1Sources();
    const counts = await pass2Entities(sourceMap);
    await pass3Junctions();
    await updateSearchVectors();

    const durationMs = Date.now() - started;
    await prisma.importRun.update({
      where: { id: importRun.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        durationMs,
        recordCounts: counts,
        unresolvedCount,
      },
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`\nImport complete: ${total} records in ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`Unresolved refs: ${unresolvedCount}`);
  } catch (err) {
    await prisma.importRun.update({
      where: { id: importRun.id },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
        durationMs: Date.now() - started,
      },
    });
    throw err;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
