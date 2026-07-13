"use server";

import { headers } from "next/headers";
import { listEntities, searchAll } from "@/lib/entities";
import { validateSessionNonce } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import type { CategoryKey } from "@/lib/categories";
import { isCategoryKey } from "@/lib/categories";

export type PaginateInput = {
  category: string;
  nonce: string;
  cursor?: string;
  search?: string;
  sourceAbbrev?: string;
  edition?: string;
  filter?: string;
};

export type PaginateResult = {
  success: boolean;
  error?: string;
  items?: Awaited<ReturnType<typeof listEntities>>["items"];
  nextCursor?: string | null;
};

export async function paginateEntities(input: PaginateInput): Promise<PaginateResult> {
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const rl = rateLimit(`paginate:${ip}`, 60, 60_000);
  if (!rl.success) return { success: false, error: "Rate limit exceeded" };

  if (!(await validateSessionNonce(input.nonce))) {
    return { success: false, error: "Invalid session" };
  }

  if (!isCategoryKey(input.category)) {
    return { success: false, error: "Invalid category" };
  }

  const result = await listEntities(input.category as CategoryKey, {
    cursor: input.cursor,
    search: input.search,
    sourceAbbrev: input.sourceAbbrev,
    edition: input.edition,
    filter: input.filter,
  });

  return { success: true, items: result.items, nextCursor: result.nextCursor };
}

export type SearchInput = {
  query: string;
  nonce: string;
};

export type SearchResult = {
  success: boolean;
  error?: string;
  results?: Awaited<ReturnType<typeof searchAll>>;
};

export async function searchEntities(input: SearchInput): Promise<SearchResult> {
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const rl = rateLimit(`search:${ip}`, 10, 60_000);
  if (!rl.success) return { success: false, error: "Rate limit exceeded" };

  if (!(await validateSessionNonce(input.nonce))) {
    return { success: false, error: "Invalid session" };
  }

  if (!input.query || input.query.length < 2) {
    return { success: true, results: [] };
  }

  const results = await searchAll(input.query, 30);
  return { success: true, results };
}
