import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterMapViewForViewer,
  filterOccluderForViewer,
  isPointRevealed,
  isTokenVisibleToViewer,
  pointInPolygon,
} from "./permissions";
import type { CampaignMapView, MapTokenView } from "./types";

function baseToken(over: Partial<MapTokenView> = {}): MapTokenView {
  return {
    id: "t1",
    kind: "npc",
    pcPlanId: null,
    name: "Goblin",
    imageUrl: null,
    x: 1,
    y: 1,
    width: 1,
    height: 1,
    rotation: 0,
    layer: "token",
    visibility: "always",
    ownerUserId: null,
    visionRange: null,
    emitsLight: false,
    lightBright: 0,
    lightDim: 0,
    seq: 0,
    ...over,
  };
}

function baseMap(over: Partial<CampaignMapView> = {}): CampaignMapView {
  return {
    id: "m1",
    name: "Test",
    imageUrl: "/media/x",
    imageWidth: 700,
    imageHeight: 700,
    gridSizePx: 70,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridType: "square",
    scaleFeet: 5,
    diagonalRule: "5105",
    fogEnabled: false,
    losEnabled: false,
    lightingEnabled: false,
    daylight: 1,
    explorerEnabled: false,
    tokens: [],
    fogRegions: [],
    drawings: [],
    occluders: [],
    lights: [],
    ...over,
  };
}

describe("permissions", () => {
  it("pointInPolygon detects inside", () => {
    const poly = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ];
    assert.equal(pointInPolygon({ x: 2, y: 2 }, poly), true);
    assert.equal(pointInPolygon({ x: 5, y: 5 }, poly), false);
  });

  it("DM sees gm-layer tokens; player does not", () => {
    const token = baseToken({ layer: "gm" });
    assert.equal(
      isTokenVisibleToViewer(token, { userId: "dm", isDm: true }, false, []),
      true,
    );
    assert.equal(
      isTokenVisibleToViewer(token, { userId: "p", isDm: false }, false, []),
      false,
    );
  });

  it("mask token hidden until center revealed", () => {
    const token = baseToken({ visibility: "mask", x: 1, y: 1 });
    const regions = [
      {
        id: "r1",
        kind: "reveal" as const,
        points: [
          { x: 0, y: 0 },
          { x: 3, y: 0 },
          { x: 3, y: 3 },
          { x: 0, y: 3 },
        ],
      },
    ];
    assert.equal(
      isTokenVisibleToViewer(token, { userId: "p", isDm: false }, true, []),
      false,
    );
    assert.equal(
      isTokenVisibleToViewer(
        token,
        { userId: "p", isDm: false },
        true,
        regions,
      ),
      true,
    );
  });

  it("secret door rewritten to wall for players", () => {
    const o = {
      id: "o1",
      kind: "secret" as const,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      state: "closed" as const,
    };
    assert.equal(filterOccluderForViewer(o, { userId: "p", isDm: false }).kind, "wall");
    assert.equal(filterOccluderForViewer(o, { userId: "dm", isDm: true }).kind, "secret");
  });

  it("filterMapViewForViewer strips hidden tokens for players", () => {
    const map = baseMap({
      tokens: [
        baseToken({ id: "a", visibility: "hidden" }),
        baseToken({ id: "b", visibility: "always", name: "Visible" }),
      ],
    });
    const filtered = filterMapViewForViewer(map, { userId: "p", isDm: false });
    assert.equal(filtered.tokens.length, 1);
    assert.equal(filtered.tokens[0]!.id, "b");
  });

  it("isPointRevealed respects hide over reveal", () => {
    const regions = [
      {
        id: "r",
        kind: "reveal" as const,
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ],
      },
      {
        id: "h",
        kind: "hide" as const,
        points: [
          { x: 2, y: 2 },
          { x: 4, y: 2 },
          { x: 4, y: 4 },
          { x: 2, y: 4 },
        ],
      },
    ];
    assert.equal(isPointRevealed({ x: 1, y: 1 }, true, regions), true);
    assert.equal(isPointRevealed({ x: 3, y: 3 }, true, regions), false);
  });
});
