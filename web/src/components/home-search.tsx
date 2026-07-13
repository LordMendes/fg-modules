"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { useSessionNonce } from "@/components/session-provider";
import { searchEntities } from "@/actions/data";
import { getCategoryLabel, isCategoryKey } from "@/lib/categories";

type SearchHit = {
  category: string;
  slug: string;
  name: string;
  snippet: string | null;
};

const DEBOUNCE_MS = 250;

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
  const nonce = useSessionNonce();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const timer = window.setTimeout(() => {
      const id = ++requestId.current;
      startTransition(async () => {
        const result = await searchEntities({ query: trimmed, nonce });
        if (id !== requestId.current) return;
        if (!result.success) {
          setResults([]);
          setOpen(false);
          return;
        }
        const hits = result.results ?? [];
        setResults(hits);
        setOpen(hits.length > 0);
        setActiveIndex(-1);
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, nonce]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function goToSearchPage(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      const hit = results[activeIndex];
      router.push(`/${hit.category}/${hit.slug}`);
      return;
    }
    goToSearchPage(query);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className={`home-search${open ? " is-open" : ""}`} ref={rootRef}>
      <form onSubmit={handleSubmit} className="home-search-form" role="search">
        <Search className="home-search-icon h-5 w-5" aria-hidden />
        <input
          type="search"
          role="combobox"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search spells, feats, monsters, classes…"
          aria-label="Search the archives"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          className="home-search-input"
          autoComplete="off"
        />
        <button type="submit" className="home-search-submit" disabled={isPending}>
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>

      {open && results.length > 0 ? (
        <ul id={listId} className="home-search-results" role="listbox">
          {results.map((hit, index) => {
            const label = isCategoryKey(hit.category)
              ? getCategoryLabel(hit.category)
              : hit.category;
            const active = index === activeIndex;
            return (
              <li key={`${hit.category}-${hit.slug}`} role="presentation">
                <Link
                  id={`${listId}-option-${index}`}
                  href={`/${hit.category}/${hit.slug}`}
                  className={`home-search-result${active ? " is-active" : ""}`}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => setOpen(false)}
                >
                  <span className="home-search-result-category">{label}</span>
                  <span className="home-search-result-name">{hit.name}</span>
                  {hit.snippet ? (
                    <span className="home-search-result-snippet">{hit.snippet}…</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
          <li className="home-search-footer" role="presentation">
            <button
              type="button"
              onClick={() => goToSearchPage(query)}
              className="home-search-all"
            >
              View all results for &ldquo;{query.trim()}&rdquo;
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
