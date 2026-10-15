export function getDsn(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function getEnvironment(): string {
  const fromSentry = process.env.SENTRY_ENVIRONMENT?.trim();
  if (fromSentry) {
    return fromSentry;
  }
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  return "development";
}

export function getRelease(): string | undefined {
  const release = process.env.SENTRY_RELEASE?.trim();
  if (release) {
    return release;
  }
  const commit = process.env.SOURCE_COMMIT?.trim();
  if (commit) {
    return commit;
  }
  return undefined;
}

export function dsnIngestOrigin(dsn?: string): string | undefined {
  if (!dsn) {
    return undefined;
  }
  const trimmed = dsn.trim();
  if (trimmed === "") {
    return undefined;
  }
  try {
    const normalized = trimmed.replace(
      /^([a-z][a-z0-9+.-]*:\/\/)([^/@]+@)/i,
      "$1",
    );
    const url = new URL(normalized);
    if (!url.hostname) {
      return undefined;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return undefined;
  }
}
