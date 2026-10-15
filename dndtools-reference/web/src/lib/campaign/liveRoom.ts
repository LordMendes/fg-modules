import type { LiveRoomTokenMeta } from "@/lib/campaign/liveFilter";
import {
  campaignMetaKey,
  campaignOnlineKey,
  campaignTokensKey,
  getRedis,
} from "@/lib/campaign/liveRedis";

export async function roomSetDm(campaignId: string, dmUserId: string) {
  await getRedis().hset(campaignMetaKey(campaignId), "dmUserId", dmUserId);
}

export async function roomGetDm(campaignId: string): Promise<string | null> {
  return getRedis().hget(campaignMetaKey(campaignId), "dmUserId");
}

export async function roomSetFog(
  campaignId: string,
  fogEnabled: boolean,
  fogRegionsJson: string,
) {
  await getRedis().hset(campaignMetaKey(campaignId), {
    fogEnabled: fogEnabled ? "1" : "0",
    fogRegions: fogRegionsJson,
  });
}

export async function roomGetFog(campaignId: string): Promise<{
  fogEnabled: boolean;
  fogRegionsJson: string;
}> {
  const data = await getRedis().hmget(
    campaignMetaKey(campaignId),
    "fogEnabled",
    "fogRegions",
  );
  return {
    fogEnabled: data[0] === "1",
    fogRegionsJson: data[1] ?? "[]",
  };
}

export async function roomUpsertToken(
  campaignId: string,
  token: LiveRoomTokenMeta,
) {
  await getRedis().hset(
    campaignTokensKey(campaignId),
    token.id,
    JSON.stringify(token),
  );
}

export async function roomRemoveToken(campaignId: string, tokenId: string) {
  await getRedis().hdel(campaignTokensKey(campaignId), tokenId);
}

export async function roomGetTokens(
  campaignId: string,
): Promise<Record<string, LiveRoomTokenMeta>> {
  const raw = await getRedis().hgetall(campaignTokensKey(campaignId));
  const out: Record<string, LiveRoomTokenMeta> = {};
  for (const [id, json] of Object.entries(raw)) {
    try {
      out[id] = JSON.parse(json) as LiveRoomTokenMeta;
    } catch {
      // skip bad entry
    }
  }
  return out;
}

export async function roomReplaceTokens(
  campaignId: string,
  tokens: LiveRoomTokenMeta[],
) {
  const redis = getRedis();
  const key = campaignTokensKey(campaignId);
  const pipeline = redis.pipeline();
  pipeline.del(key);
  for (const t of tokens) {
    pipeline.hset(key, t.id, JSON.stringify(t));
  }
  await pipeline.exec();
}

/**
 * Presence lives in Redis, so a crashed or redeployed server never gets to
 * remove its connections. The per-user connection set expires unless the
 * heartbeat refreshes it (every 30 s), and reads drop users whose set is gone.
 */
export const PRESENCE_TTL_SECONDS = 90;

function onlineConnKey(campaignId: string, userId: string): string {
  return `${campaignOnlineKey(campaignId)}:${userId}`;
}

export async function roomAddOnline(
  campaignId: string,
  userId: string,
  connectionId: string,
) {
  // Track connection ids so multi-tab does not drop presence early.
  const redis = getRedis();
  const connKey = onlineConnKey(campaignId, userId);
  await redis.sadd(connKey, connectionId);
  await redis.expire(connKey, PRESENCE_TTL_SECONDS);
  await redis.sadd(campaignOnlineKey(campaignId), userId);
}

export async function roomRemoveOnline(
  campaignId: string,
  userId: string,
  connectionId: string,
): Promise<boolean> {
  const redis = getRedis();
  const connKey = onlineConnKey(campaignId, userId);
  await redis.srem(connKey, connectionId);
  const remaining = await redis.scard(connKey);
  if (remaining <= 0) {
    await redis.srem(campaignOnlineKey(campaignId), userId);
    await redis.del(connKey);
    return true;
  }
  return false;
}

/**
 * Splits presence candidates into users with at least one live connection and
 * users whose connection set is empty or expired. Pure, so it is unit tested.
 */
export function partitionPresence(
  userIds: readonly string[],
  connectionCounts: readonly number[],
): { live: string[]; stale: string[] } {
  const live: string[] = [];
  const stale: string[] = [];
  userIds.forEach((userId, index) => {
    if ((connectionCounts[index] ?? 0) > 0) {
      live.push(userId);
    } else {
      stale.push(userId);
    }
  });
  return { live, stale };
}

export async function roomGetOnlineUserIds(
  campaignId: string,
): Promise<string[]> {
  const redis = getRedis();
  const campaignKey = campaignOnlineKey(campaignId);
  const userIds = await redis.smembers(campaignKey);
  if (userIds.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const userId of userIds) {
    pipeline.scard(onlineConnKey(campaignId, userId));
  }
  const results = (await pipeline.exec()) ?? [];
  const counts = userIds.map((_, index) => {
    const [err, count] = results[index] ?? [null, 0];
    return err ? 0 : Number(count);
  });

  const { live, stale } = partitionPresence(userIds, counts);
  if (stale.length > 0) {
    // Ghost entries from a crashed server. Removing them here keeps the
    // count honest without waiting for a socket event that never comes.
    await redis.srem(campaignKey, ...stale);
  }
  return live;
}
