import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canWalkTo,
  segmentsFromOccluders,
  visibilityPolygon,
} from "./los";
import type { MapOccluderView } from "./types";

function boxRoom(): MapOccluderView[] {
  // Square room walls: (0,0)-(10,0)-(10,10)-(0,10)-(0,0) with door gap on bottom
  return [
    {
      id: "w1",
      kind: "wall",
      state: "closed",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    },
    {
      id: "w2",
      kind: "wall",
      state: "closed",
      points: [
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
    },
    {
      id: "w3",
      kind: "wall",
      state: "closed",
      points: [
        { x: 10, y: 10 },
        { x: 6, y: 10 },
      ],
    },
    {
      id: "door",
      kind: "door",
      state: "closed",
      points: [
        { x: 6, y: 10 },
        { x: 4, y: 10 },
      ],
    },
    {
      id: "w4",
      kind: "wall",
      state: "closed",
      points: [
        { x: 4, y: 10 },
        { x: 0, y: 10 },
      ],
    },
    {
      id: "w5",
      kind: "wall",
      state: "closed",
      points: [
        { x: 0, y: 10 },
        { x: 0, y: 0 },
      ],
    },
  ];
}

describe("los", () => {
  it("closed door blocks walk through", () => {
    const occluders = boxRoom();
    assert.equal(
      canWalkTo({ x: 5, y: 9 }, { x: 5, y: 11 }, occluders),
      false,
    );
  });

  it("open door allows walk through", () => {
    const occluders = boxRoom().map((o) =>
      o.id === "door" ? { ...o, state: "open" as const } : o,
    );
    assert.equal(
      canWalkTo({ x: 5, y: 9 }, { x: 5, y: 11 }, occluders),
      true,
    );
  });

  it("visibility polygon returns points", () => {
    const segs = segmentsFromOccluders(boxRoom());
    const poly = visibilityPolygon({ x: 5, y: 5 }, segs, 12, 72);
    assert.equal(poly.length, 72);
  });

  it("diagonal wall blocks", () => {
    const wall: MapOccluderView = {
      id: "d",
      kind: "wall",
      state: "closed",
      points: [
        { x: 0, y: 5 },
        { x: 5, y: 0 },
      ],
    };
    assert.equal(canWalkTo({ x: 0, y: 0 }, { x: 5, y: 5 }, [wall]), false);
  });

  it("degenerate segment does not crash", () => {
    const bad: MapOccluderView = {
      id: "b",
      kind: "wall",
      state: "closed",
      points: [
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ],
    };
    assert.equal(canWalkTo({ x: 0, y: 0 }, { x: 2, y: 2 }, [bad]), true);
  });
});
