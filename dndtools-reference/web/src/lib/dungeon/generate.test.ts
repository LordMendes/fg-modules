import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  allRoomsReachable,
  buildMask,
  countCorridorDeadends,
  generateDungeon,
  roomInsideMask,
} from "./generate";
import type { DungeonInput } from "./types";
import { DEFAULT_DUNGEON_INPUT } from "./types";

function baseInput(overrides: Partial<DungeonInput> = {}): DungeonInput {
  return { ...DEFAULT_DUNGEON_INPUT, ...overrides };
}

describe("generateDungeon", () => {
  it("medium rectangle seed 1 has at least 4 rooms inside the mask", () => {
    const input = baseInput({
      seed: 1,
      size: "medium",
      layout: "rectangle",
    });
    const rng = createSeededRng(input.seed);
    const draft = generateDungeon(input, rng);
    const mask = buildMask(input.layout, draft.cols, draft.rows, createSeededRng(1));

    assert.ok(draft.rooms.length >= 4);
    for (const room of draft.rooms) {
      assert.ok(roomInsideMask(room, mask));
    }
  });

  it("every room is reachable from room 1 via floors and doors", () => {
    const input = baseInput({ seed: 1, size: "medium", layout: "rectangle" });
    const draft = generateDungeon(input, createSeededRng(input.seed));
    assert.ok(allRoomsReachable(draft));
  });

  it("deadends all removes corridor stubs with a single neighbor", () => {
    const input = baseInput({
      seed: 42,
      size: "small",
      layout: "rectangle",
      deadends: "all",
      egress: "none",
      polymorph: "none",
    });
    const draft = generateDungeon(input, createSeededRng(input.seed));
    assert.equal(countCorridorDeadends(draft.cells), 0);
    assert.ok(allRoomsReachable(draft));
  });

  it("cavernous layout returns floor without throwing", () => {
    const input = baseInput({
      seed: 7,
      size: "small",
      layout: "cavernous",
    });
    const draft = generateDungeon(input, createSeededRng(input.seed));
    let floors = 0;
    for (const row of draft.cells) {
      for (const cell of row) {
        if (cell.type === "floor" || cell.type.startsWith("stairs")) floors++;
      }
    }
    assert.ok(floors > 0);
  });

  it("same input yields same room count and top-left coordinates", () => {
    const input = baseInput({ seed: 99, size: "medium", layout: "rectangle" });
    const a = generateDungeon(input, createSeededRng(input.seed));
    const b = generateDungeon(input, createSeededRng(input.seed));
    assert.equal(a.rooms.length, b.rooms.length);
    const sortedA = [...a.rooms].sort((x, y) => x.index - y.index);
    const sortedB = [...b.rooms].sort((x, y) => x.index - y.index);
    for (let i = 0; i < sortedA.length; i++) {
      assert.equal(sortedA[i]!.x, sortedB[i]!.x);
      assert.equal(sortedA[i]!.y, sortedB[i]!.y);
      assert.equal(sortedA[i]!.shape, sortedB[i]!.shape);
    }
  });

  it("polymorph none keeps every room rectangular", () => {
    const input = baseInput({
      seed: 3,
      size: "medium",
      layout: "rectangle",
      roomSize: "large",
      polymorph: "none",
    });
    const draft = generateDungeon(input, createSeededRng(input.seed));
    for (const room of draft.rooms) {
      assert.equal(room.shape, "rectangle");
    }
  });

  it("polymorph many carves round or pentagon rooms", () => {
    const input = baseInput({
      seed: 1,
      size: "medium",
      layout: "rectangle",
      roomSize: "large",
      polymorph: "many",
    });
    const draft = generateDungeon(input, createSeededRng(input.seed));
    const shaped = draft.rooms.filter(
      (room) => room.shape === "round" || room.shape === "pentagon",
    );
    assert.ok(shaped.length >= 3);
    assert.ok(shaped.some((room) => room.shape === "round"));
    assert.ok(shaped.some((room) => room.shape === "pentagon"));
    assert.ok(allRoomsReachable(draft));

    for (const room of shaped) {
      let cut = 0;
      for (let dy = 0; dy < room.h; dy++) {
        for (let dx = 0; dx < room.w; dx++) {
          const cell = draft.cells[room.y + dy]![room.x + dx]!;
          if (cell.roomIndex !== room.index) cut += 1;
        }
      }
      assert.ok(cut >= 4);
    }
  });

  it("polymorph yes on medium seed 16 carves several visible rooms", () => {
    const input = baseInput({
      seed: 16,
      size: "medium",
      layout: "rectangle",
      roomSize: "medium",
      polymorph: "yes",
    });
    const draft = generateDungeon(input, createSeededRng(input.seed));
    const shaped = draft.rooms.filter(
      (room) => room.shape === "round" || room.shape === "pentagon",
    );
    assert.ok(shaped.length >= 3);
    assert.ok(shaped.some((room) => room.shape === "round"));
    assert.ok(shaped.some((room) => room.shape === "pentagon"));
    assert.ok(allRoomsReachable(draft));

    for (const room of shaped) {
      let joins = 0;
      for (let y = room.y - 1; y <= room.y + room.h; y++) {
        for (let x = room.x - 1; x <= room.x + room.w; x++) {
          const cell = draft.cells[y]?.[x];
          if (!cell) continue;
          const connector =
            cell.type === "door" ||
            (cell.type === "floor" && cell.roomIndex === undefined);
          if (!connector) continue;
          const touchesRoom = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([dx, dy]) => {
            const n = draft.cells[y + dy]?.[x + dx];
            return n?.roomIndex === room.index;
          });
          if (touchesRoom) joins += 1;
        }
      }
      assert.ok(joins >= 1, `shaped room ${room.index} should meet a corridor`);
    }
  });
});
