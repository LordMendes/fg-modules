import { randomUUID } from "crypto";
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

type WireEnvelope = {
  originId: string;
  event: CampaignLiveEvent;
};

const globalForHub = globalThis as typeof globalThis & {
  __campaignLiveLocal?: Map<string, CampaignLocal>;
  __campaignRedisSubReady?: boolean;
  __campaignHubOriginId?: string;
};

function hubOriginId(): string {
  if (!globalForHub.__campaignHubOriginId) {
    globalForHub.__campaignHubOriginId = randomUUID();
  }
  return globalForHub.__campaignHubOriginId;
}

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
    userPcPlanIds: {},
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
    let envelope: WireEnvelope | CampaignLiveEvent;
    try {
      envelope = JSON.parse(message) as WireEnvelope | CampaignLiveEvent;
    } catch {
      return;
    }
    // Skip echo of our own publish (already delivered locally).
    if (
      envelope &&
      typeof envelope === "object" &&
      "originId" in envelope &&
      "event" in envelope
    ) {
      if (envelope.originId === hubOriginId()) return;
      envelope = envelope.event;
    }
    const event = envelope as CampaignLiveEvent;
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
 * Deliver to in-process sockets first, then Redis for other replicas.
 * Works when Redis is down (local-only), and uses originId to avoid
 * double-delivery when Redis echoes back to this process.
 */
export function publishCampaignLive(
  campaignId: string,
  event: CampaignLiveEvent,
  _options?: PublishOptions,
): void {
  ensureRedisSubscription();

  const channel = locals().get(campaignId);
  if (channel) {
    void (async () => {
      const ctx = await ensureFilterCtx(campaignId, channel);
      deliverLocal(campaignId, event, ctx);
    })().catch(() => {});
  }

  const wire: WireEnvelope = { originId: hubOriginId(), event };
  void getRedis()
    .publish(campaignChannel(campaignId), JSON.stringify(wire))
    .catch((err) => {
      console.error("[liveHub] publish failed", campaignId, err);
    });

  // Keep Redis room meta in sync for filter context.
  void syncRoomMetaFromEvent(campaignId, event).catch(() => {});
}

/** Test helper: parse a Redis wire payload into the live event (or null). */
export function unwrapLiveWirePayload(
  message: string,
  localOriginId?: string,
): CampaignLiveEvent | null {
  try {
    const parsed = JSON.parse(message) as WireEnvelope | CampaignLiveEvent;
    if (
      parsed &&
      typeof parsed === "object" &&
      "originId" in parsed &&
      "event" in parsed
    ) {
      if (localOriginId && parsed.originId === localOriginId) return null;
      return parsed.event;
    }
    return parsed as CampaignLiveEvent;
  } catch {
    return null;
  }
}

export function getHubOriginIdForTests(): string {
  return hubOriginId();
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
