import Redis from "ioredis";
import { reportError } from "@/lib/monitoring/report";

const globalForRedis = globalThis as typeof globalThis & {
  __campaignRedis?: Redis;
  __campaignRedisSub?: Redis;
};

export function getRedisUrl(): string {
  return process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";
}

export function requireRedisUrlInProduction(): void {
  if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL?.trim()) {
    throw new Error(
      "REDIS_URL is required in production for campaign live sync",
    );
  }
}

export function getRedis(): Redis {
  if (!globalForRedis.__campaignRedis) {
    const client = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times) {
        return Math.min(times * 200, 5000);
      },
    });
    client.on("error", (err) => {
      console.error("[redis] command client:", err.message);
      reportError(err, { source: "redis", dedupeKey: "redis:command" });
    });
    globalForRedis.__campaignRedis = client;
    void client.connect().catch((err) => {
      console.error("[redis] connect failed:", err.message);
      reportError(err, { source: "redis", dedupeKey: "redis:connect" });
    });
  }
  return globalForRedis.__campaignRedis;
}

/** Dedicated subscriber connection (ioredis cannot mix sub + commands). */
export function getRedisSubscriber(): Redis {
  if (!globalForRedis.__campaignRedisSub) {
    const client = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times) {
        return Math.min(times * 200, 5000);
      },
    });
    client.on("error", (err) => {
      console.error("[redis] subscriber:", err.message);
      reportError(err, { source: "redis", dedupeKey: "redis:subscriber" });
    });
    globalForRedis.__campaignRedisSub = client;
    void client.connect().catch((err) => {
      console.error("[redis] subscriber connect failed:", err.message);
      reportError(err, {
        source: "redis",
        dedupeKey: "redis:subscriber-connect",
      });
    });
  }
  return globalForRedis.__campaignRedisSub;
}

/** Disconnect both campaign Redis clients. Safe to call when they were never opened. */
export function closeCampaignRedis(): Promise<void> {
  for (const client of [
    globalForRedis.__campaignRedis,
    globalForRedis.__campaignRedisSub,
  ]) {
    client?.disconnect();
  }
  return Promise.resolve();
}

export function campaignChannel(campaignId: string): string {
  return `campaign:${campaignId}`;
}

export function campaignOnlineKey(campaignId: string): string {
  return `campaign:${campaignId}:online`;
}

export function campaignMetaKey(campaignId: string): string {
  return `campaign:${campaignId}:meta`;
}

export function campaignTokensKey(campaignId: string): string {
  return `campaign:${campaignId}:tokens`;
}
