import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chebyshevSquares,
  distanceFeet,
  euclideanFeet,
  gridToPixels,
  pixelsToGrid,
  snapTokenTopLeft,
  snapToGrid,
  threeFiveDiagonalFeet,
} from "./grid";

describe("grid", () => {
  const grid = { gridSizePx: 70, gridOffsetX: 10, gridOffsetY: 20 };

  it("round-trips pixels <-> grid", () => {
    const g = pixelsToGrid(150, 160, grid);
    const p = gridToPixels(g.x, g.y, grid);
    assert.ok(Math.abs(p.x - 150) < 1e-9);
    assert.ok(Math.abs(p.y - 160) < 1e-9);
  });

  it("snaps to center for token top-left", () => {
    const snapped = snapTokenTopLeft(0.2, 0.8, 1, 1, "center");
    assert.equal(snapped.x, 0);
    assert.equal(snapped.y, 1);
  });

  it("snap corner rounds", () => {
    const snapped = snapToGrid(1.4, 2.6, "corner");
    assert.equal(snapped.x, 1);
    assert.equal(snapped.y, 3);
  });

  it("snap off leaves position", () => {
    const snapped = snapToGrid(1.4, 2.6, "off");
    assert.equal(snapped.x, 1.4);
    assert.equal(snapped.y, 2.6);
  });

  it("5-10-5 diagonal: one diagonal is 5 ft", () => {
    assert.equal(threeFiveDiagonalFeet(1, 1, 5), 5);
  });

  it("5-10-5 diagonal: two diagonals are 15 ft", () => {
    assert.equal(threeFiveDiagonalFeet(2, 2, 5), 15);
  });

  it("5-5-5 uses chebyshev", () => {
    assert.equal(chebyshevSquares(2, 2), 2);
    assert.equal(distanceFeet({ x: 0, y: 0 }, { x: 2, y: 2 }, "555", 5), 10);
  });

  it("euclidean on 1-square diagonal", () => {
    const d = euclideanFeet(1, 1, 5);
    assert.ok(Math.abs(d - 5 * Math.SQRT2) < 1e-9);
  });

  it("respects non-5 scaleFeet", () => {
    assert.equal(threeFiveDiagonalFeet(1, 0, 10), 10);
    assert.equal(distanceFeet({ x: 0, y: 0 }, { x: 1, y: 0 }, "5105", 10), 10);
  });
});
