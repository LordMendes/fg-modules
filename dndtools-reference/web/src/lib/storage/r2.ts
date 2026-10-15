import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { PcImageKind } from "@/lib/storage/pc-image-kind";
import { isMissingObjectError } from "@/lib/storage/media-response";
import {
  isCampaignMapImageKey,
  isCampaignMapTokenImageKey,
  isMediaObjectKey,
  isPcImageObjectKey,
  mediaPublicUrl,
} from "@/lib/storage/pc-image-url";

export type { PcImageKind };
export {
  isCampaignMapImageKey,
  isCampaignMapTokenImageKey,
  isMediaObjectKey,
  isPcImageObjectKey,
};

const CACHE_CONTROL = "public, max-age=31536000";

/**
 * Bounds how long one R2 call can stall a request. A slow object store
 * should fail fast instead of holding a connection and a request open.
 */
const R2_CONNECTION_TIMEOUT_MS = 3_000;
const R2_REQUEST_TIMEOUT_MS = 10_000;
const R2_MAX_ATTEMPTS = 2;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getBucket(): string {
  return requireEnv("R2_BUCKET");
}

let client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: requireEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
    requestHandler: {
      connectionTimeout: R2_CONNECTION_TIMEOUT_MS,
      requestTimeout: R2_REQUEST_TIMEOUT_MS,
    },
    maxAttempts: R2_MAX_ATTEMPTS,
  });
  return client;
}

export function pcImageObjectKey(
  userId: string,
  planId: string,
  kind: PcImageKind,
): string {
  return `pc/${userId}/${planId}/${kind}.webp`;
}

export function campaignMapImageKey(
  campaignId: string,
  mapId: string,
): string {
  return `campaign/${campaignId}/maps/${mapId}/image.webp`;
}

export function campaignMapTokenImageKey(
  campaignId: string,
  mapId: string,
  tokenId: string,
): string {
  return `campaign/${campaignId}/maps/${mapId}/tokens/${tokenId}.webp`;
}

export function publicUrlForKey(
  key: string,
  cacheBust?: string | number | Date,
): string {
  const url = mediaPublicUrl(key, cacheBust);
  if (!url) {
    throw new Error("Invalid image key");
  }
  return url;
}

export function tryPublicUrlForKey(
  key: string | null | undefined,
  cacheBust?: string | number | Date,
): string | null {
  return mediaPublicUrl(key, cacheBust);
}

export type PcImageObject = {
  /** Streamed from R2, so the image is never buffered whole in memory. */
  body: ReadableStream;
  contentType: string;
  contentLength?: number;
};

/**
 * Returns null only when the object does not exist. Other failures (timeouts,
 * network errors, missing configuration) are thrown, so the caller can answer
 * 503 instead of a misleading 404.
 */
export async function getPcImageObject(
  key: string,
): Promise<PcImageObject | null> {
  if (!isMediaObjectKey(key)) return null;

  let out;
  try {
    out = await getR2Client().send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: key,
      }),
    );
  } catch (error) {
    if (isMissingObjectError(error)) return null;
    throw error;
  }

  if (!out.Body) return null;
  return {
    body: out.Body.transformToWebStream(),
    contentType: out.ContentType || "image/webp",
    contentLength: out.ContentLength,
  };
}

export async function putPcImageObject(
  key: string,
  body: Buffer,
): Promise<void> {
  if (!isMediaObjectKey(key)) {
    throw new Error("Invalid image key");
  }
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: CACHE_CONTROL,
    }),
  );
}

export async function deletePcImageObject(key: string): Promise<void> {
  if (!isMediaObjectKey(key)) return;
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}

export async function copyPcImageObject(
  sourceKey: string,
  destKey: string,
): Promise<void> {
  if (!isMediaObjectKey(sourceKey) || !isMediaObjectKey(destKey)) {
    throw new Error("Invalid image key");
  }
  const bucket = getBucket();
  await getR2Client().send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: destKey,
      ContentType: "image/webp",
      CacheControl: CACHE_CONTROL,
      MetadataDirective: "REPLACE",
    }),
  );
}

export async function deletePcPlanImages(
  userId: string,
  planId: string,
): Promise<void> {
  const keys = [
    pcImageObjectKey(userId, planId, "profile"),
    pcImageObjectKey(userId, planId, "token"),
  ];
  await Promise.all(
    keys.map(async (key) => {
      try {
        await deletePcImageObject(key);
      } catch {
        // Missing objects are fine on delete.
      }
    }),
  );
}
