"use server";

import { loadEncounterMonsterCandidates } from "@/actions/encounter-generator";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  generateFiveRoomDungeon,
  generateFiveRoomRoom,
  rollDungeonNameForSeed,
  type FiveRoomInput,
  type FiveRoomResult,
  type FiveRoomRoleIndex,
} from "@/lib/five-room";
import { generateEncounter } from "@/lib/encounter-generator";
import {
  DEFAULT_TREASURE_INPUT,
  generateTreasure,
} from "@/lib/treasure";
import type { FiveRoomGenerateExtras } from "@/lib/five-room/types";

export type RollFiveRoomInput = FiveRoomInput & {
  rerollRoom?: FiveRoomRoleIndex;
  roomSeedBump?: number;
};

function motifToEncounter(input: FiveRoomInput) {
  let terrain: "underground" | "aquatic" | "desert" = "underground";
  let plane: "prime" | "abyssal" | "infernal" = "prime";
  if (input.motif === "aquatic") terrain = "aquatic";
  if (input.motif === "desert") terrain = "desert";
  if (input.motif === "abyssal") plane = "abyssal";
  if (input.motif === "infernal") plane = "infernal";
  return {
    level: input.level,
    partyLevel: input.level,
    partySize: input.partySize,
    climate: "temperate" as const,
    terrain,
    plane,
  };
}

function summarizeTreasure(level: number, seed: number): string | undefined {
  try {
    const rng = createSeededRng(seed + 5);
    const result = generateTreasure(
      {
        ...DEFAULT_TREASURE_INPUT,
        rows: [
          {
            count: 1,
            level,
            coins: "standard",
            valuables: "standard",
            items: "standard",
          },
        ],
      },
      rng,
    );
    const hoard = result.hoards[0];
    if (!hoard) return undefined;
    const entries: string[] = [];
    if (hoard.coins.display) entries.push(hoard.coins.display);
    for (const gem of hoard.gems.slice(0, 2)) {
      entries.push(`${gem.name} (${gem.valueDisplay})`);
    }
    for (const item of hoard.items.slice(0, 3 - entries.length)) {
      entries.push(item.label);
    }
    if (entries.length === 0) return undefined;
    return entries.slice(0, 3).join("; ");
  } catch {
    return undefined;
  }
}

async function buildExtras(input: FiveRoomInput): Promise<FiveRoomGenerateExtras> {
  const extras: FiveRoomGenerateExtras = {
    treasureSummary: summarizeTreasure(input.level, input.seed),
  };

  try {
    const candidates = await loadEncounterMonsterCandidates();
    if (candidates.length === 0) return extras;

    const encounterBase = motifToEncounter(input);
    const enc1 = generateEncounter(
      candidates,
      encounterBase,
      createSeededRng(input.seed + 1),
    );
    const enc4 = generateEncounter(
      candidates,
      encounterBase,
      createSeededRng(input.seed + 4),
    );

    if (!enc1.emptyPool && enc1.groups[0]) {
      extras.room1Monster = {
        text: enc1.description,
        slug: enc1.groups[0].slug,
      };
    }
    if (!enc4.emptyPool && enc4.groups[0]) {
      extras.room4Monster = {
        text: enc4.description,
        slug: enc4.groups[0].slug,
      };
    }
  } catch {
    // encounter integration optional
  }

  return extras;
}

function withRoomSeedBump(input: FiveRoomInput, roomIndex: FiveRoomRoleIndex, bump: number): FiveRoomInput {
  if (bump <= 0) return input;
  return { ...input, seed: input.seed + roomIndex * bump };
}

export async function rollFiveRoomDungeon(
  input: RollFiveRoomInput,
): Promise<FiveRoomResult> {
  const extras = await buildExtras(input);
  const rng = createSeededRng(input.seed);

  if (input.rerollRoom != null) {
    const roomInput = withRoomSeedBump(
      input,
      input.rerollRoom,
      input.roomSeedBump ?? 1,
    );
    const room = generateFiveRoomRoom(input.rerollRoom, roomInput, extras);
    const base = generateFiveRoomDungeon(input, rng, extras);
    const rooms = base.rooms.map((existing) =>
      existing.index === input.rerollRoom ? room : existing,
    );
    return {
      ...base,
      name: rollDungeonNameForSeed(input.nameSeed),
      rooms,
    };
  }

  return generateFiveRoomDungeon(input, rng, extras);
}

export async function rerollFiveRoomName(nameSeed: number): Promise<string> {
  return rollDungeonNameForSeed(nameSeed);
}
