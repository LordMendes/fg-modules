"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useSessionNonce } from "@/components/session-provider";
import { searchEntities } from "@/actions/data";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const nonce = useSessionNonce();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.length < 2) return;
    startTransition(async () => {
      const result = await searchEntities({ query, nonce });
      if (result.success) {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <Search className="search-icon h-4 w-4" />
      <input
        type="search"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
        disabled={isPending}
      />
    </form>
  );
}
