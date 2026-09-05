import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  PC_IMAGE_SIZES,
  processPcImage,
} from "./process-pc-image";

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

describe("processPcImage", () => {
  it("rejects a non-image buffer", async () => {
    await assert.rejects(
      () => processPcImage(Buffer.from("not-an-image"), "profile"),
      /Invalid or unsupported image|must be JPEG/,
    );
  });

  it("rejects an empty buffer", async () => {
    await assert.rejects(
      () => processPcImage(Buffer.alloc(0), "token"),
      /empty/i,
    );
  });

  it("cover-crops a non-square JPEG to square WebP for profile", async () => {
    const input = await makeJpeg(800, 400);
    const result = await processPcImage(input, "profile");
    assert.equal(result.format, "webp");
    assert.equal(result.width, PC_IMAGE_SIZES.profile);
    assert.equal(result.height, PC_IMAGE_SIZES.profile);

    const meta = await sharp(result.buffer).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, PC_IMAGE_SIZES.profile);
    assert.equal(meta.height, PC_IMAGE_SIZES.profile);
  });

  it("outputs 256x256 WebP for token", async () => {
    const input = await makeJpeg(100, 300);
    const result = await processPcImage(input, "token");
    assert.equal(result.width, PC_IMAGE_SIZES.token);
    assert.equal(result.height, PC_IMAGE_SIZES.token);
    const meta = await sharp(result.buffer).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, 256);
    assert.equal(meta.height, 256);
  });
});
