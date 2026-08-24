import type { ArcaneSchool } from "@/lib/spell-utils";
import { createSeededRng } from "./seeded-rng";
import { totalSpellbookPages } from "./pages";
import type { SpellbookByLevel, SpellbookInput, SpellbookResult, WizardSpellRef } from "./types";
import {
  maxSpellLevelForWizard,
  spellsOfInterestCount,
  startingFirstLevelSpellCount,
} from "./wizard-progression";

function hasSchool(spell: WizardSpellRef, school: ArcaneSchool): boolean {
  return spell.schools.includes(school);
}

function isProhibited(spell: WizardSpellRef, prohibited: ArcaneSchool[]): boolean {
  return spell.schools.some((school) => prohibited.includes(school as ArcaneSchool));
}

function filterPool(
  pool: WizardSpellRef[],
  prohibitedSchools: ArcaneSchool[],
): WizardSpellRef[] {
  if (prohibitedSchools.length === 0) return pool;
  return pool.filter((spell) => !isProhibited(spell, prohibitedSchools));
}

function pickSpellAtLevel(
  pool: WizardSpellRef[],
  level: number,
  owned: Set<string>,
  rng: ReturnType<typeof createSeededRng>,
): WizardSpellRef | null {
  const candidates = pool.filter((spell) => spell.level === level && !owned.has(spell.slug));
  return rng.pick(candidates) ?? null;
}

function pickSpellUpToLevel(
  pool: WizardSpellRef[],
  maxLevel: number,
  owned: Set<string>,
  rng: ReturnType<typeof createSeededRng>,
): WizardSpellRef | null {
  const spellLevel = rng.pickInt(1, maxLevel);
  const direct = pickSpellAtLevel(pool, spellLevel, owned, rng);
  if (direct) return direct;

  const candidates = pool.filter(
    (spell) => spell.level >= 1 && spell.level <= maxLevel && !owned.has(spell.slug),
  );
  return rng.pick(candidates) ?? null;
}

function reserveSpecializationSpells(
  pool: WizardSpellRef[],
  specialization: ArcaneSchool,
  maxSpellLevel: number,
  rng: ReturnType<typeof createSeededRng>,
): WizardSpellRef[] {
  const reserved: WizardSpellRef[] = [];
  const owned = new Set<string>();

  for (let circle = 1; circle <= maxSpellLevel; circle++) {
    const candidates = pool.filter(
      (spell) =>
        spell.level === circle &&
        hasSchool(spell, specialization) &&
        !owned.has(spell.slug),
    );
    const picked = rng.pick(candidates);
    if (picked) {
      reserved.push(picked);
      owned.add(picked.slug);
    }
  }

  return reserved;
}

function buildSpellbook(
  pool: WizardSpellRef[],
  input: SpellbookInput,
  rng: ReturnType<typeof createSeededRng>,
): WizardSpellRef[] {
  const owned = new Set<string>();
  const book: WizardSpellRef[] = [];

  for (const cantrip of pool.filter((spell) => spell.level === 0)) {
    owned.add(cantrip.slug);
    book.push(cantrip);
  }

  const reserved =
    input.specialization != null
      ? reserveSpecializationSpells(
          pool,
          input.specialization,
          maxSpellLevelForWizard(input.wizardLevel),
          rng,
        )
      : [];

  for (const spell of reserved) {
    if (!owned.has(spell.slug)) {
      owned.add(spell.slug);
      book.push(spell);
    }
  }

  const startingCount = startingFirstLevelSpellCount(input.intModifier);
  for (let i = 0; i < startingCount; i++) {
    const picked = pickSpellAtLevel(pool, 1, owned, rng);
    if (!picked) break;
    owned.add(picked.slug);
    book.push(picked);
  }

  for (let cl = 2; cl <= input.wizardLevel; cl++) {
    const maxLevel = maxSpellLevelForWizard(cl);
    for (let i = 0; i < 2; i++) {
      const picked = pickSpellUpToLevel(pool, maxLevel, owned, rng);
      if (!picked) break;
      owned.add(picked.slug);
      book.push(picked);
    }
  }

  return book;
}

function sampleWithSpecializationBias(
  candidates: WizardSpellRef[],
  count: number,
  specialization: ArcaneSchool | null,
  rng: ReturnType<typeof createSeededRng>,
): WizardSpellRef[] {
  if (count <= 0 || candidates.length === 0) return [];
  if (!specialization) return rng.sample(candidates, count);

  const specialized = candidates.filter((spell) => hasSchool(spell, specialization));
  const general = candidates.filter((spell) => !hasSchool(spell, specialization));
  const biasedCount = Math.min(count, Math.ceil(count / 2));
  const picked = rng.sample(specialized, Math.min(biasedCount, specialized.length));
  const remaining = count - picked.length;
  const restPool = general.filter((spell) => !picked.some((p) => p.slug === spell.slug));
  const rest = rng.sample(restPool, remaining);

  const combined = [...picked, ...rest];
  if (combined.length >= count) return combined.slice(0, count);

  const leftover = candidates.filter(
    (spell) => !combined.some((pickedSpell) => pickedSpell.slug === spell.slug),
  );
  return [...combined, ...rng.sample(leftover, count - combined.length)];
}

function buildSpellsOfInterest(
  pool: WizardSpellRef[],
  book: WizardSpellRef[],
  wizardLevel: number,
  perCircle: number,
  specialization: ArcaneSchool | null,
  rng: ReturnType<typeof createSeededRng>,
): WizardSpellRef[] {
  const owned = new Set(book.map((spell) => spell.slug));
  const maxSpellLevel = maxSpellLevelForWizard(wizardLevel);
  const interest: WizardSpellRef[] = [];

  for (let circle = 0; circle <= maxSpellLevel; circle++) {
    const candidates = pool.filter(
      (spell) => spell.level === circle && !owned.has(spell.slug),
    );
    const picked = sampleWithSpecializationBias(
      candidates,
      Math.min(perCircle, candidates.length),
      specialization,
      rng,
    );
    interest.push(...picked);
  }

  return interest;
}

function groupByLevel(spells: WizardSpellRef[]): SpellbookByLevel[] {
  const byLevel = new Map<number, WizardSpellRef[]>();

  for (const spell of spells) {
    const bucket = byLevel.get(spell.level) ?? [];
    bucket.push(spell);
    byLevel.set(spell.level, bucket);
  }

  return [...byLevel.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, levelSpells]) => ({
      level,
      spells: [...levelSpells].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function generateSpellbook(
  input: SpellbookInput,
  pool: WizardSpellRef[],
): SpellbookResult {
  const wizardLevel = Math.min(20, Math.max(1, Math.floor(input.wizardLevel)));
  const intModifier = Math.floor(input.intModifier);
  const prohibitedSchools = input.prohibitedSchools.filter(
    (school) => school !== input.specialization,
  );
  const seed = input.seed ?? Date.now();
  const rng = createSeededRng(seed);

  const filteredPool = filterPool(pool, prohibitedSchools);
  const normalizedInput: SpellbookInput = {
    ...input,
    wizardLevel,
    intModifier,
    prohibitedSchools,
  };

  const spellbook = buildSpellbook(filteredPool, normalizedInput, rng);
  const interestPerLevel = Math.max(
    1,
    input.interestPerLevel ?? spellsOfInterestCount(wizardLevel),
  );
  const spellsOfInterest = buildSpellsOfInterest(
    filteredPool,
    spellbook,
    wizardLevel,
    interestPerLevel,
    input.specialization,
    rng,
  );

  const maxSpellLevel = maxSpellLevelForWizard(wizardLevel);
  const cantripCount = spellbook.filter((spell) => spell.level === 0).length;

  return {
    seed,
    spellbook: groupByLevel(spellbook),
    spellsOfInterest: groupByLevel(spellsOfInterest),
    pageCount: totalSpellbookPages(spellbook),
    totalSpells: spellbook.length,
    cantripCount,
    maxSpellLevel,
    interestPerLevel,
  };
}
