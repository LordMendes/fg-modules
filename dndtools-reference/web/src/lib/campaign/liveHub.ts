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
  const sub: Subscriber = { userId, send };
  channel.subscribers.add(sub);

  return () => {
    channel!.subscribers.delete(sub);
    if (channel!.subscribers.size === 0) {
      map.delete(campaignId);
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
