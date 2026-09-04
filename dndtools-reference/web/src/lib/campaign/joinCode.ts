import { randomBytes } from "crypto";

/** Alphabet without ambiguous characters (0/O, 1/I/L). */
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const JOIN_CODE_LENGTH = 8;

export function generateJoinCode(): string {
  const bytes = randomBytes(JOIN_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[bytes[i]! % JOIN_CODE_ALPHABET.length];
  }
  return code;
}

export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidJoinCode(code: string): boolean {
  const normalized = normalizeJoinCode(code);
  if (normalized.length !== JOIN_CODE_LENGTH) return false;
  return [...normalized].every((ch) => JOIN_CODE_ALPHABET.includes(ch));
}
