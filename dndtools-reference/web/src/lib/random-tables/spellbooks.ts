import { generateBuiltinNames } from "@/lib/names";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import type { SpellRef, SpellbookRank, SpellbookResult } from "./types";

type LevelCounts = Record<number, number>;

function countsForRank(rank: SpellbookRank, rng: SeededRng): LevelCounts {
  const counts: LevelCounts = {
    0: rng.pickInt(1, 6),
    1: rng.pickInt(1, 4),
  };
  if (rank === "mundane") {
    return counts;
  }
  counts[2] = rng.pickInt(1, 4);
  counts[3] = rng.pickInt(1, 3);
  if (rank === "minor") {
    return counts;
  }
  counts[4] = rng.pickInt(1, 4);
  counts[5] = rng.pickInt(1, 3);
  counts[6] = rng.pickInt(1, 2);
  if (rank === "medium") {
    return counts;
  }
  counts[7] = rng.pickInt(1, 3);
  counts[8] = rng.pickInt(1, 2);
  counts[9] = 1;
  return counts;
}

function pickSpellsForLevel(
  pool: SpellRef[],
  count: number,
  rng: SeededRng,
  used: Set<string>,
): SpellRef[] {
  const available = pool.filter((spell) => !used.has(spell.slug));
  const picked = rng.sample(available, Math.min(count, available.length));
  for (const spell of picked) {
    used.add(spell.slug);
  }
  return picked;
}

export function rollSpellbook(
  rank: SpellbookRank,
  rng: SeededRng,
  wizardSpellsByLevel: Record<number, SpellRef[]>,
): SpellbookResult {
  const [titleBase] = generateBuiltinNames(
    { catalogId: "dungeon", count: 1, seed: rng.pickInt(1, 999_999) },
    rng,
  );
  const title = titleBase ? `Grimoire of ${titleBase}` : "Untitled spellbook";

  const levelCounts = countsForRank(rank, rng);
  const used = new Set<string>();
  const spells: SpellbookResult["spells"] = [];

  for (let level = 0; level <= 9; level += 1) {
    const need = levelCounts[level] ?? 0;
    if (need <= 0) continue;
    const pool = wizardSpellsByLevel[level] ?? [];
    const picked = pickSpellsForLevel(pool, need, rng, used);
    for (const spell of picked) {
      spells.push({
        name: spell.name,
        level: spell.level,
        href: `/spells/${spell.slug}`,
      });
    }
  }

  spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  return { kind: "spellbook", title, spells };
}
