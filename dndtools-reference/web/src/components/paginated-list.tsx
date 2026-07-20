"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { EntityTable } from "@/components/entity-table";
import { paginateEntities } from "@/actions/data";
import { useSessionNonce } from "@/components/session-provider";
import type { EntityListItem } from "@/lib/entities";
import type { CategoryKey } from "@/lib/categories";
import { getCategoryLabel } from "@/lib/categories";
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
  const [statusMessage, setStatusMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const nonce = useSessionNonce();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setStatusMessage("Loading more…");

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
          setStatusMessage("");
          return;
        }
        const nextItems = result.items ?? [];
        setItems((prev) => [...prev, ...nextItems]);
        setCursor(result.nextCursor ?? null);
        const label = getCategoryLabel(category).toLowerCase();
        setStatusMessage(
          nextItems.length > 0
            ? `Loaded ${nextItems.length} more ${label}`
            : "No more results",
        );
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
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>
      {cursor && (
        <div ref={sentinelRef} className="infinite-scroll-sentinel">
          {isPending && (
            <p className="infinite-scroll-status" aria-hidden="true">
              Loading more…
            </p>
          )}
          {!isPending && (
            <button type="button" className="btn-secondary load-more-btn" onClick={loadMore}>
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
