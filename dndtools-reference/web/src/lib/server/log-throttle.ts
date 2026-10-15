/**
 * Lets a repeating error through once per window for each key. A dead
 * dependency can fail thousands of times a minute, and the first line is the
 * useful one. The key set is capped, so unique messages cannot grow memory.
 */
const MAX_TRACKED_KEYS = 200;

export type LogThrottle = {
  /** True when this key has not logged within the window. Records the time. */
  shouldLog(key: string): boolean;
};

export function createLogThrottle(
  windowMs: number,
  now: () => number = Date.now,
): LogThrottle {
  const lastLogged = new Map<string, number>();

  return {
    shouldLog(key) {
      const time = now();
      const last = lastLogged.get(key);
      if (last !== undefined && time - last < windowMs) {
        return false;
      }
      if (last === undefined && lastLogged.size >= MAX_TRACKED_KEYS) {
        lastLogged.clear();
      }
      lastLogged.set(key, time);
      return true;
    },
  };
}
