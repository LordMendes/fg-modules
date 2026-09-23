import { randomBytes } from "crypto";

/** Alphabet without ambiguous characters (0/O, 1/I/L). */
const SHARE_TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHARE_TOKEN_LENGTH = 16;

export function generateShareToken(): string {
  const bytes = randomBytes(SHARE_TOKEN_LENGTH);
  let token = "";
  for (let i = 0; i < SHARE_TOKEN_LENGTH; i++) {
    token += SHARE_TOKEN_ALPHABET[bytes[i]! % SHARE_TOKEN_ALPHABET.length];
  }
  return token;
}

export function normalizeShareToken(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidShareToken(token: string): boolean {
  const normalized = normalizeShareToken(token);
  if (normalized.length !== SHARE_TOKEN_LENGTH) return false;
  return [...normalized].every((ch) => SHARE_TOKEN_ALPHABET.includes(ch));
}

export function buildPcPlanSharePath(token: string): string {
  return `/tools/pc-planner?share=${encodeURIComponent(token)}`;
}
