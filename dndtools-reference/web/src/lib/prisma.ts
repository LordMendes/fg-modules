import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pool ?? new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }
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

export function isUnavailableDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  return (
    code === "P2021" ||
    code === "P2022" ||
    code === "P1001" ||
    code === "P1000" ||
    code === "P1003"
  );
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
