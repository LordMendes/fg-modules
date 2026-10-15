import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { poolConfigFromEnv } from "@/lib/prisma-config";

export {
  COMBAT_TX_OPTIONS,
  isBusyDatabaseError,
  isUnavailableDatabaseError,
} from "@/lib/prisma-config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPool(): Pool {
  const pool = new Pool(poolConfigFromEnv());
  // The adapter attaches its own idle-client listener, but it only forwards
  // errors when `onPoolError` is set, so they would otherwise disappear.
  pool.on("error", (err) => {
    console.error("[db] idle client error", err.message);
  });
  return pool;
}

function createPrismaClient(): PrismaClient {
  // Cache the pool in every environment. Production used to build a new pool
  // on every client rebuild, which leaked connections.
  const pool = globalForPrisma.pool ?? createPool();
  globalForPrisma.pool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

/** Delegates that must exist after schema changes (dev hot reload can cache stale clients). */
const REQUIRED_DELEGATES = [
  "savedList",
  "pcPlan",
  "campaign",
  "campaignMember",
  "campaignPc",
  "campaignRoll",
  "campaignActivity",
  "campaignMap",
  "campaignCombat",
  "campaignCombatant",
  "campaignCombatEffect",
  "campaignCombatEvent",
  "campaignCombatRollRequest",
  "campaignNpc",
  "campaignEncounter",
  "campaignEncounterEntry",
] as const;

function isPrismaClientReady(client: PrismaClient): boolean {
  return REQUIRED_DELEGATES.every((key) => key in client);
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientReady(cached)) {
    return cached;
  }
  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

/** Close the Prisma client and the pg pool. Used by graceful shutdown. */
export async function disconnectPrisma(): Promise<void> {
  const client = globalForPrisma.prisma;
  const pool = globalForPrisma.pool;
  if (client) await client.$disconnect();
  if (pool) await pool.end();
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
