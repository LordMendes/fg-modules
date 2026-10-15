export type ReadinessResult =
  | { ready: true }
  | { ready: false; reason: "timeout" | "error" };

/**
 * Runs a cheap dependency probe and gives up after `timeoutMs`. A probe that
 * hangs (for example, a pool waiting on a dead connection) reports not ready
 * instead of holding the health request open.
 */
export async function checkReadiness(
  probe: () => Promise<unknown>,
  timeoutMs: number,
): Promise<ReadinessResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timedOut = new Promise<ReadinessResult>((resolve) => {
    timer = setTimeout(() => resolve({ ready: false, reason: "timeout" }), timeoutMs);
  });

  const probed: Promise<ReadinessResult> = Promise.resolve()
    .then(probe)
    .then(
      (): ReadinessResult => ({ ready: true }),
      (): ReadinessResult => ({ ready: false, reason: "error" }),
    );

  try {
    return await Promise.race([probed, timedOut]);
  } finally {
    clearTimeout(timer);
  }
}
