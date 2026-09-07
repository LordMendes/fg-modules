import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  circleContains,
  coneContains,
  coneSectorPath,
  squareContains,
  snapSizeFeet,
} from "./distance";

describe("distance AOE", () => {
  it("20 ft circle covers 4 squares radius from center", () => {
    const c = { x: 5, y: 5 };
    assert.equal(circleContains(c, 20, { x: 5, y: 1 }, 5), true);
    assert.equal(circleContains(c, 20, { x: 5, y: 0.9 }, 5), false);
  });

  it("square containment axis-aligned", () => {
    const c = { x: 5, y: 5 };
    assert.equal(squareContains(c, 10, { x: 5.5, y: 5.5 }, 5), true);
    assert.equal(squareContains(c, 10, { x: 7, y: 5 }, 5), false);
  });

  it("90-degree cone sector along +x", () => {
    const o = { x: 0, y: 0 };
    assert.equal(coneContains(o, 20, 0, { x: 2, y: 0 }, 5), true);
    assert.equal(coneContains(o, 20, 0, { x: 2, y: 3 }, 5), false);
    assert.equal(coneContains(o, 20, 0, { x: -1, y: 0 }, 5), false);
  });

  it("coneSectorPath returns an SVG arc path", () => {
    const d = coneSectorPath({ x: 10, y: 20 }, 100, 0);
    assert.ok(d.startsWith("M 10 20"));
    assert.ok(d.includes(" A "));
    assert.ok(d.endsWith(" Z"));
  });

  it("snapSizeFeet rounds to scale", () => {
    assert.equal(snapSizeFeet(12, 5, true), 10);
    assert.equal(snapSizeFeet(13, 5, true), 15);
    assert.equal(snapSizeFeet(12, 5, false), 12);
  });
});
