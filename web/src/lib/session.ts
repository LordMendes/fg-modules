import { cookies } from "next/headers";
import { randomBytes, createHmac } from "crypto";

const COOKIE_NAME = "dnd_session";
const MAX_AGE = 60 * 60 * 24;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "change-me-to-a-random-32-byte-secret") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production");
    }
    return "dev-secret-not-for-production";
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export type SessionData = {
  nonce: string;
  createdAt: number;
};

export async function getOrCreateSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;

  if (existing) {
    const [payload, sig] = existing.split(".");
    if (payload && sig && sign(payload) === sig) {
      try {
        return JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionData;
      } catch {
        // fall through
      }
    }
  }

  const session: SessionData = {
    nonce: randomBytes(16).toString("hex"),
    createdAt: Date.now(),
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const token = `${payload}.${sign(payload)}`;

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });

  return session;
}

export async function validateSessionNonce(nonce: string | undefined): Promise<boolean> {
  if (!nonce) return false;
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (!existing) return false;

  const [payload, sig] = existing.split(".");
  if (!payload || !sig || sign(payload) !== sig) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionData;
    return session.nonce === nonce;
  } catch {
    return false;
  }
}
