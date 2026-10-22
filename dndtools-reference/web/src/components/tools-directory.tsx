"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { filterTools, groupTools, TOOLS, type Tool } from "@/lib/tools";

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link href={tool.href} className="category-card">
      <div className="icon">{tool.icon}</div>
      <h3>
        {tool.label}
        {"badge" in tool && tool.badge ? (
          <span className="tool-badge">{tool.badge}</span>
        ) : null}
      </h3>
      <span className="count">{tool.source}</span>
      <p className="tool-card-desc">{tool.description}</p>
    </Link>
  );
}

export function ToolsDirectory() {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => filterTools(query, TOOLS), [query]);
  const groups = useMemo(() => groupTools(matches), [matches]);

  return (
    <div className="tools-directory">
      <div className="filter-search tools-directory-search">
        <label htmlFor="tools-search" className="tool-label">
          Search tools
        </label>
        <div className="filter-search-input">
          <Search size={16} aria-hidden="true" />
          <input
            id="tools-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, source, or group…"
            aria-label="Search tools"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="tools-directory-empty" role="status">
          No tools match that search.
        </p>
      ) : (
        groups.map((group) => (
          <section
            key={group.id}
            className="tools-directory-group"
            aria-labelledby={`tools-group-${group.id}`}
          >
            <header className="browse-section-header">
              <div className="browse-section-heading">
                <h2 id={`tools-group-${group.id}`}>{group.label}</h2>
              </div>
              <span className="browse-section-count">
                {group.tools.length}{" "}
                {group.tools.length === 1 ? "tool" : "tools"}
              </span>
            </header>
            <div className="category-grid">
              {group.tools.map((tool) => (
                <ToolCard key={tool.key} tool={tool} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
