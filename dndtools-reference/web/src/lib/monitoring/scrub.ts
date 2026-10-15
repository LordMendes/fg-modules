type ExceptionValue = { type?: string; value?: string };

type ScrubbableEvent = {
  request?: {
    cookies?: unknown;
    headers?: Record<string, string>;
    data?: unknown;
    query_string?: unknown;
  };
  user?: Record<string, unknown> & { id?: string };
  exception?: {
    values?: ExceptionValue[];
  };
};

function errorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    return String((error as { name: unknown }).name);
  }
  return "";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

export function isNoiseError(error: unknown): boolean {
  const name = errorName(error);
  if (name === "UnrecognizedActionError" || name === "AbortError") {
    return true;
  }
  const message = errorMessage(error);
  if (!message) {
    return false;
  }
  if (message === "Forbidden" || message === "Unauthorized") {
    return true;
  }
  if (message.includes("was not found on the server")) {
    return true;
  }
  if (message.includes("ResizeObserver loop")) {
    return true;
  }
  if (message.includes("The user aborted a request")) {
    return true;
  }
  return false;
}

function isNoiseException(entry: ExceptionValue): boolean {
  if (entry.type === "UnrecognizedActionError" || entry.type === "AbortError") {
    return true;
  }
  const synthetic = Object.assign(new Error(entry.value ?? ""), {
    name: entry.type ?? "Error",
  });
  return isNoiseError(synthetic);
}

function scrubRequestHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) {
    return headers;
  }
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    // x-session-nonce mirrors SESSION_NONCE_HEADER in src/lib/session.ts. It is
    // hardcoded here so this module stays free of server-only imports.
    if (
      lower === "authorization" ||
      lower === "cookie" ||
      lower === "set-cookie" ||
      lower === "x-session-nonce"
    ) {
      continue;
    }
    next[key] = value;
  }
  return next;
}

function scrubUser(
  user: ScrubbableEvent["user"],
): ScrubbableEvent["user"] | undefined {
  if (!user) {
    return user;
  }
  if (user.id === undefined) {
    return undefined;
  }
  return { id: user.id };
}

export function scrubEvent<T>(event: T): T | null {
  const e = event as ScrubbableEvent;
  const values = e.exception?.values;
  if (values) {
    for (const entry of values) {
      if (isNoiseException(entry)) {
        return null;
      }
    }
  }

  if (e.request) {
    delete e.request.cookies;
    delete e.request.data;
    delete e.request.query_string;
    e.request.headers = scrubRequestHeaders(e.request.headers);
  }

  if (e.user) {
    e.user = scrubUser(e.user);
  }

  return event;
}
