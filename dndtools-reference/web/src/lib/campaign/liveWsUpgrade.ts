/**
 * Helpers for the raw HTTP upgrade socket before `ws` takes ownership of it.
 *
 * Node only attaches error handling for upgraded sockets once `ws` runs
 * `handleUpgrade`. While we await auth, an error on the socket (client reset,
 * write to a dead peer) would otherwise be an uncaught exception.
 */

type ErrorListener = (err: Error) => void;

/** Structural subset of `stream.Duplex` used for upgrade sockets. */
export type UpgradeSocket = {
  on(event: "error", listener: ErrorListener): unknown;
  removeListener(event: "error", listener: ErrorListener): unknown;
  destroy(): unknown;
};

/** Structural subset used when rejecting an upgrade with a raw HTTP status line. */
export type RejectableUpgradeSocket = {
  on(event: "error", listener: ErrorListener): unknown;
  write(chunk: string): unknown;
  destroy(): unknown;
};

/**
 * Attach a temporary error listener. Any error destroys the socket and calls
 * `onError`. The returned function removes the listener and is idempotent.
 */
export function guardUpgradeSocket(
  socket: UpgradeSocket,
  onError: (err: Error) => void,
): () => void {
  let attached = true;
  const listener: ErrorListener = (err) => {
    onError(err);
    socket.destroy();
  };
  socket.on("error", listener);
  return () => {
    if (!attached) return;
    attached = false;
    socket.removeListener("error", listener);
  };
}

/**
 * Write a plain HTTP status line and close. A late write error (peer already
 * gone) is swallowed so it cannot become an uncaught exception.
 */
export function rejectUpgrade(socket: RejectableUpgradeSocket, statusLine: string): void {
  socket.on("error", () => {});
  try {
    socket.write(statusLine);
  } catch {
    // Peer already gone; nothing to report.
  }
  socket.destroy();
}
