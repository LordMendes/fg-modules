"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { searchPcPlans, type PcPlanSummary } from "@/actions/pc-plans";

const DEBOUNCE_MS = 250;

export function PcShortcutSearch({
  onSelect,
  placeholder = "PC shortcut search (e.g. hwizard, wizard 3)…",
}: {
  onSelect: (plan: PcPlanSummary) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PcPlanSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const timer = window.setTimeout(() => {
      const id = ++requestId.current;
      startTransition(async () => {
        try {
          const hits = await searchPcPlans(trimmed);
          if (id !== requestId.current) return;
          setResults(hits);
          setOpen(hits.length > 0);
          setActiveIndex(-1);
        } catch {
          if (id !== requestId.current) return;
          setResults([]);
          setOpen(false);
        }
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectPlan(plan: PcPlanSummary) {
    onSelect(plan);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      selectPlan(results[activeIndex]);
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
      selectPlan(results[activeIndex]);
    }
  }

  return (
    <div
      className={["home-search pc-shortcut-search", open ? "is-open" : ""].join(" ")}
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
            if (next.trim().length < 1) {
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
          aria-label="Search saved PC plans"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          className="home-search-input"
          autoComplete="off"
        />
        {isPending && <span className="home-search-pending" aria-hidden />}
      </form>
      {open && results.length > 0 && (
        <ul id={listId} className="home-search-results" role="listbox">
          {results.map((plan, index) => (
            <li key={plan.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={
                  index === activeIndex
                    ? "home-search-result is-active"
                    : "home-search-result"
                }
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPlan(plan)}
              >
                <span className="home-search-result-name">{plan.name}</span>
                <span className="home-search-result-meta">
                  {plan.classSummary} · {plan.slotSummary}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
