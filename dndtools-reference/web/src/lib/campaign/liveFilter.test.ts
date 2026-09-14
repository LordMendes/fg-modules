import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyEventToFilterContext,
  filterContextFromMap,
  filterLiveEventForViewer,
} from "./liveFilter";
import type { CampaignMapView, MapTokenView } from "@/lib/map/types";

function baseMap(tokens: MapTokenView[]): CampaignMapView {
  return {
    id: "m1",
    name: "Map",
    imageUrl: "/x.webp",
    imageWidth: 1000,
    imageHeight: 1000,
    gridSizePx: 50,
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
    tokens,
    fogRegions: [],
    drawings: [],
    occluders: [],
    lights: [],
  };
}

function token(
  partial: Partial<MapTokenView> & Pick<MapTokenView, "id" | "layer">,
): MapTokenView {
  return {
    kind: "npc",
    pcPlanId: null,
    name: "T",
    imageUrl: null,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    rotation: 0,
    visibility: "always",
    ownerUserId: null,
    visionRange: null,
    emitsLight: false,
    lightBright: 0,
    lightDim: 0,
    seq: 1,
    ...partial,
  };
}

describe("filterLiveEventForViewer", () => {
  it("hides GM-layer token moves from players", () => {
    const gm = token({ id: "g1", layer: "gm", x: 2, y: 3, seq: 2 });
    const map = baseMap([gm]);
    const ctx = filterContextFromMap("dm-user", map);
    const event = {
      type: "mapTokenMove" as const,
      tokenId: "g1",
      x: 4,
      y: 5,
      rotation: 0,
      seq: 3,
      committed: false,
    };
    assert.equal(
      filterLiveEventForViewer("player-1", event, ctx),
      null,
    );
    assert.deepEqual(
      filterLiveEventForViewer("dm-user", event, ctx),
      event,
    );
  });

  it("filters mapList for non-DM", () => {
    const ctx = filterContextFromMap("dm-user", null);
    const event = {
      type: "mapList" as const,
      maps: [{ id: "a", name: "A" }],
    };
    assert.equal(filterLiveEventForViewer("player", event, ctx), null);
    assert.deepEqual(filterLiveEventForViewer("dm-user", event, ctx), event);
  });

  it("drops stale seq when applying move to context", () => {
    const t = token({ id: "t1", layer: "token", seq: 5, x: 1, y: 1 });
    const ctx = filterContextFromMap("dm", baseMap([t]));
    applyEventToFilterContext(ctx, {
      type: "mapTokenMove",
      tokenId: "t1",
      x: 9,
      y: 9,
      rotation: 0,
      seq: 3,
      committed: false,
    });
    assert.equal(ctx.tokens.t1!.seq, 5);
    assert.equal(ctx.tokens.t1!.x, 1);
    applyEventToFilterContext(ctx, {
      type: "mapTokenMove",
      tokenId: "t1",
      x: 9,
      y: 9,
      rotation: 0,
      seq: 6,
      committed: false,
    });
    assert.equal(ctx.tokens.t1!.seq, 6);
    assert.equal(ctx.tokens.t1!.x, 9);
  });

  it("strips activity players cannot see", () => {
    const ctx = filterContextFromMap("dm", null);
    const event = {
      type: "activity" as const,
      activity: {
        id: "a1",
        kind: "pc_update" as const,
        summary: "x",
        details: [],
        actorUserId: "other",
        actorUsername: "o",
        pcPlanId: null,
        pcName: null,
        subjectUserId: null,
        createdAt: new Date().toISOString(),
      },
    };
    assert.equal(filterLiveEventForViewer("player", event, ctx), null);
    assert.ok(filterLiveEventForViewer("dm", event, ctx));
  });
});
