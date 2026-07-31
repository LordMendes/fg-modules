export type ValidationResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Email is required" };
  if (!EMAIL_RE.test(trimmed)) return { ok: false, error: "Invalid email address" };
  return { ok: true };
}

export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim();
  if (!trimmed) return { ok: false, error: "Username is required" };
  if (!USERNAME_RE.test(trimmed)) {
    return {
      ok: false,
      error: "Username must be 3–32 characters (letters, numbers, underscore)",
    };
  }
  return { ok: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { ok: false, error: "Password is required" };
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }
  return { ok: true };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim();
}

export function normalizeLoginIdentifier(identifier: string): string {
  return identifier.trim();
}
