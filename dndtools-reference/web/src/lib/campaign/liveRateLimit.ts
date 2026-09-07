/**
 * Sliding-window rate limiter for high-frequency live messages (token moves).
 * Pure helpers so unit tests do not need Redis or timers.
 */

export type RateLimitState = {
  /** Timestamps of accepted events (ms). */
  stamps: number[];
};

export function createRateLimitState(): RateLimitState {
  return { stamps: [] };
}

/**
 * Returns true when the event is allowed. Mutates state on accept.
 * @param maxPerWindow max events in the window
 * @param windowMs window length in ms (default 1000 for ~15 Hz => 15)
 */
export function acceptRateLimited(
  state: RateLimitState,
  nowMs: number,
  maxPerWindow: number,
  windowMs: number,
): boolean {
  const cutoff = nowMs - windowMs;
  state.stamps = state.stamps.filter((t) => t > cutoff);
  if (state.stamps.length >= maxPerWindow) return false;
  state.stamps.push(nowMs);
  return true;
}

/** Default: 15 token-move publishes per second per token. */
export const TOKEN_MOVE_MAX_PER_SEC = 15;
export const TOKEN_MOVE_WINDOW_MS = 1000;

export function acceptTokenMoveRate(
  state: RateLimitState,
  nowMs: number = Date.now(),
): boolean {
  return acceptRateLimited(
    state,
    nowMs,
    TOKEN_MOVE_MAX_PER_SEC,
    TOKEN_MOVE_WINDOW_MS,
  );
}
