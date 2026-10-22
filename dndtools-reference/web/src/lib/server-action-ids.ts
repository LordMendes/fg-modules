import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Next.js 16.2 answers an unknown server action with text/plain, then the page
 * renderer throws "Expected RSC response, got text/plain" on RSC requests.
 * Rejecting unknown ids here returns the 404 the client already reloads on.
 */
const ACTION_NOT_FOUND_HEADER = "x-nextjs-action-not-found";

type ActionManifest = {
  node?: Record<string, unknown>;
};

type ActionIdCache = {
  file: string;
  mtimeMs: number;
  ids: Set<string> | null;
};

let cache: ActionIdCache | null = null;

function manifestCandidates(): string[] {
  if (process.env.NODE_ENV === "development") {
    return [
      path.join(process.cwd(), ".next/dev/server/server-reference-manifest.json"),
      path.join(process.cwd(), ".next/server/server-reference-manifest.json"),
    ];
  }
  return [
    path.join(process.cwd(), ".next/server/server-reference-manifest.json"),
    path.join(process.cwd(), "web/.next/server/server-reference-manifest.json"),
  ];
}

export function actionIdsFromManifest(raw: string): Set<string> | null {
  let parsed: ActionManifest;
  try {
    parsed = JSON.parse(raw) as ActionManifest;
  } catch {
    return null;
  }
  const ids = new Set(Object.keys(parsed.node ?? {}));
  return ids.size > 0 ? ids : null;
}

function loadActionIds(): Set<string> | null {
  const file = manifestCandidates().find((candidate) => existsSync(candidate));
  if (!file) return null;

  let mtimeMs: number;
  try {
    mtimeMs = statSync(file).mtimeMs;
  } catch {
    return null;
  }
  if (cache && cache.file === file && cache.mtimeMs === mtimeMs) {
    return cache.ids;
  }

  let ids: Set<string> | null = null;
  try {
    ids = actionIdsFromManifest(readFileSync(file, "utf8"));
  } catch {
    ids = null;
  }
  cache = { file, mtimeMs, ids };
  return ids;
}

/** True only when the manifest loaded and does not contain this action id. */
export function isUnknownServerAction(actionId: string): boolean {
  const ids = loadActionIds();
  if (!ids) return false;
  return !ids.has(actionId);
}

export function unknownServerActionResponse(actionId: string): Response | null {
  if (!isUnknownServerAction(actionId)) return null;
  return new Response("Server action not found.", {
    status: 404,
    headers: {
      "content-type": "text/plain",
      [ACTION_NOT_FOUND_HEADER]: "1",
    },
  });
}
