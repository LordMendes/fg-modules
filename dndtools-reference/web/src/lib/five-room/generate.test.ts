import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allRoomsReachable } from "@/lib/dungeon/generate";
import { buildDungeonSvg } from "@/lib/dungeon/render-svg";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  generateFiveRoomDungeon,
  generateFiveRoomRoom,
} from "./generate";
import { GUARDIAN_PHRASES, taggedPool } from "./tables";
import { FIVE_ROOM_ROLE_LABELS } from "./types";

describe("five room dungeon generator", () => {
  it("returns five rooms in fixed role order", () => {
    const result = generateFiveRoomDungeon(
      {
        motif: "undead",
        level: 5,
        partySize: 4,
        seed: 100,
        nameSeed: 7,
      },
      createSeededRng(100),
    );
    assert.equal(result.rooms.length, 5);
    for (let i = 0; i < 5; i++) {
      assert.equal(result.rooms[i]!.role, FIVE_ROOM_ROLE_LABELS[i]);
      assert.equal(result.rooms[i]!.index, i + 1);
    }
  });

  it("undead motif never picks fire-only guardian phrases", () => {
    const fireTexts = new Set(GUARDIAN_PHRASES.fire);
    for (let seed = 1; seed <= 300; seed++) {
      const result = generateFiveRoomDungeon(
        {
          motif: "undead",
          level: 3,
          partySize: 4,
          seed,
          nameSeed: 1,
        },
        createSeededRng(seed),
      );
      const room1 = result.rooms[0]!.body;
      for (const firePhrase of fireTexts) {
        assert.ok(
          !room1.includes(firePhrase),
          `seed ${seed} included fire phrase ${firePhrase}`,
        );
      }
      const undeadPool = taggedPool(GUARDIAN_PHRASES, "undead");
      const undeadOnly = undeadPool.every((p) => p.motif === "undead");
      assert.ok(undeadOnly);
    }
  });

  it("is stable for the same seed", () => {
    const input = {
      motif: "arcane" as const,
      level: 8,
      partySize: 6,
      seed: 4242,
      nameSeed: 12,
    };
    const a = generateFiveRoomDungeon(input, createSeededRng(4242));
    const b = generateFiveRoomDungeon(input, createSeededRng(4242));
    assert.deepEqual(
      a.rooms.map((room) => room.body),
      b.rooms.map((room) => room.body),
    );
  });

  it("rerolling room 3 does not change room 1 for the same base seed", () => {
    const base = {
      motif: "giant" as const,
      level: 4,
      partySize: 4,
      seed: 50,
      nameSeed: 1,
    };
    const full = generateFiveRoomDungeon(base, createSeededRng(50));
    const room1Only = generateFiveRoomRoom(1, base);
    const room3First = generateFiveRoomRoom(3, base);
    const room3Reroll = generateFiveRoomRoom(3, {
      ...base,
      seed: base.seed + 3,
    });
    const room1AfterRoom3Reroll = generateFiveRoomRoom(1, base);

    assert.equal(full.rooms[0]!.body, room1Only.body);
    assert.equal(room1Only.body, room1AfterRoom3Reroll.body);
    assert.notEqual(room3First.body, room3Reroll.body);
    assert.notEqual(
      createSeededRng(base.seed + 1).pickInt(1, 1000),
      createSeededRng(base.seed + 3).pickInt(1, 1000),
    );
  });

  it("draws a connected five-room map from the seed", () => {
    for (let seed = 1; seed <= 24; seed++) {
      const result = generateFiveRoomDungeon(
        {
          motif: "none",
          level: 1,
          partySize: 4,
          seed,
          nameSeed: seed,
        },
        createSeededRng(seed),
      );
      assert.equal(result.map.rooms.length, 5);
      assert.deepEqual(
        result.map.rooms.map((room) => room.index).sort((a, b) => a - b),
        [0, 1, 2, 3, 4],
      );
      assert.equal(allRoomsReachable(result.map), true);
      const stairs = result.map.cells
        .flat()
        .filter((cell) => cell.type === "stairs-up" || cell.type === "stairs-down");
      assert.ok(stairs.length >= 1);
    }

    const input = {
      motif: "cold" as const,
      level: 2,
      partySize: 4,
      seed: 18,
      nameSeed: 4,
    };
    const first = generateFiveRoomDungeon(input, createSeededRng(1));
    const second = generateFiveRoomDungeon(input, createSeededRng(2));
    const other = generateFiveRoomDungeon(
      { ...input, seed: 19 },
      createSeededRng(3),
    );
    assert.deepEqual(first.map.rooms, second.map.rooms);
    assert.notDeepEqual(first.map.rooms, other.map.rooms);
    const svg = buildDungeonSvg(first.map, { legend: true });
    assert.match(svg, /dungeon-stone-hatch/);
    assert.match(svg, /url\(#dungeon-stone-hatch\)/);
    assert.match(svg, />Door</);
    assert.match(svg, />Archway</);
    assert.match(svg, />Stairs up</);
    assert.match(svg, />Stairs down</);
    for (const number of [1, 2, 3, 4, 5]) {
      assert.match(svg, new RegExp(`>${number}</text>`));
    }
  });
});
