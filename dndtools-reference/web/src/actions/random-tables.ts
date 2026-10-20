"use server";

import { getClassSpellsAtLevel } from "@/lib/entities";
import { normalizeItemName } from "@/lib/treasure/parse";
import { prisma } from "@/lib/prisma";
import {
  generateRandomTables,
  type RandomTablesInput,
  type RandomTablesResult,
  type SpellRef,
} from "@/lib/random-tables";

const WIZARD_LIST_SLUG = "wizard-99";

async function loadWizardSpellsByLevel(): Promise<Record<number, SpellRef[]>> {
  const byLevel: Record<number, SpellRef[]> = {};
  for (let level = 0; level <= 9; level += 1) {
    const rows = await getClassSpellsAtLevel(WIZARD_LIST_SLUG, level);
    byLevel[level] = rows.map((spell) => ({
      slug: spell.slug,
      name: spell.name,
      level,
    }));
  }
  return byLevel;
}

async function loadTrapSpellsByLevel(): Promise<Record<number, SpellRef[]>> {
  const rows = await prisma.spellClassLevel.findMany({
    where: { level: { gte: 1, lte: 9 } },
    select: {
      level: true,
      spell: { select: { slug: true, name: true } },
    },
  });
  const byLevel: Record<number, SpellRef[]> = {};
  for (const row of rows) {
    const bucket = byLevel[row.level] ?? [];
    bucket.push({
      slug: row.spell.slug,
      name: row.spell.name,
      level: row.level,
    });
    byLevel[row.level] = bucket;
  }
  return byLevel;
}

async function loadClassSlugMap(): Promise<Record<string, string>> {
  const rows = await prisma.dndClass.findMany({
    select: { slug: true, name: true },
  });
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.name.toLowerCase()] = row.slug;
    const firstWord = row.name.split(/\s+/)[0]?.toLowerCase();
    if (firstWord && !map[firstWord]) {
      map[firstWord] = row.slug;
    }
  }
  return map;
}

async function loadItemLinkMap(): Promise<Record<string, string>> {
  const rows = await prisma.item.findMany({
    select: { slug: true, name: true },
  });
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[normalizeItemName(row.name)] = row.slug;
  }
  return map;
}

async function loadSpellLinkMap(): Promise<Record<string, string>> {
  const rows = await prisma.spell.findMany({
    select: { slug: true, name: true },
  });
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[normalizeItemName(row.name)] = row.slug;
  }
  return map;
}

export async function rollRandomTables(
  input: RandomTablesInput,
): Promise<RandomTablesResult> {
  const context: Parameters<typeof generateRandomTables>[1] = {};

  try {
    const [classSlugByLowerName, itemSlugByLowerName, spellSlugByLowerName] =
      await Promise.all([
        loadClassSlugMap(),
        loadItemLinkMap(),
        loadSpellLinkMap(),
      ]);
    context.classSlugByLowerName = classSlugByLowerName;
    context.itemSlugByLowerName = itemSlugByLowerName;
    context.spellSlugByLowerName = spellSlugByLowerName;
  } catch {
    // compendium optional for traps and NPCs
  }

  if (input.kind === "traps") {
    try {
      context.spellsByLevel = await loadTrapSpellsByLevel();
    } catch {
      context.spellsByLevel = {};
    }
  }

  if (input.kind === "spellbooks") {
    try {
      context.wizardSpellsByLevel = await loadWizardSpellsByLevel();
    } catch {
      context.wizardSpellsByLevel = {};
    }
  }

  return generateRandomTables(input, context);
}
