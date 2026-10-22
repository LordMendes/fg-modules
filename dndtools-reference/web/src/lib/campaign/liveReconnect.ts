/**
 * Reconnect policy for the live socket. Pure, so it can be tested without a
 * browser. Delays use "equal jitter": half of the backoff is fixed and half is
 * random, so a server restart does not make every client reconnect in the
 * same instant.
 */
export const RECONNECT_BASE_MS = 500;
export const RECONNECT_MAX_MS = 10_000;

/**
 * Consecutive failed attempts before a socket that has never opened is
 * abandoned. An unauthorized connection (401) fails the same way every time,
 * so retrying it forever only adds load.
 */
export const MAX_FAILURES_BEFORE_FIRST_OPEN = 6;

export function reconnectDelayMs(
  attempt: number,
  random: () => number = Math.random,
): number {
  const ceiling = Math.min(
    RECONNECT_MAX_MS,
    RECONNECT_BASE_MS * 2 ** Math.max(0, attempt),
  );
  const half = ceiling / 2;
  return Math.round(half + random() * half);
}

/** True when a socket that never opened has failed enough times to stop. */
export function shouldGiveUpBeforeFirstOpen(failedAttempts: number): boolean {
  return failedAttempts >= MAX_FAILURES_BEFORE_FIRST_OPEN;
}
