"use client";

import { useState, useTransition } from "react";
import { EntityTable } from "@/components/entity-table";
import { paginateEntities } from "@/actions/data";
import { useSessionNonce } from "@/components/session-provider";
import type { EntityListItem } from "@/lib/entities";
import type { CategoryKey } from "@/lib/categories";

export function PaginatedEntityList({
  category,
  initialItems,
  initialCursor,
  sourceAbbrev,
  edition,
}: {
  category: CategoryKey;
  initialItems: EntityListItem[];
  initialCursor: string | null;
  sourceAbbrev?: string;
  edition?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nonce = useSessionNonce();

  function loadMore() {
    if (!cursor || isPending) return;
    startTransition(async () => {
      const result = await paginateEntities({
        category,
        nonce,
        cursor,
        sourceAbbrev,
        edition,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to load");
        return;
      }
      setItems((prev) => [...prev, ...(result.items ?? [])]);
      setCursor(result.nextCursor ?? null);
    });
  }

  return (
    <div>
      <EntityTable category={category} items={items} />
      {error && <p className="error-text">{error}</p>}
      {cursor && (
        <div className="load-more-wrap">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="btn-secondary"
          >
            {isPending ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
