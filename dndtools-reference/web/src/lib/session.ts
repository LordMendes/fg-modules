import { cookies } from "next/headers";
import { randomBytes, createHmac } from "crypto";

export const COOKIE_NAME = "dnd_session";
export const SESSION_NONCE_HEADER = "x-session-nonce";
const MAX_AGE = 60 * 60 * 24;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: MAX_AGE,
  path: "/",
};

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

export function createSession(): SessionData {
  return {
    nonce: randomBytes(16).toString("hex"),
    createdAt: Date.now(),
  };
}

export function buildSessionToken(session: SessionData): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token: string | undefined): SessionData | null {
  if (!token) return null;

  const [payload, sig] = token.split(".");
  if (!payload || !sig || sign(payload) !== sig) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionData;
  } catch {
    return null;
  }
}

/** Read session from cookies only (Server Components / Server Actions). */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
}

export async function validateSessionNonce(nonce: string | undefined): Promise<boolean> {
  if (!nonce) return false;
  const session = await getSession();
  return session?.nonce === nonce;
}
