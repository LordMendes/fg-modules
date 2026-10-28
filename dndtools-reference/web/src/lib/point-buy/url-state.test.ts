import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_POINT_BUY_URL_STATE,
  buildPointBuySearchParams,
  parsePointBuySearchParams,
  serializePointBuyUrlState,
} from "./url-state";

describe("point-buy url-state", () => {
  it("returns defaults for an empty query string", () => {
    assert.deepEqual(parsePointBuySearchParams({}), DEFAULT_POINT_BUY_URL_STATE);
  });

  it("always serializes points, min, and max including defaults", () => {
    assert.equal(
      serializePointBuyUrlState(DEFAULT_POINT_BUY_URL_STATE),
      "points=28&min=8&max=22",
    );
  });

  it("round-trips a customized preset", () => {
    const state = { points: 32, min: 8, max: 18 };
    const params = buildPointBuySearchParams(state);
    const parsed = parsePointBuySearchParams(
      Object.fromEntries(params.entries()),
    );
    assert.deepEqual(parsed, state);
    assert.equal(params.toString(), "points=32&min=8&max=18");
  });

  it("clamps inverted and out-of-bounds min/max", () => {
    const parsed = parsePointBuySearchParams({
      points: "25",
      min: "20",
      max: "10",
    });
    assert.equal(parsed.points, 25);
    assert.equal(parsed.min, 20);
    assert.equal(parsed.max, 20);
  });

  it("falls back on garbage and clamps budget", () => {
    const parsed = parsePointBuySearchParams({
      points: "nope",
      min: "abc",
      max: "999",
    });
    assert.equal(parsed.points, DEFAULT_POINT_BUY_URL_STATE.points);
    assert.equal(parsed.min, DEFAULT_POINT_BUY_URL_STATE.min);
    assert.equal(parsed.max, 45); // hard max clamp when raw max is 999

    const huge = parsePointBuySearchParams({ points: "5000" });
    assert.equal(huge.points, 999);
  });
});
