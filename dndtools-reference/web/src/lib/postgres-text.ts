/** Postgres UTF-8 rejects U+0000 in text and jsonb columns. */
export function stripPostgresNulls<T>(value: T): T {
  if (typeof value === "string") {
    if (!value.includes("\u0000")) return value;
    return value.replace(/\u0000/g, "") as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripPostgresNulls(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    if (value instanceof Date) return value;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = stripPostgresNulls(child);
    }
    return out as T;
  }
  return value;
}
