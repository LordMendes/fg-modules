/** Same-origin URL for images proxied from R2. r2.dev public URLs 404 for this bucket. */

const PC_IMAGE_KEY = /^pc\/[a-z0-9]+\/[a-z0-9]+\/(profile|token)\.webp$/i;
const MAP_IMAGE_KEY =
  /^campaign\/[a-z0-9]+\/maps\/[a-z0-9]+\/image\.webp$/i;
const MAP_TOKEN_IMAGE_KEY =
  /^campaign\/[a-z0-9]+\/maps\/[a-z0-9]+\/tokens\/[a-z0-9]+\.webp$/i;

export function isPcImageObjectKey(key: string): boolean {
  return PC_IMAGE_KEY.test(key);
}

export function isCampaignMapImageKey(key: string): boolean {
  return MAP_IMAGE_KEY.test(key);
}

export function isCampaignMapTokenImageKey(key: string): boolean {
  return MAP_TOKEN_IMAGE_KEY.test(key);
}

export function isMediaObjectKey(key: string): boolean {
  return (
    isPcImageObjectKey(key) ||
    isCampaignMapImageKey(key) ||
    isCampaignMapTokenImageKey(key)
  );
}

export function mediaPublicUrl(
  key: string | null | undefined,
  cacheBust?: string | number | Date | null,
): string | null {
  if (!key || !isMediaObjectKey(key)) return null;
  const url = `/media/${key}`;
  if (cacheBust == null) return url;
  const v =
    cacheBust instanceof Date ? cacheBust.getTime() : String(cacheBust);
  return `${url}?v=${encodeURIComponent(v)}`;
}

/** @deprecated Prefer mediaPublicUrl; kept for PC call sites. */
export function pcImagePublicUrl(
  key: string | null | undefined,
  cacheBust?: string | number | Date | null,
): string | null {
  if (!key) return null;
  if (!isPcImageObjectKey(key) && !isCampaignMapImageKey(key) && !isCampaignMapTokenImageKey(key)) {
    return null;
  }
  return mediaPublicUrl(key, cacheBust);
}
