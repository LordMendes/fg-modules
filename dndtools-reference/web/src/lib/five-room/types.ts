import type { DungeonDraft } from "@/lib/dungeon/types";

export const FIVE_ROOM_MOTIFS = [
  "none",
  "abandoned",
  "aberrant",
  "giant",
  "undead",
  "vermin",
  "aquatic",
  "desert",
  "underdark",
  "arcane",
  "fire",
  "cold",
  "abyssal",
  "infernal",
] as const;

export type FiveRoomMotif = (typeof FIVE_ROOM_MOTIFS)[number];

export const FIVE_ROOM_ROLE_LABELS = [
  "Entrance and guardian",
  "Puzzle or roleplay",
  "Setback",
  "Climax",
  "Reward and revelation",
] as const;

export type FiveRoomRoleIndex = 1 | 2 | 3 | 4 | 5;

export type FiveRoomInput = {
  motif: FiveRoomMotif;
  level: number;
  partySize: number;
  seed: number;
  nameSeed: number;
};

export type FiveRoomMonsterLine = {
  text: string;
  slug?: string;
};

export type FiveRoomRoom = {
  index: FiveRoomRoleIndex;
  role: (typeof FIVE_ROOM_ROLE_LABELS)[number];
  body: string;
  monsterSlug?: string;
};

export type FiveRoomResult = {
  name: string;
  motif: FiveRoomMotif;
  level: number;
  partySize: number;
  seed: number;
  premise: string;
  rooms: FiveRoomRoom[];
  map: DungeonDraft;
};

export type FiveRoomGenerateExtras = {
  room1Monster?: FiveRoomMonsterLine;
  room4Monster?: FiveRoomMonsterLine;
  treasureSummary?: string;
};

export const DEFAULT_FIVE_ROOM_INPUT: Pick<
  FiveRoomInput,
  "motif" | "level" | "partySize" | "seed" | "nameSeed"
> = {
  motif: "none",
  level: 1,
  partySize: 4,
  seed: 1,
  nameSeed: 1,
};
