import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
});
