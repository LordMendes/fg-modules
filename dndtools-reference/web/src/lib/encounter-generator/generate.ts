import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  calculateEncounterEl,
  elForSameCrGroup,
} from "@/lib/encounter/encounterNumbers";
import type { EncounterEntry } from "@/lib/encounter/types";
import { xpForPartyLevel } from "@/lib/encounter/xpTable";
import { filterCandidatesForEncounter } from "./environment";
import type {
  EncounterGenerateResult,
  EncounterGroup,
  EncounterInput,
  EncounterXpSummary,
  MonsterCandidate,
} from "./types";

const COUNT_OPTIONS = [1, 2, 3, 4, 6, 8, 12] as const;

function weightedPick(
  items: MonsterCandidate[],
  weightFn: (item: MonsterCandidate) => number,
  rng: SeededRng,
): MonsterCandidate | undefined {
  if (items.length === 0) return undefined;
  const weights = items.map(weightFn);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return rng.pick(items);

  let roll = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

function leadWeight(candidate: MonsterCandidate, level: number): number {
  let weight = Math.max(1, 5 - Math.abs(candidate.crNum - level));
  if (candidate.environment?.trim()) {
    weight *= 2;
  }
  return weight;
}

export function pickCountForGroup(cr: number, targetLevel: number): number {
  let bestCount: (typeof COUNT_OPTIONS)[number] = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestEl = elForSameCrGroup(cr, 1);

  for (const count of COUNT_OPTIONS) {
    const el = elForSameCrGroup(cr, count);
    if (el > targetLevel + 2) continue;
    const score = Math.abs(el - targetLevel);
    if (
      score < bestScore ||
      (score === bestScore && el > bestEl)
    ) {
      bestScore = score;
      bestCount = count;
      bestEl = el;
    }
  }

  if (bestScore === Number.POSITIVE_INFINITY) {
    for (const count of COUNT_OPTIONS) {
      const el = elForSameCrGroup(cr, count);
      const score = Math.abs(el - targetLevel);
      if (score < bestScore) {
        bestScore = score;
        bestCount = count;
      }
    }
  }

  return bestCount;
}

function toEncounterEntry(group: EncounterGroup): EncounterEntry {
  return {
    slug: group.slug,
    name: group.name,
    cr: group.cr,
    count: group.count,
  };
}

function candidateToGroup(
  candidate: MonsterCandidate,
  count: number,
): EncounterGroup {
  return {
    slug: candidate.slug,
    name: candidate.name,
    cr: candidate.cr,
    crNum: candidate.crNum,
    count,
    size: candidate.size,
    creatureType: candidate.creatureType,
    treasure: candidate.treasure,
  };
}

export function buildEncounterDescription(groups: EncounterGroup[]): string {
  return groups.map((group) => `${group.count} x ${group.name}`).join(", ");
}

export function generateEncounter(
  candidates: MonsterCandidate[],
  input: EncounterInput,
  rng: SeededRng,
): EncounterGenerateResult {
  const pool = filterCandidatesForEncounter(candidates, input);
  if (pool.length === 0) {
    return {
      description: "",
      groups: [],
      actualEl: null,
      emptyPool: true,
    };
  }

  const lead = weightedPick(pool, (c) => leadWeight(c, input.level), rng);
  if (!lead) {
    return {
      description: "",
      groups: [],
      actualEl: null,
      emptyPool: true,
    };
  }

  const groups: EncounterGroup[] = [
    candidateToGroup(lead, pickCountForGroup(lead.crNum, input.level)),
  ];

  if (rng.next() < 0.25) {
    const secondaryPool = pool.filter(
      (candidate) =>
        candidate.slug !== lead.slug && candidate.crNum <= lead.crNum - 2,
    );
    const secondary = rng.pick(secondaryPool);
    if (secondary) {
      groups.push(
        candidateToGroup(
          secondary,
          pickCountForGroup(secondary.crNum, input.level),
        ),
      );
    }
  }

  const actualEl = calculateEncounterEl(groups.map(toEncounterEntry));

  return {
    description: buildEncounterDescription(groups),
    groups,
    actualEl,
    emptyPool: false,
  };
}

export function computeEncounterXp(
  groups: EncounterGroup[],
  partyLevel: number,
  partySize: number,
): EncounterXpSummary {
  const safePartySize = Math.max(1, partySize);
  const lines = groups.map((group) => {
    const xpEach = xpForPartyLevel(partyLevel, group.crNum);
    return {
      slug: group.slug,
      name: group.name,
      count: group.count,
      xpEach,
      xpNote: xpEach === 0 ? "No XP for this party level and CR." : null,
    };
  });

  const totalXp = lines.reduce(
    (sum, line) => sum + line.count * line.xpEach,
    0,
  );

  return {
    totalXp,
    xpPerPc: Math.floor(totalXp / safePartySize),
    lines,
  };
}
