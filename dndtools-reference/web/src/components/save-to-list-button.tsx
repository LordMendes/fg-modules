"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BookmarkPlus } from "lucide-react";
import { addListItem, createList, getUserLists, type ListSummary } from "@/actions/lists";
import { useAuthUser } from "@/components/auth-provider";
import type { CategoryKey } from "@/lib/categories";

type SaveTarget = {
  category: CategoryKey;
  slug: string;
  name: string;
};

export function SaveToListButton({
  category,
  slug,
  name,
  compact = false,
}: SaveTarget & { compact?: boolean }) {
  const user = useAuthUser();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const loadLists = useCallback(async () => {
    setLoadingLists(true);
    setError(null);
    try {
      const result = await getUserLists();
      setLists(result);
    } catch {
      setError("Could not load your lists");
    } finally {
      setLoadingLists(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    void loadLists();
  }, [open, user, loadLists]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function handleOpen() {
    if (!user) {
      const next = encodeURIComponent(pathname);
      router.push(`/login?next=${next}`);
      return;
    }
    setMessage(null);
    setError(null);
    setOpen((value) => !value);
  }

  function saveToList(listId: string) {
    startTransition(async () => {
      const result = await addListItem({
        listId,
        category,
        entitySlug: slug,
        entityName: name,
      });
      if (!result.success) {
        setError(result.error ?? "Could not save item");
        return;
      }
      setMessage(`Saved to list`);
      setError(null);
      await loadLists();
    });
  }

  function handleCreateList(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createList(newListName);
      if (!result.success || !result.list) {
        setError(result.error ?? "Could not create list");
        return;
      }
      setLists((prev) => [result.list!, ...prev]);
      setNewListName("");
      await addListItem({
        listId: result.list.id,
        category,
        entitySlug: slug,
        entityName: name,
      });
      setMessage(`Saved to ${result.list.name}`);
      setError(null);
    });
  }

  return (
    <div className={`save-to-list${compact ? " save-to-list-compact" : ""}`} ref={panelRef}>
      <button
        type="button"
        className={compact ? "save-to-list-icon-btn" : "btn-secondary save-to-list-btn"}
        onClick={handleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Save to list"
      >
        <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
        {!compact && <span>Save to list</span>}
        {compact && <span className="sr-only">Save to list</span>}
      </button>

      {open && user && (
        <div className="save-to-list-panel" role="dialog" aria-label="Save to list">
          <p className="save-to-list-title">Save “{name}”</p>
          {loadingLists && <p className="save-to-list-status">Loading lists…</p>}
          {error && <p className="save-to-list-error">{error}</p>}
          {message && <p className="save-to-list-success">{message}</p>}

          {lists.length > 0 && (
            <ul className="save-to-list-options">
              {lists.map((list) => (
                <li key={list.id}>
                  <button
                    type="button"
                    className="save-to-list-option"
                    disabled={pending}
                    onClick={() => saveToList(list.id)}
                  >
                    <span>{list.name}</span>
                    <span className="save-to-list-count">{list.itemCount}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loadingLists && lists.length === 0 && (
            <p className="save-to-list-status">No lists yet. Create one below.</p>
          )}

          <form className="save-to-list-create" onSubmit={handleCreateList}>
            <input
              type="text"
              placeholder="New list name"
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              maxLength={64}
              required
            />
            <button type="submit" className="btn-secondary" disabled={pending}>
              Create & save
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
