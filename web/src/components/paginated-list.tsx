"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { EntityTable } from "@/components/entity-table";
import { paginateEntities } from "@/actions/data";
import { useSessionNonce } from "@/components/session-provider";
import type { EntityListItem } from "@/lib/entities";
import type { CategoryKey } from "@/lib/categories";
import type { TableSort } from "@/lib/table-sort";

export function PaginatedEntityList({
  category,
  initialItems,
  initialCursor,
  search,
  description,
  sources,
  editions,
  fields,
  sort,
}: {
  category: CategoryKey;
  initialItems: EntityListItem[];
  initialCursor: string | null;
  search?: string;
  description?: string;
  sources?: string[];
  editions?: string[];
  fields?: Record<string, string[]>;
  sort?: TableSort | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nonce = useSessionNonce();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;

    startTransition(async () => {
      try {
        const result = await paginateEntities({
          category,
          nonce,
          cursor,
          search,
          description,
          sources,
          editions,
          fields,
          sort,
        });
        if (!result.success) {
          setError(result.error ?? "Failed to load");
          return;
        }
        setItems((prev) => [...prev, ...(result.items ?? [])]);
        setCursor(result.nextCursor ?? null);
      } finally {
        loadingRef.current = false;
      }
    });
  }, [category, nonce, cursor, search, description, sources, editions, fields, sort]);

  useEffect(() => {
    if (!cursor) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "240px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  return (
    <div className="min-w-0">
      <EntityTable category={category} items={items} sort={sort ?? null} />
      {error && <p className="error-text">{error}</p>}
      {cursor && (
        <div ref={sentinelRef} className="infinite-scroll-sentinel">
          {isPending && <p className="infinite-scroll-status">Loading more…</p>}
        </div>
      )}
    </div>
  );
}
