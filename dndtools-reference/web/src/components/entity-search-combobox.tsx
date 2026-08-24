"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useSessionNonce } from "@/components/session-provider";
import { fetchClassSpellsAtLevel, paginateEntities } from "@/actions/data";
import type { CategoryKey } from "@/lib/categories";

export type EntitySearchHit = {
  slug: string;
  name: string;
  sourceAbbrev?: string | null;
};

const DEBOUNCE_MS = 250;

type EntitySearchComboboxProps = {
  categories: CategoryKey[];
  onSelect: (hit: EntitySearchHit) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  /** Limit spell search to a class spell list at a specific level. */
  spellFilter?: { classSlug: string; level: number };
};

function spellFilterKey(classSlug: string, level: number) {
  return `${classSlug}:${level}`;
}

export function EntitySearchCombobox({
  categories,
  onSelect,
  placeholder = "Search compendium…",
  label = "Search compendium",
  className,
  spellFilter,
}: EntitySearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntitySearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
  const nonce = useSessionNonce();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const requestId = useRef(0);
  const spellCacheRef = useRef<Map<string, EntitySearchHit[]>>(new Map());

  const spellClassSlug = spellFilter?.classSlug;
  const spellLevel = spellFilter?.level;
  const categoriesKey = categories.join(",");

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
        if (spellClassSlug != null && spellLevel != null) {
          const cacheKey = spellFilterKey(spellClassSlug, spellLevel);
          let spells = spellCacheRef.current.get(cacheKey);
          if (!spells) {
            const result = await fetchClassSpellsAtLevel({
              classSlug: spellClassSlug,
              level: spellLevel,
              nonce,
            });
            if (id !== requestId.current) return;
            if (!result.success || !result.spells) {
              if (result.error === "Invalid session") router.refresh();
              setResults([]);
              setOpen(false);
              setActiveIndex(-1);
              return;
            }
            spells = result.spells.map((spell) => ({
              slug: spell.slug,
              name: spell.name,
              sourceAbbrev: spell.sourceAbbrev,
            }));
            spellCacheRef.current.set(cacheKey, spells);
          }

          const needle = trimmed.toLowerCase();
          const hits = spells
            .filter((spell) => spell.name.toLowerCase().includes(needle))
            .slice(0, 20);
          if (id !== requestId.current) return;
          setResults(hits);
          setOpen(hits.length > 0);
          setActiveIndex(-1);
          return;
        }

        const hits: EntitySearchHit[] = [];
        for (const category of categories) {
          const result = await paginateEntities({
            category,
            nonce,
            search: trimmed,
          });
          if (id !== requestId.current) return;
          if (!result.success) {
            if (result.error === "Invalid session") router.refresh();
            continue;
          }
          if (!result.items) continue;
          for (const item of result.items) {
            hits.push({
              slug: item.slug,
              name: item.name,
              sourceAbbrev: item.sourceAbbrev,
            });
            if (hits.length >= 20) break;
          }
          if (hits.length >= 20) break;
        }
        if (id !== requestId.current) return;
        setResults(hits);
        setOpen(hits.length > 0);
        setActiveIndex(-1);
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, nonce, categoriesKey, categories, spellClassSlug, spellLevel, router]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectHit(hit: EntitySearchHit) {
    onSelect(hit);
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      selectHit(results[activeIndex]);
    }
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
    } else if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      selectHit(results[activeIndex]);
    }
  }

  return (
    <div
      className={["home-search entity-search-combobox", open ? "is-open" : "", className]
        .filter(Boolean)
        .join(" ")}
      ref={rootRef}
    >
      <form onSubmit={handleSubmit} className="home-search-form" role="search">
        <Search className="home-search-icon h-5 w-5" aria-hidden />
        <input
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
          placeholder={placeholder}
          aria-label={label}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          className="home-search-input"
          autoComplete="off"
        />
        {isPending && <span className="home-search-pending" aria-hidden />}
      </form>
      {open && results.length > 0 && (
        <ul id={listId} className="home-search-results" role="listbox">
          {results.map((hit, index) => (
            <li key={`${hit.slug}-${index}`} role="presentation">
              <button
                type="button"
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={
                  index === activeIndex
                    ? "home-search-result is-active"
                    : "home-search-result"
                }
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectHit(hit)}
              >
                <span className="home-search-result-name">{hit.name}</span>
                {hit.sourceAbbrev && (
                  <span className="home-search-result-meta">{hit.sourceAbbrev}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
