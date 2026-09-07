import sharp from "sharp";

export const MAP_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const MAP_IMAGE_MAX_EDGE = 8192;
export const MAP_IMAGE_WEBP_QUALITY = 82;

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ProcessMapImageResult = {
  buffer: Buffer;
  width: number;
  height: number;
  format: "webp";
};

export async function processMapImage(
  input: Buffer,
): Promise<ProcessMapImageResult> {
  if (input.byteLength === 0) {
    throw new Error("Image is empty");
  }
  if (input.byteLength > MAP_IMAGE_MAX_BYTES) {
    throw new Error("Image must be 15 MB or smaller");
  }

  let meta;
  try {
    meta = await sharp(input, { failOn: "error" }).metadata();
  } catch {
    throw new Error("Invalid or unsupported image");
  }

  const format = meta.format;
  if (!format || !ALLOWED_FORMATS.has(format)) {
    throw new Error("Image must be JPEG, PNG, or WebP");
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 1 || height < 1) {
    throw new Error("Invalid image dimensions");
  }

  let pipeline = sharp(input, { failOn: "error" }).rotate();
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
}
