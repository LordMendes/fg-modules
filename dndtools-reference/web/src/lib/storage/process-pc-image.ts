import sharp from "sharp";
import type { PcImageKind } from "@/lib/storage/pc-image-kind";

export type { PcImageKind };

export const PC_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

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

export async function processPcImage(
  input: Buffer,
  kind: PcImageKind,
): Promise<ProcessPcImageResult> {
  if (input.byteLength === 0) {
    throw new Error("Image is empty");
  }
  if (input.byteLength > PC_IMAGE_MAX_BYTES) {
    throw new Error("Image must be 8 MB or smaller");
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

  const size = PC_IMAGE_SIZES[kind];
  const buffer = await sharp(input, { failOn: "error" })
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
}
