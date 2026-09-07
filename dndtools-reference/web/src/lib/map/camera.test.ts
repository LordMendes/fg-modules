import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fitCameraToImage,
  overlayCanvasSize,
  screenToWorld,
  worldToScreen,
  zoomAtScreenPoint,
} from "./camera";

describe("camera", () => {
  it("round-trips screen and world", () => {
    const cam = { x: 10, y: 20, scale: 2 };
    const s = worldToScreen(cam, 5, 6);
    assert.deepEqual(s, { x: 20, y: 32 });
    assert.deepEqual(screenToWorld(cam, s.x, s.y), { x: 5, y: 6 });
  });

  it("zoomAtScreenPoint keeps the focal world point stable", () => {
    const cam = { x: 0, y: 0, scale: 1 };
    const next = zoomAtScreenPoint(cam, 100, 100, 2);
    const before = screenToWorld(cam, 100, 100);
    const after = screenToWorld(next, 100, 100);
    assert.ok(Math.abs(before.x - after.x) < 1e-9);
    assert.ok(Math.abs(before.y - after.y) < 1e-9);
    assert.equal(next.scale, 2);
  });

  it("fitCameraToImage keeps overlay canvas viewport-sized via helper", () => {
    const cam = fitCameraToImage(800, 600, 4000, 4000);
    assert.ok(cam.scale < 1);
    const size = overlayCanvasSize(800, 600, 2);
    assert.equal(size.width, 1600);
    assert.equal(size.height, 1200);
    assert.ok(size.width < 4000);
  });
});
