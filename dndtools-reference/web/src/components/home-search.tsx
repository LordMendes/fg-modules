"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
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

type HomeSearchProps = {
  variant?: "default" | "overlay";
  autoFocus?: boolean;
  inputId?: string;
  onNavigate?: () => void;
};

export function HomeSearch({
  variant = "default",
  autoFocus = false,
  inputId = "hero-search-input",
  onNavigate,
}: HomeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
  const nonce = useSessionNonce();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const requestId = useRef(0);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
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

  function navigateTo(path: string) {
    setOpen(false);
    onNavigate?.();
    router.push(path);
  }

  function goToSearchPage(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    navigateTo(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      const hit = results[activeIndex];
      navigateTo(`/${hit.category}/${hit.slug}`);
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
    <div
      className={`home-search home-search--${variant}${open ? " is-open" : ""}`}
      ref={rootRef}
    >
      <form onSubmit={handleSubmit} className="home-search-form" role="search">
        <Search className="home-search-icon h-5 w-5" aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (next.trim().length < 2) {
              setResults([]);
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
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
          aria-describedby={isPending ? `${listId}-status` : undefined}
          className="home-search-input"
          autoComplete="off"
        />
        {isPending ? (
          <span
            id={`${listId}-status`}
            className="home-search-status"
            aria-live="polite"
          >
            <Loader2 className="home-search-spinner h-4 w-4" aria-hidden />
            <span className="sr-only">Searching</span>
          </span>
        ) : null}
        <button type="submit" className="btn-primary home-search-submit">
          Search
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
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                >
                  <span className="home-search-result-category">{label}</span>
                  <span className="home-search-result-name">{hit.name}</span>
                  {hit.snippet ? (
                    <span className="home-search-result-snippet">
                      {hit.snippet}…
                    </span>
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
