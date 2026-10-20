import { generateBuiltinNames } from "@/lib/names";
import { createSeededRng, type SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { rollTrap } from "@/lib/random-tables/traps";
import {
  DEFAULT_TREASURE_INPUT,
  generateTreasure,
  type TreasureResult,
} from "@/lib/treasure";
import { LOCAL_DUNGEON_NAMES, pickDungeonCreature, pickDungeonFeature } from "./tables";
import type {
  DungeonInput,
  DungeonMotif,
  PlacedRoom,
  RoomKeyEntry,
  RoomStockKind,
} from "./types";

function roomSizeLine(room: PlacedRoom): string {
  const widthFt = room.w * 10;
  const heightFt = room.h * 10;
  if (room.shape === "round") {
    const across = Math.min(widthFt, heightFt);
    return `The chamber is a round room about ${across} feet across.`;
  }
  if (room.shape === "pentagon") {
    const across = Math.min(widthFt, heightFt);
    return `The chamber is a five-sided room about ${across} feet across.`;
  }
  return `The chamber is about ${widthFt} feet by ${heightFt} feet.`;
}

function rollTrapLine(level: number, rng: SeededRng): string {
  const trap = rollTrap(level, rng);
  const spell = trap.spellEffect ? ` ${trap.spellEffect}.` : "";
  return `${trap.name}. Search DC ${trap.searchDc}, Disable Device DC ${trap.disableDeviceDc}, ${trap.trigger}, ${trap.attackOrSave}, ${trap.damageExpression} (example ${trap.exampleDamage}). ${trap.bypass}.${spell}`;
}

function formatTreasureBrief(level: number, result: TreasureResult): string {
  const hoard = result.hoards[0];
  if (!hoard) return `Treasure for level ${level}.`;
  const parts = [hoard.coins.display];
  if (hoard.items.length > 0) {
    parts.push(`${hoard.items.length} magic item${hoard.items.length === 1 ? "" : "s"}`);
  }
  parts.push(`about ${Math.round(hoard.totalGp)} gp total`);
  return parts.join("; ");
}

function rollTreasure(level: number, rng: SeededRng): string {
  try {
    const input = {
      ...DEFAULT_TREASURE_INPUT,
      rows: [
        {
          count: 1,
          level,
          coins: "standard" as const,
          valuables: "standard" as const,
          items: "standard" as const,
        },
      ],
      combine: true,
    };
    return formatTreasureBrief(level, generateTreasure(input, rng));
  } catch {
    return `Treasure for level ${level}.`;
  }
}

function rollMonster(
  level: number,
  motif: DungeonMotif,
  rng: SeededRng,
  climax: boolean,
): string {
  return pickDungeonCreature(motif, level, rng, climax);
}

function pickStockKind(
  roomNumber: number,
  roomCount: number,
  rng: SeededRng,
): RoomStockKind {
  if (roomNumber === 1) {
    return rng.next() < 0.5 ? "monster" : "trap";
  }
  if (roomNumber === roomCount) {
    return rng.next() < 0.5 ? "treasure" : "monster";
  }
  const roll = rng.next();
  if (roll < 0.4) return "monster";
  if (roll < 0.6) return "trap";
  if (roll < 0.75) return "treasure";
  if (roll < 0.9) return "feature";
  return "empty";
}

function kindLabel(kind: RoomStockKind): string {
  switch (kind) {
    case "monster":
      return "Monster";
    case "trap":
      return "Trap";
    case "treasure":
      return "Treasure";
    case "feature":
      return "Feature";
    default:
      return "Empty";
  }
}

export function rollDungeonName(seed: number, provided: string): string {
  const trimmed = provided.trim();
  if (trimmed) return trimmed;
  const rng = createSeededRng(seed);
  try {
    const names = generateBuiltinNames(
      { catalogId: "dungeon", count: 1, seed },
      rng,
    );
    if (names[0]) return names[0];
  } catch {
    // local list below
  }
  return rng.pick(LOCAL_DUNGEON_NAMES) ?? LOCAL_DUNGEON_NAMES[0]!;
}

export function stockRooms(
  input: DungeonInput,
  rooms: PlacedRoom[],
  doorNotesByRoom: Map<number, string[]>,
): RoomKeyEntry[] {
  const sorted = [...rooms].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  return sorted.map((room, index) => {
    const roomNumber = index + 1;
    const rng = createSeededRng(input.seed + roomNumber * 9973);
    const kind = pickStockKind(roomNumber, sorted.length, rng);
    const dressing = pickDungeonFeature(input.motif, rng);
    const size = roomSizeLine(room);
    let contents = "Nothing here demands an immediate fight.";

    switch (kind) {
      case "monster":
        contents = rollMonster(
          input.level,
          input.motif,
          rng,
          roomNumber === sorted.length,
        );
        break;
      case "trap":
        contents = rollTrapLine(input.level, rng);
        break;
      case "treasure":
        contents = `Treasure: ${rollTreasure(input.level, rng)}.`;
        break;
      case "feature":
        contents = "The room's main interest is the feature itself.";
        break;
      default:
        contents = "The room is empty of creatures and treasure.";
        break;
    }

    return {
      number: roomNumber,
      kind,
      summary: kindLabel(kind),
      detail: `${size} ${dressing} ${contents}`,
      doors: doorNotesByRoom.get(room.index) ?? [],
      widthFt: room.w * 10,
      heightFt: room.h * 10,
    };
  });
}
