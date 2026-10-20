"use server";

import { prisma } from "@/lib/prisma";
import type { MonsterCandidate } from "@/lib/encounter-generator";

export async function loadEncounterMonsterCandidates(): Promise<MonsterCandidate[]> {
  const rows = await prisma.monster.findMany({
    where: { challengeRatingNum: { not: null } },
    select: {
      slug: true,
      name: true,
      challengeRating: true,
      challengeRatingNum: true,
      environment: true,
      subtypes: true,
      creatureType: true,
      treasure: true,
      size: true,
    },
  });

  return rows
    .filter((row) => row.challengeRatingNum != null && row.challengeRating)
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      cr: row.challengeRating!,
      crNum: row.challengeRatingNum!,
      environment: row.environment,
      subtypes: row.subtypes,
      creatureType: row.creatureType,
      treasure: row.treasure,
      size: row.size,
    }));
}
