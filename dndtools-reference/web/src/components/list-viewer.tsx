"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { fetchEntityPreview } from "@/actions/data";
import { removeListItem, type SavedListItemView } from "@/actions/lists";
import { EntityPreviewModal } from "@/components/entity-preview-modal";
import { useSessionNonce } from "@/components/session-provider";
import { CATEGORIES } from "@/lib/categories";
import type { EntityPreview } from "@/lib/entities";

export function ListViewer({
  listId,
  listName,
  initialItems,
}: {
  listId: string;
  listName: string;
  initialItems: SavedListItemView[];
}) {
  const nonce = useSessionNonce();
  const [items, setItems] = useState(initialItems);
  const [preview, setPreview] = useState<EntityPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, SavedListItemView[]>();
    for (const item of items) {
      const group = map.get(item.category) ?? [];
      group.push(item);
      map.set(item.category, group);
    }

    return CATEGORIES.map((category) => ({
      key: category.key,
      label: category.label,
      items: map.get(category.key) ?? [],
    })).filter((section) => section.items.length > 0);
  }, [items]);

  const openPreview = useCallback(
    async (item: SavedListItemView) => {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(true);

      const result = await fetchEntityPreview({
        category: item.category,
        slug: item.entitySlug,
        nonce,
      });

      setPreviewLoading(false);
      if (!result.success || !result.entity) {
        setPreviewError(result.error ?? "Could not load entry");
        return;
      }
      setPreview(result.entity);
    },
    [nonce],
  );

  async function handleRemove(itemId: string) {
    setRemovingId(itemId);
    const result = await removeListItem(listId, itemId);
    setRemovingId(null);
    if (result.success) {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    }
  }

  return (
    <>
      <header className="page-header list-viewer-header">
        <p className="list-viewer-back">
          <Link href="/profile">← Back to profile</Link>
        </p>
        <h1>{listName}</h1>
        <p>
          {items.length} saved {items.length === 1 ? "item" : "items"}
        </p>
      </header>

      {items.length === 0 ? (
        <p className="profile-empty">
          This list is empty. Browse the site and use <strong>Save to list</strong> on any entry.
        </p>
      ) : (
        grouped.map((section) => (
          <section key={section.key} className="list-viewer-section">
            <h2>{section.label}</h2>
            <div className="table-wrap">
              <table className="entity-table list-viewer-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          type="button"
                          className="entity-link list-viewer-item-btn"
                          onClick={() => void openPreview(item)}
                        >
                          {item.entityName}
                        </button>
                      </td>
                      <td className="list-viewer-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => void openPreview(item)}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          className="btn-secondary profile-delete-btn"
                          disabled={removingId === item.id}
                          onClick={() => void handleRemove(item.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {(previewLoading || preview || previewError) && (
        <EntityPreviewModal
          entity={preview}
          loading={previewLoading}
          error={previewError}
          onClose={() => {
            setPreview(null);
            setPreviewError(null);
            setPreviewLoading(false);
          }}
        />
      )}
    </>
  );
}
