import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkReadiness } from "@/lib/server/readiness";

export const dynamic = "force-dynamic";

/** Under the 2 s readiness budget that load balancers and uptime checks use. */
const READY_TIMEOUT_MS = 2_000;
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Readiness: the app can reach Postgres right now. Use this for alerts and
 * traffic gating. `/health` stays a pure liveness check, so a database blip
 * does not make the orchestrator restart a healthy process.
 */
export async function GET() {
  const result = await checkReadiness(
    () => prisma.$queryRaw`SELECT 1`,
    READY_TIMEOUT_MS,
  );
  if (result.ready) {
    return NextResponse.json({ status: "ready" }, { status: 200, headers: NO_STORE });
  }
  return NextResponse.json(
    { status: "unavailable" },
    { status: 503, headers: NO_STORE },
  );
}
