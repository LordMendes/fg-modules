import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { PcImageKind } from "@/lib/storage/pc-image-kind";
import { pcImagePublicUrl } from "@/lib/storage/pc-image-url";

export type { PcImageKind };

const CACHE_CONTROL = "public, max-age=31536000";

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

export function publicUrlForKey(key: string, cacheBust?: string | number | Date): string {
  const url = pcImagePublicUrl(key, cacheBust);
  if (!url) {
    throw new Error("Invalid image key");
  }
  return url;
}

export function tryPublicUrlForKey(
  key: string | null | undefined,
  cacheBust?: string | number | Date,
): string | null {
  return pcImagePublicUrl(key, cacheBust);
}

const PC_IMAGE_KEY = /^pc\/[a-z0-9]+\/[a-z0-9]+\/(profile|token)\.webp$/i;

export function isPcImageObjectKey(key: string): boolean {
  return PC_IMAGE_KEY.test(key);
}

export async function getPcImageObject(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  if (!isPcImageObjectKey(key)) return null;
  try {
    const out = await getR2Client().send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: key,
      }),
    );
    if (!out.Body) return null;
    const body = await out.Body.transformToByteArray();
    return {
      body,
      contentType: out.ContentType || "image/webp",
    };
  } catch {
    return null;
  }
}

export async function putPcImageObject(
  key: string,
  body: Buffer,
): Promise<void> {
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
