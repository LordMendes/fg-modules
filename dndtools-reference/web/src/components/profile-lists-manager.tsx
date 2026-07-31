"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createList, deleteList, renameList, type ListSummary } from "@/actions/lists";

export function ProfileListsManager({ initialLists }: { initialLists: ListSummary[] }) {
  const router = useRouter();
  const [lists, setLists] = useState(initialLists);
  const [newListName, setNewListName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createList(newListName);
      if (!result.success || !result.list) {
        setError(result.error ?? "Could not create list");
        return;
      }
      setLists((prev) => [result.list!, ...prev]);
      setNewListName("");
    });
  }

  function startRename(list: ListSummary) {
    setEditingId(list.id);
    setEditingName(list.name);
    setError(null);
  }

  function cancelRename() {
    setEditingId(null);
    setEditingName("");
  }

  function submitRename(listId: string) {
    startTransition(async () => {
      const result = await renameList(listId, editingName);
      if (!result.success) {
        setError(result.error ?? "Could not rename list");
        return;
      }
      setLists((prev) =>
        prev.map((list) => (list.id === listId ? { ...list, name: editingName.trim() } : list)),
      );
      cancelRename();
      router.refresh();
    });
  }

  function handleDelete(listId: string) {
    if (!window.confirm("Delete this list and all saved items?")) return;
    startTransition(async () => {
      const result = await deleteList(listId);
      if (!result.success) {
        setError(result.error ?? "Could not delete list");
        return;
      }
      setLists((prev) => prev.filter((list) => list.id !== listId));
      router.refresh();
    });
  }

  return (
    <section className="profile-lists">
      <form className="profile-create-list" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New list name (e.g. PC 1)"
          value={newListName}
          onChange={(event) => setNewListName(event.target.value)}
          maxLength={64}
          required
        />
        <button type="submit" className="btn-primary" disabled={pending}>
          Create list
        </button>
      </form>

      {error && <p className="profile-error">{error}</p>}

      {lists.length === 0 ? (
        <p className="profile-empty">No lists yet. Create one to start saving spells, feats, and more.</p>
      ) : (
        <ul className="profile-list-cards">
          {lists.map((list) => (
            <li key={list.id} className="profile-list-card">
              {editingId === list.id ? (
                <form
                  className="profile-rename-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitRename(list.id);
                  }}
                >
                  <input
                    type="text"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    maxLength={64}
                    required
                  />
                  <button type="submit" className="btn-secondary" disabled={pending}>
                    Save
                  </button>
                  <button type="button" className="btn-secondary" onClick={cancelRename}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div className="profile-list-card-main">
                    <Link href={`/profile/lists/${list.id}`} className="profile-list-link">
                      <h2>{list.name}</h2>
                      <p>{list.itemCount} saved {list.itemCount === 1 ? "item" : "items"}</p>
                    </Link>
                  </div>
                  <div className="profile-list-card-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => startRename(list)}
                      disabled={pending}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="btn-secondary profile-delete-btn"
                      onClick={() => handleDelete(list.id)}
                      disabled={pending}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
