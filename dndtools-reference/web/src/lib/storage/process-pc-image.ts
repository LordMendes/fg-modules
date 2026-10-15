import sharp from "sharp";
import type { PcImageKind } from "@/lib/storage/pc-image-kind";
import { assertPixelCap, withImageSlot } from "@/lib/storage/image-pipeline";

export type { PcImageKind };

export const PC_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

/** A 6000 x 4000 (24 MP) camera photo is the largest accepted input. */
export const PC_IMAGE_MAX_PIXELS = 6000 * 4000;

export const PC_IMAGE_SIZES: Record<PcImageKind, number> = {
  profile: 512,
  token: 256,
};

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ProcessPcImageResult = {
  buffer: Buffer;
  width: number;
  height: number;
  format: "webp";
};

export type ProcessPcImageOptions = {
  /** Lowers the pixel cap so tests can exercise it without huge images. */
  maxPixels?: number;
};

export async function processPcImage(
  input: Buffer,
  kind: PcImageKind,
  options: ProcessPcImageOptions = {},
): Promise<ProcessPcImageResult> {
  const maxPixels = options.maxPixels ?? PC_IMAGE_MAX_PIXELS;

  if (input.byteLength === 0) {
    throw new Error("Image is empty");
  }
  if (input.byteLength > PC_IMAGE_MAX_BYTES) {
    throw new Error("Image must be 8 MB or smaller");
  }

  return withImageSlot(async () => {
    // Header-only read. The pixel cap below is the real check, so the decode
    // limit is disabled here to report "too large" instead of "invalid".
    let meta;
    try {
      meta = await sharp(input, { failOn: "error", limitInputPixels: false }).metadata();
    } catch {
      throw new Error("Invalid or unsupported image");
    }

    const format = meta.format;
    if (!format || !ALLOWED_FORMATS.has(format)) {
      throw new Error("Image must be JPEG, PNG, or WebP");
    }
    assertPixelCap(meta.width, meta.height, maxPixels);

    const size = PC_IMAGE_SIZES[kind];
    const buffer = await sharp(input, { failOn: "error", limitInputPixels: maxPixels })
      .rotate()
      .resize(size, size, {
        fit: "cover",
        position: "centre",
        withoutEnlargement: false,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const outMeta = await sharp(buffer).metadata();
    if (outMeta.width !== size || outMeta.height !== size) {
      throw new Error("Failed to produce square image");
    }

    return {
      buffer,
      width: size,
      height: size,
      format: "webp",
    };
  });
}
