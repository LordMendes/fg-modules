/**
 * Mark a campaign roll id as seen. Returns false if it was already processed.
 * Used so action result and SSE share one ingest path.
 */
export function markSeenRollId(
  seen: Set<string>,
  id: string,
  maxSize = 80,
): boolean {
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > maxSize) {
    const first = seen.values().next().value;
    if (first) seen.delete(first);
  }
  return true;
}
