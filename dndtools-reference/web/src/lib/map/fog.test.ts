import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCenterVisibleThroughFog,
  playerFogMaskPath,
  simplifyPolygon,
} from "./fog";

describe("fog", () => {
  it("simplifyPolygon caps point count", () => {
    const points = Array.from({ length: 100 }, (_, i) => ({
      x: i,
      y: i % 10,
    }));
    const out = simplifyPolygon(points, 64);
    assert.equal(out.length, 64);
  });

  it("empty fogEnabled treats center as visible", () => {
    assert.equal(
      isCenterVisibleThroughFog({ x: 1, y: 1 }, false, []),
      true,
    );
  });

  it("playerFogMaskPath includes full rect and reveal holes", () => {
    const path = playerFogMaskPath(10, 10, [
      {
        id: "r",
        kind: "reveal",
        points: [
          { x: 1, y: 1 },
          { x: 3, y: 1 },
          { x: 3, y: 3 },
          { x: 1, y: 3 },
        ],
      },
    ]);
    assert.match(path, /^M 0 0/);
    assert.match(path, /M 1 1/);
  });
});
