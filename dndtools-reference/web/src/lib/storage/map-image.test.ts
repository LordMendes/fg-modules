import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  MAP_IMAGE_MAX_EDGE,
  MAP_IMAGE_MAX_PIXELS,
  processMapImage,
} from "./map-image";

async function makeJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 120, b: 200 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("processMapImage", () => {
  it("rejects a non-image buffer", async () => {
    await assert.rejects(
      () => processMapImage(Buffer.from("not-an-image")),
      /Invalid or unsupported image|must be JPEG/,
    );
  });

  it("rejects an empty buffer", async () => {
    await assert.rejects(() => processMapImage(Buffer.alloc(0)), /empty/i);
  });

  it("preserves aspect ratio for a non-square JPEG", async () => {
    const input = await makeJpeg(800, 400);
    const result = await processMapImage(input);
    assert.equal(result.format, "webp");
    assert.ok(result.width > result.height);
    assert.equal(Math.round((result.width / result.height) * 10), 20);
  });

  it("downscales when the longest edge exceeds the max", async () => {
    const input = await makeJpeg(MAP_IMAGE_MAX_EDGE + 500, 1000);
    const result = await processMapImage(input);
    assert.ok(result.width <= MAP_IMAGE_MAX_EDGE);
    assert.ok(result.height <= MAP_IMAGE_MAX_EDGE);
  });

  it("rejects an image over the pixel cap before decoding", async () => {
    const input = await makeJpeg(800, 400);
    await assert.rejects(
      () => processMapImage(input, { maxPixels: 100_000 }),
      /too large/,
    );
  });

  it("accepts an image exactly at the pixel cap", async () => {
    const input = await makeJpeg(400, 250);
    const result = await processMapImage(input, { maxPixels: 100_000 });
    assert.equal(result.format, "webp");
  });

  it("caps map input at an 8192 x 8192 square by default", () => {
    assert.equal(MAP_IMAGE_MAX_PIXELS, 8192 * 8192);
  });
});
