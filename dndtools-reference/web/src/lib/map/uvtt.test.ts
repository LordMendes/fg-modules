import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseUvtt } from "./uvtt";

const FIXTURE = JSON.stringify({
  format: 0.3,
  resolution: {
    map_origin: { x: 0, y: 0 },
    map_size: { x: 10, y: 10 },
    pixels_per_grid: 70,
  },
  line_of_sight: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
    ],
  ],
  portals: [
    {
      bounds: [
        [4, 10],
        [6, 10],
      ],
      closed: true,
    },
  ],
  lights: [{ position: { x: 5, y: 5 }, range: 4, color: "#ffaa00" }],
  image:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
});

describe("uvtt", () => {
  it("parses grid, walls, portals, lights", () => {
    const result = parseUvtt(FIXTURE);
    assert.equal(result.gridSizePx, 70);
    assert.ok(result.occluders.some((o) => o.kind === "wall"));
    assert.ok(result.occluders.some((o) => o.kind === "door"));
    assert.equal(result.lights.length, 1);
    assert.ok(result.imageBase64.length > 10);
  });

  it("rejects non-JSON", () => {
    assert.throws(() => parseUvtt("not-json"), /not valid UVTT/);
  });

  it("rejects missing image", () => {
    assert.throws(
      () =>
        parseUvtt(
          JSON.stringify({
            resolution: { pixels_per_grid: 70 },
          }),
        ),
      /missing an embedded image/,
    );
  });
});
