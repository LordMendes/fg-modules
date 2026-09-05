/** Same-origin URL for PC images proxied from R2. r2.dev public URLs 404 for this bucket. */
export function pcImagePublicUrl(
  key: string | null | undefined,
  cacheBust?: string | number | Date | null,
): string | null {
  if (!key) return null;
  if (!/^pc\/[a-z0-9]+\/[a-z0-9]+\/(profile|token)\.webp$/i.test(key)) {
    return null;
  }
  const url = `/media/${key}`;
  if (cacheBust == null) return url;
  const v =
    cacheBust instanceof Date ? cacheBust.getTime() : String(cacheBust);
  return `${url}?v=${encodeURIComponent(v)}`;
}
