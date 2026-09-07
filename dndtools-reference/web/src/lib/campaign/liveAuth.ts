import { createHash } from "crypto";
import { AUTH_COOKIE_NAME, type AuthUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Parse a Cookie header value into a map. */
export function parseCookieHeader(
  header: string | undefined,
): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

/**
 * Resolve the current user from a raw Cookie header (WebSocket upgrade).
 * Does not use next/headers cookies().
 */
export async function getUserFromCookieHeader(
  cookieHeader: string | undefined,
): Promise<AuthUser | null> {
  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

export type CampaignSocketAuth = {
  userId: string;
  username: string;
  campaignId: string;
  role: "dm" | "player";
  dmUserId: string;
};

export async function authorizeCampaignSocket(
  cookieHeader: string | undefined,
  campaignId: string,
): Promise<CampaignSocketAuth | null> {
  const user = await getUserFromCookieHeader(cookieHeader);
  if (!user) return null;

  const member = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: user.id } },
    include: {
      campaign: { select: { dmUserId: true } },
    },
  });
  if (!member || member.status !== "active") return null;

  return {
    userId: user.id,
    username: user.username,
    campaignId,
    role: member.role === "dm" ? "dm" : "player",
    dmUserId: member.campaign.dmUserId,
  };
}
