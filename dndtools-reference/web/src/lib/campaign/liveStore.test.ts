import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLiveStore } from "./liveStore";
import type { CampaignTableState } from "./types";

function table(): CampaignTableState {
  return {
    id: "c1",
    name: "Camp",
    joinCode: "ABCD",
    dmUserId: "dm",
    myRole: "player",
    myStatus: "active",
    members: [],
    pcs: [],
    rolls: [],
    liveMap: {
      id: "m1",
      name: "Map",
      imageUrl: "/x.webp",
      imageWidth: 500,
      imageHeight: 500,
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
      tokens: [
        {
          id: "t1",
          kind: "pc",
          pcPlanId: "p1",
          name: "Hero",
          imageUrl: null,
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          rotation: 0,
          layer: "token",
          visibility: "always",
          ownerUserId: "u1",
          visionRange: null,
          emitsLight: false,
          lightBright: 0,
          lightDim: 0,
          seq: 1,
        },
      ],
      fogRegions: [],
      drawings: [],
      occluders: [],
      lights: [],
    },
    maps: [],
  };
}

describe("liveStore", () => {
  it("token move bumps tokenVersion but sheet listeners can use pcVersion", () => {
    const store = createLiveStore({ table: table(), viewerUserId: "u1" });
    const tokenV0 = store.getTokenVersion();
    const pcV0 = store.getPcVersion();
    store.applyEvent({
      type: "mapTokenMove",
      tokenId: "t1",
      x: 3,
      y: 4,
      rotation: 0,
      seq: 2,
      committed: false,
    });
    assert.ok(store.getTokenVersion() > tokenV0);
    assert.equal(store.getPcVersion(), pcV0);
    assert.equal(store.getState().tokens.get("t1")!.x, 3);
  });

  it("ignores own uncommitted echo by seq", () => {
    const store = createLiveStore({ table: table(), viewerUserId: "u1" });
    store.noteSelfMove("t1", 5);
    store.applyLocalTokenPos("t1", 2, 2, 5);
    store.applyEvent({
      type: "mapTokenMove",
      tokenId: "t1",
      x: 9,
      y: 9,
      rotation: 0,
      seq: 5,
      committed: false,
    });
    assert.equal(store.getState().tokens.get("t1")!.x, 2);
  });

  it("pcUpdated bumps pcVersion only", () => {
    const store = createLiveStore({ table: table(), viewerUserId: "u1" });
    const tokenV0 = store.getTokenVersion();
    const pcV0 = store.getPcVersion();
    store.applyEvent({
      type: "pcUpdated",
      pcPlanId: "p1",
      actorUserId: "other",
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    assert.equal(store.getTokenVersion(), tokenV0);
    assert.ok(store.getPcVersion() > pcV0);
  });
});
