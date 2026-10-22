/**
 * Ping/pong heartbeat for campaign sockets. A socket that did not answer the
 * previous ping is dead (a laptop slept, a NAT dropped the mapping, a proxy
 * half-closed), so it is terminated. Its close handler then removes presence.
 */
export const HEARTBEAT_INTERVAL_MS = 30_000;

const WS_OPEN_STATE = 1;

export type HeartbeatSocket = {
  readyState: number;
  ping(): void;
  terminate(): void;
};

/**
 * One heartbeat pass. A socket is alive when it answered since the last pass.
 * `alive` is cleared for each socket that is pinged, so a pong must arrive
 * before the next pass. `onAlive` runs for every socket that is still healthy
 * (used to refresh presence TTLs).
 */
export function sweepHeartbeat<T extends HeartbeatSocket>(
  clients: Iterable<T>,
  alive: WeakSet<T>,
  onAlive?: (client: T) => void,
): void {
  for (const client of clients) {
    if (client.readyState !== WS_OPEN_STATE) continue;
    if (!alive.has(client)) {
      client.terminate();
      continue;
    }
    alive.delete(client);
    client.ping();
    onAlive?.(client);
  }
}
