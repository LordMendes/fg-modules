import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tokensInsideShape, circleContains, coneContains, squareContains } from "./distance";
import type { MapTokenCenter } from "./distance";

describe("circleContains", () => {
  it("includes token at center", () => {
    assert.equal(
      circleContains({ x: 5, y: 5 }, 20, { x: 5, y: 5 }, 5),
      true,
    );
  });

  it("includes token at edge (exactly radius away)", () => {
    // 20 feet radius, 5 feet per square
    // Token at (9, 5) is 4 squares = 20 feet away
    assert.equal(
      circleContains({ x: 5, y: 5 }, 20, { x: 9, y: 5 }, 5),
      true,
    );
  });

  it("excludes token outside radius", () => {
    // Token at (10, 5) is 5 squares = 25 feet away, outside 20-ft radius
    assert.equal(
      circleContains({ x: 5, y: 5 }, 20, { x: 10, y: 5 }, 5),
      false,
    );
  });

  it("includes token at diagonal edge", () => {
    // Pythagorean: √(3² + 4²) = 5 squares = 25 feet
    // Just outside 20-ft radius
    assert.equal(
      circleContains({ x: 5, y: 5 }, 20, { x: 8, y: 9 }, 5),
      false,
    );
    // √(2² + 2²) ≈ 2.83 squares ≈ 14.14 feet, inside 20-ft radius
    assert.equal(
      circleContains({ x: 5, y: 5 }, 20, { x: 7, y: 7 }, 5),
      true,
    );
  });
});

describe("coneContains - 3.5E 90-degree cone", () => {
  it("includes token at origin", () => {
    assert.equal(
      coneContains({ x: 5, y: 5 }, 30, 0, { x: 5, y: 5 }, 5),
      true,
    );
  });

  it("includes token directly ahead (rotation 0 = +x)", () => {
    // 30 feet = 6 squares, token at (8, 5) is 3 squares = 15 feet ahead
    assert.equal(
      coneContains({ x: 5, y: 5 }, 30, 0, { x: 8, y: 5 }, 5),
      true,
    );
  });

  it("includes token at 45-degree edge (90-degree cone)", () => {
    // Cone at rotation 0 spans -45° to +45° from +x axis
    // Token at (8, 8) is 45° up from origin
    assert.equal(
      coneContains({ x: 5, y: 5 }, 30, 0, { x: 8, y: 8 }, 5),
      true,
    );
  });

  it("excludes token outside 45-degree edge", () => {
    // Token at (6, 9) is roughly 63° from +x, outside 90° cone
    assert.equal(
      coneContains({ x: 5, y: 5 }, 30, 0, { x: 6, y: 9 }, 5),
      false,
    );
  });

  it("excludes token beyond range", () => {
    // 30 feet = 6 squares, token at (12, 5) is 7 squares away
    assert.equal(
      coneContains({ x: 5, y: 5 }, 30, 0, { x: 12, y: 5 }, 5),
      false,
    );
  });

  it("handles rotated cone (rotation 90 = +y/down)", () => {
    // Cone pointing down (+y), token directly below
    assert.equal(
      coneContains({ x: 5, y: 5 }, 30, 90, { x: 5, y: 9 }, 5),
      true,
    );
    // Token to the right (should be outside)
    assert.equal(
      coneContains({ x: 5, y: 5 }, 30, 90, { x: 9, y: 5 }, 5),
      false,
    );
  });

  it("handles rotated cone (rotation 180 = -x/left)", () => {
    // Cone pointing left, token directly left
    assert.equal(
      coneContains({ x: 5, y: 5 }, 30, 180, { x: 2, y: 5 }, 5),
      true,
    );
  });
});

describe("squareContains", () => {
  it("includes token at center", () => {
    assert.equal(
      squareContains({ x: 5, y: 5 }, 20, { x: 5, y: 5 }, 5, 0),
      true,
    );
  });

  it("includes token at corner (10-ft radius = 20-ft width square)", () => {
    // Square width 20 feet = ±10 feet from center = ±2 squares
    // Token at (7, 7) is 2 squares from center, at corner
    assert.equal(
      squareContains({ x: 5, y: 5 }, 20, { x: 7, y: 7 }, 5, 0),
      true,
    );
  });

  it("excludes token outside square", () => {
    // Token at (8, 5) is 3 squares = 15 feet from center, outside 10-ft radius
    assert.equal(
      squareContains({ x: 5, y: 5 }, 20, { x: 8, y: 5 }, 5, 0),
      false,
    );
  });

  it("handles rotated square (45 degrees)", () => {
    // Rotated square should still contain points within rotated bounds
    assert.equal(
      squareContains({ x: 5, y: 5 }, 20, { x: 6, y: 6 }, 5, 45),
      true,
    );
  });
});

describe("tokensInsideShape - multi-target detection", () => {
  const tokens: MapTokenCenter[] = [
    { id: "t1", x: 5, y: 5 },   // center
    { id: "t2", x: 8, y: 5 },   // 3 squares right (15 ft)
    { id: "t3", x: 5, y: 8 },   // 3 squares down (15 ft)
    { id: "t4", x: 10, y: 5 },  // 5 squares right (25 ft)
    { id: "t5", x: 7, y: 7 },   // diagonal √8 ≈ 14 ft
  ];

  it("20-ft radius circle includes tokens within range", () => {
    const inside = tokensInsideShape(
      { kind: "circle", center: { x: 5, y: 5 }, radiusFeet: 20 },
      tokens,
      5,
    );
    assert.deepEqual(inside.sort(), ["t1", "t2", "t3", "t5"].sort());
  });

  it("30-ft cone at rotation 0 includes tokens ahead", () => {
    const inside = tokensInsideShape(
      { kind: "cone", origin: { x: 5, y: 5 }, sizeFeet: 30, rotationDeg: 0 },
      tokens,
      5,
    );
    // Should include t1 (origin), t2 (ahead), t5 (diagonal 45°)
    // Should exclude t3 (90° down), t4 (too far)
    assert.ok(inside.includes("t1"));
    assert.ok(inside.includes("t2"));
    assert.ok(inside.includes("t5"));
    assert.ok(!inside.includes("t3"));
  });

  it("20-ft square includes tokens within bounds", () => {
    const inside = tokensInsideShape(
      { kind: "square", center: { x: 5, y: 5 }, widthFeet: 20, rotationDeg: 0 },
      tokens,
      5,
    );
    // 20-ft width = ±10 ft = ±2 squares from center
    // Should include t1, t5; exclude t2, t3, t4
    assert.ok(inside.includes("t1"));
    assert.ok(inside.includes("t5"));
    assert.ok(!inside.includes("t2"));
    assert.ok(!inside.includes("t4"));
  });

  it("empty shape returns no tokens", () => {
    const inside = tokensInsideShape(
      { kind: "circle", center: { x: 100, y: 100 }, radiusFeet: 5 },
      tokens,
      5,
    );
    assert.equal(inside.length, 0);
  });
});
