import type { CampaignLiveEvent } from "@/lib/campaign/types";

type Subscriber = {
  userId: string;
  send: (event: CampaignLiveEvent) => void;
};

type CampaignChannel = {
  subscribers: Set<Subscriber>;
};

const globalForHub = globalThis as typeof globalThis & {
  __campaignLiveHub?: Map<string, CampaignChannel>;
};

function channels(): Map<string, CampaignChannel> {
  if (!globalForHub.__campaignLiveHub) {
    globalForHub.__campaignLiveHub = new Map();
  }
  return globalForHub.__campaignLiveHub;
}

function uniqueOnlineUserIds(channel: CampaignChannel): string[] {
  const ids = new Set<string>();
  for (const sub of channel.subscribers) {
    ids.add(sub.userId);
  }
  return Array.from(ids);
}

function broadcastPresence(campaignId: string, channel: CampaignChannel) {
  const event: CampaignLiveEvent = {
    type: "presence",
    onlineUserIds: uniqueOnlineUserIds(channel),
  };
  for (const sub of channel.subscribers) {
    try {
      sub.send(event);
    } catch {
      // drop broken subscriber on next GC via unsubscribe
    }
  }
}

export function getCampaignOnlineUserIds(campaignId: string): string[] {
  const channel = channels().get(campaignId);
  if (!channel) return [];
  return uniqueOnlineUserIds(channel);
}

export function subscribeCampaignLive(
  campaignId: string,
  userId: string,
  send: (event: CampaignLiveEvent) => void,
): () => void {
  const map = channels();
  let channel = map.get(campaignId);
  if (!channel) {
    channel = { subscribers: new Set() };
    map.set(campaignId, channel);
  }

  const wasOnline = uniqueOnlineUserIds(channel).includes(userId);
  const sub: Subscriber = { userId, send };
  channel.subscribers.add(sub);

  // Always tell the new connection who is online.
  try {
    send({ type: "presence", onlineUserIds: uniqueOnlineUserIds(channel) });
  } catch {
    // ignore
  }

  if (!wasOnline) {
    broadcastPresence(campaignId, channel);
  }

  return () => {
    channel!.subscribers.delete(sub);
    const stillOnline = uniqueOnlineUserIds(channel!).includes(userId);
    if (channel!.subscribers.size === 0) {
      map.delete(campaignId);
      return;
    }
    if (!stillOnline) {
      broadcastPresence(campaignId, channel!);
    }
  };
}

export function publishCampaignLive(
  campaignId: string,
  event: CampaignLiveEvent,
  options?: {
    /** When set, only these userIds receive the full event; others get a filtered copy via filter. */
    filterForUser?: (userId: string, event: CampaignLiveEvent) => CampaignLiveEvent | null;
  },
): void {
  const channel = channels().get(campaignId);
  if (!channel) return;
  for (const sub of channel.subscribers) {
    const payload = options?.filterForUser
      ? options.filterForUser(sub.userId, event)
      : event;
    if (payload) {
      try {
        sub.send(payload);
      } catch {
        // drop broken subscriber on next GC via unsubscribe
      }
    }
  }
}

export function campaignLiveSubscriberCount(campaignId: string): number {
  return channels().get(campaignId)?.subscribers.size ?? 0;
}
