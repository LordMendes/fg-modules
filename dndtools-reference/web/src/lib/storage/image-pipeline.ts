import os from "node:os";
import sharp from "sharp";

/**
 * Shared sharp settings for every image decode in the app. Decoding is the
 * largest memory spike on the server, so it runs through a small slot pool,
 * and libvips keeps a bounded cache instead of its default.
 */
const IMAGE_SLOTS = 2;

sharp.cache({ memory: 32, files: 0 });
sharp.concurrency(Math.max(1, Math.min(2, os.availableParallelism())));

/**
 * Returns a runner that lets at most `limit` tasks run at once. Waiting tasks
 * start in arrival order, and a slot is released even when its task throws.
 */
export function createSemaphore(limit: number) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("Semaphore limit must be a positive integer");
  }

  let active = 0;
  const waiting: Array<() => void> = [];

  function acquire(): Promise<void> {
    if (active < limit) {
      active += 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => waiting.push(resolve));
  }

  function release(): void {
    const next = waiting.shift();
    if (next) {
      // Hand the slot straight to the next waiter, so `active` stays the same.
      next();
    } else {
      active -= 1;
    }
  }

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  };
}

export const withImageSlot = createSemaphore(IMAGE_SLOTS);

/**
 * Rejects an image whose decoded size would be too large to process safely.
 * Runs on header metadata, so the pixels are never decoded.
 */
export function assertPixelCap(
  width: number | undefined,
  height: number | undefined,
  maxPixels: number,
): void {
  const w = width ?? 0;
  const h = height ?? 0;
  if (w < 1 || h < 1) {
    throw new Error("Invalid image dimensions");
  }
  if (w * h > maxPixels) {
    throw new Error(
      `Image is too large. The limit is ${formatMegapixels(maxPixels)} megapixels.`,
    );
  }
}

function formatMegapixels(pixels: number): string {
  return String(Math.round(pixels / 1_000_000));
}
