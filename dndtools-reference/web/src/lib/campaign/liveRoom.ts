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

export async function roomAddOnline(
  campaignId: string,
  userId: string,
  connectionId: string,
) {
  // Track connection ids so multi-tab does not drop presence early.
  await getRedis().sadd(`${campaignOnlineKey(campaignId)}:${userId}`, connectionId);
  await getRedis().sadd(campaignOnlineKey(campaignId), userId);
}

export async function roomRemoveOnline(
  campaignId: string,
  userId: string,
  connectionId: string,
): Promise<boolean> {
  const redis = getRedis();
  const connKey = `${campaignOnlineKey(campaignId)}:${userId}`;
  await redis.srem(connKey, connectionId);
  const remaining = await redis.scard(connKey);
  if (remaining <= 0) {
    await redis.srem(campaignOnlineKey(campaignId), userId);
    await redis.del(connKey);
    return true;
  }
  return false;
}

export async function roomGetOnlineUserIds(
  campaignId: string,
): Promise<string[]> {
  return getRedis().smembers(campaignOnlineKey(campaignId));
}
