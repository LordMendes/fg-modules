import Redis from "ioredis";
import { reportError } from "@/lib/monitoring/report";
import { createLogThrottle } from "@/lib/server/log-throttle";

const globalForRedis = globalThis as typeof globalThis & {
  __campaignRedis?: Redis;
  __campaignRedisSub?: Redis;
};

/** ioredis emits an error on every reconnect attempt. One line per window is enough. */
const REDIS_LOG_WINDOW_MS = 30_000;
const redisLogThrottle = createLogThrottle(REDIS_LOG_WINDOW_MS);

function logRedisError(label: string, message: string): void {
  if (redisLogThrottle.shouldLog(`${label}:${message}`)) {
    console.error(`[redis] ${label}:`, message);
  }
}

export function getRedisUrl(): string {
  return process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";
}

/**
 * Warns when production has no REDIS_URL. Throwing here would take the whole
 * site down over one optional feature, so the site keeps serving and live
 * sync reports its own errors.
 */
export function warnIfRedisUrlMissingInProduction(): void {
  if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL?.trim()) {
    console.warn(
      "[redis] REDIS_URL is not set. Campaign live sync will fail until it is configured.",
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
      logRedisError("command client", err.message);
      reportError(err, { source: "redis", dedupeKey: "redis:command" });
    });
    globalForRedis.__campaignRedis = client;
    void client.connect().catch((err) => {
      logRedisError("connect failed", err.message);
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
      logRedisError("subscriber", err.message);
      reportError(err, { source: "redis", dedupeKey: "redis:subscriber" });
    });
    globalForRedis.__campaignRedisSub = client;
    void client.connect().catch((err) => {
      logRedisError("subscriber connect failed", err.message);
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
