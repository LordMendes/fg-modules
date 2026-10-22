/**
 * Pure helpers for serving stored media. No SDK or Next imports, so they can
 * be unit tested directly.
 */

export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * Object keys are immutable per URL (cache busting uses a query parameter),
 * so the key itself works as a stable ETag and needs no object read.
 */
export function mediaEtag(key: string): string {
  return `"${key}"`;
}

/**
 * True when If-None-Match names our ETag. Handles comma-separated lists and
 * weak validators. A `*` is ignored, since it would match any object and we
 * have not checked that this one exists.
 */
export function isNotModified(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(",")
    .some((candidate) => candidate.trim().replace(/^W\//, "") === etag);
}

/**
 * S3 reports a missing key as NoSuchKey on GetObject, or NotFound on
 * HeadObject. A missing bucket is a configuration error and is not a 404.
 */
export function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, $metadata } = error as {
    name?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  if (name === "NoSuchBucket") return false;
  return (
    name === "NoSuchKey" ||
    name === "NotFound" ||
    $metadata?.httpStatusCode === 404
  );
}
