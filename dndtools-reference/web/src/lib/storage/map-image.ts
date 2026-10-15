import sharp from "sharp";
import { assertPixelCap, withImageSlot } from "@/lib/storage/image-pipeline";

export const MAP_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const MAP_IMAGE_MAX_EDGE = 8192;
export const MAP_IMAGE_WEBP_QUALITY = 82;
/** One 8192 x 8192 square (about 67 MP) is the largest accepted input. */
export const MAP_IMAGE_MAX_PIXELS = MAP_IMAGE_MAX_EDGE * MAP_IMAGE_MAX_EDGE;

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ProcessMapImageResult = {
  buffer: Buffer;
  width: number;
  height: number;
  format: "webp";
};

export type ProcessMapImageOptions = {
  /** Lowers the pixel cap so tests can exercise it without huge images. */
  maxPixels?: number;
};

export async function processMapImage(
  input: Buffer,
  options: ProcessMapImageOptions = {},
): Promise<ProcessMapImageResult> {
  const maxPixels = options.maxPixels ?? MAP_IMAGE_MAX_PIXELS;

  if (input.byteLength === 0) {
    throw new Error("Image is empty");
  }
  if (input.byteLength > MAP_IMAGE_MAX_BYTES) {
    throw new Error("Image must be 15 MB or smaller");
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

    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    assertPixelCap(width, height, maxPixels);

    let pipeline = sharp(input, { failOn: "error", limitInputPixels: maxPixels }).rotate();
    const maxEdge = Math.max(width, height);
    if (maxEdge > MAP_IMAGE_MAX_EDGE) {
      pipeline = pipeline.resize({
        width: width >= height ? MAP_IMAGE_MAX_EDGE : undefined,
        height: height > width ? MAP_IMAGE_MAX_EDGE : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const buffer = await pipeline.webp({ quality: MAP_IMAGE_WEBP_QUALITY }).toBuffer();
    const outMeta = await sharp(buffer).metadata();
    const outWidth = outMeta.width ?? 0;
    const outHeight = outMeta.height ?? 0;
    if (outWidth < 1 || outHeight < 1) {
      throw new Error("Failed to process map image");
    }

    return {
      buffer,
      width: outWidth,
      height: outHeight,
      format: "webp",
    };
  });
}
