"use server";

import { headers } from "next/headers";
import {
  getClassSpellsAtLevel,
  getSpellPreview,
  listEntities,
  searchAll,
} from "@/lib/entities";
import { validateSessionNonce } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import type { CategoryKey } from "@/lib/categories";
import { isCategoryKey } from "@/lib/categories";

export type PaginateInput = {
  category: string;
  nonce: string;
  cursor?: string;
  search?: string;
  description?: string;
  sources?: string[];
  editions?: string[];
  fields?: Record<string, string[]>;
  /** @deprecated Prefer `sources`. */
  sourceAbbrev?: string;
  /** @deprecated Prefer `editions`. */
  edition?: string;
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
    description: input.description,
    sources: input.sources,
    editions: input.editions,
    fields: input.fields,
    sourceAbbrev: input.sourceAbbrev,
    edition: input.edition,
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
  const rl = rateLimit(`search:${ip}`, 60, 60_000);
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

export type ClassSpellsInput = {
  classSlug: string;
  level: number;
  nonce: string;
};

export type ClassSpellsResult = {
  success: boolean;
  error?: string;
  spells?: Awaited<ReturnType<typeof getClassSpellsAtLevel>>;
};

export async function fetchClassSpellsAtLevel(
  input: ClassSpellsInput,
): Promise<ClassSpellsResult> {
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const rl = rateLimit(`class-spells:${ip}`, 120, 60_000);
  if (!rl.success) return { success: false, error: "Rate limit exceeded" };

  if (!(await validateSessionNonce(input.nonce))) {
    return { success: false, error: "Invalid session" };
  }

  if (!Number.isInteger(input.level) || input.level < 0 || input.level > 9) {
    return { success: false, error: "Invalid spell level" };
  }

  const spells = await getClassSpellsAtLevel(input.classSlug, input.level);
  return { success: true, spells };
}

export type SpellPreviewInput = {
  spellSlug: string;
  nonce: string;
};

export type SpellPreviewResult = {
  success: boolean;
  error?: string;
  spell?: Awaited<ReturnType<typeof getSpellPreview>>;
};

export async function fetchSpellPreview(input: SpellPreviewInput): Promise<SpellPreviewResult> {
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const rl = rateLimit(`spell-preview:${ip}`, 120, 60_000);
  if (!rl.success) return { success: false, error: "Rate limit exceeded" };

  if (!(await validateSessionNonce(input.nonce))) {
    return { success: false, error: "Invalid session" };
  }

  const spell = await getSpellPreview(input.spellSlug);
  if (!spell) return { success: false, error: "Spell not found" };

  return { success: true, spell };
}
