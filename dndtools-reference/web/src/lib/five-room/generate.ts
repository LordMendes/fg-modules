import { generateBuiltinNames } from "@/lib/names";
import { createSeededRng, type SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  BATTLEFIELD_DETAILS,
  BYPASS_OPTIONS,
  CLIMAX_PHRASES,
  ENTRANCE_DANGERS,
  GUARDIAN_PHRASES,
  LOCAL_DUNGEON_NAMES,
  pickTaggedPhrase,
  PUZZLE_PHRASES,
  REVELATION_PHRASES,
  SETBACK_PHRASES,
  WRONG_ANSWER_COSTS,
} from "./tables";
import type {
  FiveRoomGenerateExtras,
  FiveRoomInput,
  FiveRoomResult,
  FiveRoomRoleIndex,
  FiveRoomRoom,
} from "./types";
import { FIVE_ROOM_ROLE_LABELS } from "./types";

function roomRng(seed: number, roomIndex: FiveRoomRoleIndex): SeededRng {
  return createSeededRng(seed + roomIndex);
}

function rollDungeonName(nameSeed: number): string {
  const rng = createSeededRng(nameSeed);
  try {
    const generated = generateBuiltinNames(
      { catalogId: "dungeon", count: 1, seed: nameSeed },
      rng,
    );
    if (generated[0]) return generated[0];
  } catch {
    // fallback below
  }
  return rng.pick(LOCAL_DUNGEON_NAMES) ?? LOCAL_DUNGEON_NAMES[0]!;
}

function speakCreature(text: string): string {
  const counted = text.match(/^(\d+)\s*x\s+(.+)$/i);
  if (!counted) return text;
  const count = Number(counted[1]);
  const name = counted[2]!.trim();
  return count === 1 ? `one ${name}` : `${count} ${name}`;
}

function monsterLine(
  extras: FiveRoomGenerateExtras | undefined,
  key: "room1Monster" | "room4Monster",
  guardianNoun: string,
  level: number,
): { text: string; slug?: string } {
  const fromExtras = extras?.[key];
  if (fromExtras?.text.trim()) {
    return fromExtras;
  }
  return {
    text: `${guardianNoun}; choose a CR ${level} creature.`,
  };
}

function buildRoom1(
  input: FiveRoomInput,
  extras: FiveRoomGenerateExtras | undefined,
): FiveRoomRoom {
  const rng = roomRng(input.seed, 1);
  const guardian = pickTaggedPhrase(GUARDIAN_PHRASES, input.motif, rng);
  const danger = rng.pick(ENTRANCE_DANGERS) ?? ENTRANCE_DANGERS[0]!;
  const bypass = rng.pick(BYPASS_OPTIONS) ?? BYPASS_OPTIONS[0]!;
  const monster = monsterLine(extras, "room1Monster", guardian.text, input.level);
  const body = [
    danger,
    `A ${guardian.text} holds the threshold. If you want a listed creature, use ${speakCreature(monster.text)}.`,
    `Fighting through is possible, but not the only way in. ${bypass}`,
  ].join("\n\n");
  return {
    index: 1,
    role: FIVE_ROOM_ROLE_LABELS[0]!,
    body,
    monsterSlug: monster.slug,
  };
}

function buildRoom2(input: FiveRoomInput): FiveRoomRoom {
  const rng = roomRng(input.seed, 2);
  const puzzle = pickTaggedPhrase(PUZZLE_PHRASES, input.motif, rng);
  const wrong = rng.pick(WRONG_ANSWER_COSTS) ?? WRONG_ANSWER_COSTS[0]!;
  const body = [
    `This room is solved by thinking or talking, not by clearing it.`,
    puzzle.text,
    `A wrong answer costs something. ${wrong}`,
  ].join("\n\n");
  return {
    index: 2,
    role: FIVE_ROOM_ROLE_LABELS[1]!,
    body,
  };
}

function buildRoom3(input: FiveRoomInput): FiveRoomRoom {
  const rng = roomRng(input.seed, 3);
  const setback = pickTaggedPhrase(SETBACK_PHRASES, input.motif, rng);
  const body = [
    setback.text,
    "The party cannot safely rest here. Waiting makes the next room harder, or the effect simply does not fade until they push on or undo it.",
  ].join("\n\n");
  return {
    index: 3,
    role: FIVE_ROOM_ROLE_LABELS[2]!,
    body,
  };
}

function buildRoom4(
  input: FiveRoomInput,
  extras: FiveRoomGenerateExtras | undefined,
): FiveRoomRoom {
  const rng = roomRng(input.seed, 4);
  const climax = pickTaggedPhrase(CLIMAX_PHRASES, input.motif, rng);
  const field = pickTaggedPhrase(BATTLEFIELD_DETAILS, input.motif, rng);
  const monster = monsterLine(extras, "room4Monster", climax.text, input.level);
  const body = [
    `The delve comes to a fight against ${speakCreature(monster.text)}. The opposition is ${climax.text}.`,
    `The ground is part of the battle. ${field.text}`,
  ].join("\n\n");
  return {
    index: 4,
    role: FIVE_ROOM_ROLE_LABELS[3]!,
    body,
    monsterSlug: monster.slug,
  };
}

function buildRoom5(
  input: FiveRoomInput,
  extras: FiveRoomGenerateExtras | undefined,
  reframeEntrance: boolean,
): FiveRoomRoom {
  const rng = roomRng(input.seed, 5);
  const revelation = pickTaggedPhrase(REVELATION_PHRASES, input.motif, rng);
  const hoard = extras?.treasureSummary?.trim();
  const treasureLine = hoard
    ? `The hoard is ${hoard.replace(/\.$/, "")}.`
    : `Roll treasure for level ${input.level} using the Dungeon Master's Guide hoard table.`;
  const hook = reframeEntrance
    ? "This reframes why the entrance guardian stood watch."
    : "This reframes why the setback was rigged to punish delay.";
  const body = [treasureLine, `${hook} ${revelation.text}`].join("\n\n");
  return {
    index: 5,
    role: FIVE_ROOM_ROLE_LABELS[4]!,
    body,
  };
}

const ROOM_BUILDERS: Record<
  FiveRoomRoleIndex,
  (
    input: FiveRoomInput,
    extras: FiveRoomGenerateExtras | undefined,
    reframeEntrance: boolean,
  ) => FiveRoomRoom
> = {
  1: (input, extras) => buildRoom1(input, extras),
  2: (input) => buildRoom2(input),
  3: (input) => buildRoom3(input),
  4: (input, extras) => buildRoom4(input, extras),
  5: (input, extras, reframeEntrance) =>
    buildRoom5(input, extras, reframeEntrance),
};

function rollPremise(input: FiveRoomInput): string {
  const motif =
    input.motif === "none"
      ? "a mixed ruin"
      : `${/^[aeiou]/.test(input.motif) ? "an" : "a"} ${input.motif} site`;
  return `Five rooms for a party of ${input.partySize} at about level ${input.level}, set in ${motif}. Entrance, a problem that steel does not solve, a setback, a climax, then treasure and a truth that reframes an earlier room.`;
}

export function generateFiveRoomDungeon(
  input: FiveRoomInput,
  _rng: SeededRng,
  extras?: FiveRoomGenerateExtras,
): FiveRoomResult {
  const reframeEntrance = createSeededRng(input.seed + 99).next() < 0.5;
  const rooms: FiveRoomRoom[] = [];
  for (let i = 1; i <= 5; i++) {
    const index = i as FiveRoomRoleIndex;
    rooms.push(ROOM_BUILDERS[index](input, extras, reframeEntrance));
  }
  return {
    name: rollDungeonName(input.nameSeed),
    motif: input.motif,
    level: input.level,
    partySize: input.partySize,
    seed: input.seed,
    premise: rollPremise(input),
    rooms,
  };
}

export function generateFiveRoomRoom(
  roomIndex: FiveRoomRoleIndex,
  input: FiveRoomInput,
  extras?: FiveRoomGenerateExtras,
): FiveRoomRoom {
  const reframeEntrance = createSeededRng(input.seed + 99).next() < 0.5;
  return ROOM_BUILDERS[roomIndex](input, extras, reframeEntrance);
}

export function rollDungeonNameForSeed(nameSeed: number): string {
  return rollDungeonName(nameSeed);
}
