import {
  applyEventToFilterContext,
  filterContextFromMap,
  filterLiveEventForViewer,
  type LiveFilterContext,
  type LiveRoomTokenMeta,
} from "@/lib/campaign/liveFilter";
import {
  campaignChannel,
  getRedis,
  getRedisSubscriber,
} from "@/lib/campaign/liveRedis";
import {
  roomGetDm,
  roomGetFog,
  roomGetOnlineUserIds,
  roomGetTokens,
  roomReplaceTokens,
  roomSetDm,
  roomSetFog,
  roomUpsertToken,
  roomRemoveToken,
} from "@/lib/campaign/liveRoom";
import type { CampaignLiveEvent } from "@/lib/campaign/types";
import type { CampaignMapView } from "@/lib/map/types";

type LocalSubscriber = {
  id: string;
  userId: string;
  campaignId: string;
  send: (event: CampaignLiveEvent) => void;
};

type CampaignLocal = {
  subscribers: Set<LocalSubscriber>;
  /** Cached filter context; refreshed from Redis on subscribe miss. */
  filterCtx: LiveFilterContext | null;
};

const globalForHub = globalThis as typeof globalThis & {
  __campaignLiveLocal?: Map<string, CampaignLocal>;
  __campaignRedisSubReady?: boolean;
};

function locals(): Map<string, CampaignLocal> {
  if (!globalForHub.__campaignLiveLocal) {
    globalForHub.__campaignLiveLocal = new Map();
  }
  return globalForHub.__campaignLiveLocal;
}

async function loadFilterCtx(
  campaignId: string,
  dmUserIdHint?: string,
): Promise<LiveFilterContext> {
  const dmUserId =
    dmUserIdHint ?? (await roomGetDm(campaignId)) ?? "";
  const fog = await roomGetFog(campaignId);
  let fogRegions: LiveFilterContext["fogRegions"] = [];
  try {
    fogRegions = JSON.parse(fog.fogRegionsJson);
  } catch {
    fogRegions = [];
  }
  const tokens = await roomGetTokens(campaignId);
  return {
    dmUserId,
    fogEnabled: fog.fogEnabled,
    fogRegions,
    tokens,
  };
}

async function ensureFilterCtx(
  campaignId: string,
  channel: CampaignLocal,
  dmUserIdHint?: string,
): Promise<LiveFilterContext> {
  if (channel.filterCtx) return channel.filterCtx;
  channel.filterCtx = await loadFilterCtx(campaignId, dmUserIdHint);
  return channel.filterCtx;
}

function deliverLocal(
  campaignId: string,
  event: CampaignLiveEvent,
  ctx: LiveFilterContext,
) {
  const channel = locals().get(campaignId);
  if (!channel) return;
  applyEventToFilterContext(ctx, event);
  for (const sub of channel.subscribers) {
    const payload = filterLiveEventForViewer(sub.userId, event, ctx);
    if (!payload) continue;
    try {
      sub.send(payload);
    } catch {
      // drop broken
    }
  }
}

function ensureRedisSubscription() {
  if (globalForHub.__campaignRedisSubReady) return;
  globalForHub.__campaignRedisSubReady = true;
  const sub = getRedisSubscriber();
  sub.on("pmessage", (_pattern, channel, message) => {
    const prefix = "campaign:";
    if (!channel.startsWith(prefix)) return;
    // Ignore meta keys: campaign:id:online etc. Pub channel is exactly campaign:{id}
    const rest = channel.slice(prefix.length);
    if (rest.includes(":")) return;
    const campaignId = rest;
    let event: CampaignLiveEvent;
    try {
      event = JSON.parse(message) as CampaignLiveEvent;
    } catch {
      return;
    }
    const local = locals().get(campaignId);
    if (!local || local.subscribers.size === 0) return;
    void (async () => {
      const ctx = await ensureFilterCtx(campaignId, local);
      deliverLocal(campaignId, event, ctx);
    })();
  });
  void sub.psubscribe("campaign:*");
}

export type PublishOptions = {
  /**
   * @deprecated Closures cannot cross Redis. Prefer publishing already-filtered
   * events or rely on replica-side filterLiveEventForViewer.
   * Still applied on the publishing process for local-only subscribers before Redis.
   */
  filterForUser?: (
    userId: string,
    event: CampaignLiveEvent,
  ) => CampaignLiveEvent | null;
};

/**
 * Publish a campaign live event to Redis. All replicas (including this one)
 * deliver to local WebSocket subscribers with data-driven filtering.
 */
export function publishCampaignLive(
  campaignId: string,
  event: CampaignLiveEvent,
  _options?: PublishOptions,
): void {
  ensureRedisSubscription();
  const payload = JSON.stringify(event);
  void getRedis()
    .publish(campaignChannel(campaignId), payload)
    .catch((err) => {
      console.error("[liveHub] publish failed", campaignId, err);
    });

  // Keep Redis room meta in sync for filter context.
  void syncRoomMetaFromEvent(campaignId, event).catch(() => {});
}

async function syncRoomMetaFromEvent(
  campaignId: string,
  event: CampaignLiveEvent,
) {
  if (event.type === "mapSnapshot") {
    if (event.map) {
      const metas: LiveRoomTokenMeta[] = event.map.tokens.map((t) => ({
        id: t.id,
        layer: t.layer,
        ownerUserId: t.ownerUserId,
        visibility: t.visibility,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        seq: t.seq,
      }));
      await roomReplaceTokens(campaignId, metas);
      await roomSetFog(
        campaignId,
        event.map.fogEnabled,
        JSON.stringify(event.map.fogRegions),
      );
    } else {
      await roomReplaceTokens(campaignId, []);
    }
    const local = locals().get(campaignId);
    if (local) {
      const dm = (await roomGetDm(campaignId)) ?? local.filterCtx?.dmUserId ?? "";
      local.filterCtx = filterContextFromMap(dm, event.map);
    }
    return;
  }
  if (event.type === "mapTokenMove") {
    const tokens = await roomGetTokens(campaignId);
    const prev = tokens[event.tokenId];
    if (prev && event.seq >= prev.seq) {
      await roomUpsertToken(campaignId, {
        ...prev,
        x: event.x,
        y: event.y,
        seq: event.seq,
      });
    }
    return;
  }
  if (event.type === "mapTokenUpsert") {
    const t = event.token;
    await roomUpsertToken(campaignId, {
      id: t.id,
      layer: t.layer,
      ownerUserId: t.ownerUserId,
      visibility: t.visibility,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      seq: t.seq,
    });
    return;
  }
  if (event.type === "mapTokenRemove") {
    await roomRemoveToken(campaignId, event.tokenId);
    return;
  }
  if (event.type === "mapFlags") {
    const fog = await roomGetFog(campaignId);
    await roomSetFog(campaignId, event.fogEnabled, fog.fogRegionsJson);
    return;
  }
  if (
    event.type === "mapFogUpsert" ||
    event.type === "mapFogRemove" ||
    event.type === "mapFogReset"
  ) {
    // Full fog list is easier from mapSnapshot; for deltas, patch Redis fogRegions.
    const fog = await roomGetFog(campaignId);
    let regions: CampaignMapView["fogRegions"] = [];
    try {
      regions = JSON.parse(fog.fogRegionsJson);
    } catch {
      regions = [];
    }
    if (event.type === "mapFogUpsert") {
      const idx = regions.findIndex((r) => r.id === event.region.id);
      if (idx >= 0) regions[idx] = event.region;
      else regions.push(event.region);
    } else if (event.type === "mapFogRemove") {
      regions = regions.filter((r) => r.id !== event.regionId);
    } else {
      regions = [];
    }
    await roomSetFog(campaignId, fog.fogEnabled, JSON.stringify(regions));
  }
}

export function subscribeCampaignLiveLocal(
  campaignId: string,
  userId: string,
  connectionId: string,
  send: (event: CampaignLiveEvent) => void,
  dmUserId?: string,
): () => void {
  ensureRedisSubscription();
  const map = locals();
  let channel = map.get(campaignId);
  if (!channel) {
    channel = { subscribers: new Set(), filterCtx: null };
    map.set(campaignId, channel);
  }
  if (dmUserId) {
    void roomSetDm(campaignId, dmUserId);
  }
  const sub: LocalSubscriber = {
    id: connectionId,
    userId,
    campaignId,
    send,
  };
  channel.subscribers.add(sub);
  void ensureFilterCtx(campaignId, channel, dmUserId);

  return () => {
    channel!.subscribers.delete(sub);
    if (channel!.subscribers.size === 0) {
      map.delete(campaignId);
    }
  };
}

export async function getCampaignOnlineUserIds(
  campaignId: string,
): Promise<string[]> {
  return roomGetOnlineUserIds(campaignId);
}

/** @deprecated Use getCampaignOnlineUserIds (async). Sync stub for old callers. */
export function getCampaignOnlineUserIdsSync(_campaignId: string): string[] {
  return [];
}

export function campaignLiveSubscriberCount(campaignId: string): number {
  return locals().get(campaignId)?.subscribers.size ?? 0;
}

/** Seed room meta when a map becomes live (called from map actions). */
export async function seedCampaignRoomMeta(
  campaignId: string,
  dmUserId: string,
  map: CampaignMapView | null,
): Promise<void> {
  await roomSetDm(campaignId, dmUserId);
  if (!map) {
    await roomReplaceTokens(campaignId, []);
    await roomSetFog(campaignId, false, "[]");
    return;
  }
  await roomReplaceTokens(
    campaignId,
    map.tokens.map((t) => ({
      id: t.id,
      layer: t.layer,
      ownerUserId: t.ownerUserId,
      visibility: t.visibility,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      seq: t.seq,
    })),
  );
  await roomSetFog(
    campaignId,
    map.fogEnabled,
    JSON.stringify(map.fogRegions),
  );
}
