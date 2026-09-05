import { getCurrentUser } from "@/lib/auth/session";
import { subscribeCampaignLive } from "@/lib/campaign/liveHub";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** SSE hub for campaign roster, presence, rolls, activity, and pcUpdated. */
export async function GET(_request: Request, context: RouteContext) {
  const { id: campaignId } = await context.params;
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const member = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: user.id } },
  });
  if (!member || member.status !== "active") {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "ping" });

      cleanup = subscribeCampaignLive(campaignId, user.id, (event) => {
        try {
          send(event);
        } catch {
          // stream closed
        }
      });

      heartbeat = setInterval(() => {
        try {
          send({ type: "ping" });
        } catch {
          // ignore
        }
      }, 25000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
