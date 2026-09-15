import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ClientLiveMessage } from "@/lib/campaign/types";

/**
 * Pure permission matrix for client→server map board commands.
 * Mirrors liveWsHandlers + mapMutations rules without Prisma.
 */
function canPlayerSend(msg: ClientLiveMessage): boolean {
  switch (msg.type) {
    case "ping":
    case "tokenMove":
    case "tokenMoveCommit":
    case "mapPing":
    case "mapDrawingUpsert":
    case "mapDrawingRemove":
    case "mapDoorState":
    case "mapTokenRemove":
      return true;
    case "mapViewportGoTo":
    case "mapDrawingClear":
    case "mapFogUpsert":
    case "mapFogRemove":
    case "mapFogReset":
    case "mapOccluderUpsert":
    case "mapOccluderRemove":
    case "mapLightUpsert":
    case "mapLightRemove":
    case "mapFlags":
    case "mapGrid":
    case "mapTokenUpsert":
      return false;
    default:
      return false;
  }
}

describe("map board WS permission matrix", () => {
  it("allows players to move tokens and ping", () => {
    assert.equal(
      canPlayerSend({
        type: "tokenMove",
        tokenId: "t",
        x: 0,
        y: 0,
        rotation: 0,
        seq: 1,
      }),
      true,
    );
    assert.equal(canPlayerSend({ type: "mapPing", x: 1, y: 2 }), true);
  });

  it("denies players fog, walls, flags, and lights", () => {
    assert.equal(
      canPlayerSend({
        type: "mapFogUpsert",
        kind: "reveal",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      }),
      false,
    );
    assert.equal(
      canPlayerSend({
        type: "mapOccluderUpsert",
        kind: "wall",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      }),
      false,
    );
    assert.equal(
      canPlayerSend({ type: "mapFlags", fogEnabled: true }),
      false,
    );
    assert.equal(
      canPlayerSend({
        type: "mapLightUpsert",
        light: {
          x: 0,
          y: 0,
          brightFeet: 20,
          dimFeet: 20,
          color: "#fff",
          enabled: true,
        },
      }),
      false,
    );
  });
});
