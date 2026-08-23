import Link from "next/link";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { getCategoryCounts, getGoodsItemCount, listSources } from "@/lib/entities";
import {
  BROWSE_GROUPS,
  GOODS_LINK,
  HOME_GAME_TOOLS_SECTION,
  type BrowseGroup,
} from "@/lib/nav";
import { TOOLS } from "@/lib/tools";
import { HomeSearch } from "@/components/home-search";
import { HomeHeroActions } from "@/components/home-hero-actions";
import { buildPageMetadata, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata = buildPageMetadata({
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

export default async function HomePage() {
  const [counts, sources, goodsCount] = await Promise.all([
    getCategoryCounts(),
    listSources(),
    getGoodsItemCount(),
  ]);

  const sourcesByEdition = sources.reduce<
    Record<string, typeof sources>
  >((acc, source) => {
    if (!acc[source.edition]) acc[source.edition] = [];
    acc[source.edition]!.push(source);
    return acc;
  }, {});

  const categoryByKey = Object.fromEntries(
    CATEGORIES.map((cat) => [cat.key, cat]),
  ) as Record<CategoryKey, (typeof CATEGORIES)[number]>;

  const goodsCountLabel = `${goodsCount.toLocaleString()} items`;

  const groupByLabel = Object.fromEntries(
    BROWSE_GROUPS.map((group) => [group.label, group]),
  ) as Record<string, BrowseGroup>;

  function renderBrowseGroup(group: BrowseGroup) {
    const categoryCount =
      group.label === "Gear"
        ? group.items.length + 1
        : group.items.length;

    return (
      <section
        key={group.label}
        className="browse-section"
        aria-labelledby={`browse-${group.label.toLowerCase()}-heading`}
      >
        <header className="browse-section-header">
          <div className="browse-section-heading">
            <h2 id={`browse-${group.label.toLowerCase()}-heading`}>
              {group.label}
            </h2>
            <p className="browse-section-desc">{group.description}</p>
          </div>
          <span className="browse-section-count">
            {categoryCount}{" "}
            {categoryCount === 1 ? "category" : "categories"}
          </span>
        </header>
        <div className="category-grid">
          {group.items.map((item) => {
            const cat = categoryByKey[item.key as CategoryKey];
            if (!cat) return null;
            const count = counts[cat.key].toLocaleString();
            return (
              <Link
                key={cat.key}
                href={`/${cat.key}`}
                className="category-card"
                aria-label={`${cat.label}, ${count} entries`}
              >
                <div className="icon">{cat.icon}</div>
                <h3>{cat.label}</h3>
                <span className="count">{count} entries</span>
              </Link>
            );
          })}
          {group.label === "Gear" ? (
            <Link
              href={GOODS_LINK.href}
              className="category-card"
              aria-label={`${GOODS_LINK.label}, ${goodsCountLabel}`}
            >
              <div className="icon">{GOODS_LINK.icon}</div>
              <h3>{GOODS_LINK.label}</h3>
              <span className="count">{goodsCountLabel}</span>
              <p className="tool-card-desc">{GOODS_LINK.description}</p>
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="hero">
        <h1>{SITE_NAME}</h1>
        <p>
          Your gateway to D&amp;D 3.5 Edition — browse spells, feats, monsters,
          classes, and thousands more entries from across the multiverse.
        </p>
        <HomeSearch />
        <HomeHeroActions sourcesByEdition={sourcesByEdition} />
      </section>

      <div className="home-browse">
        {renderBrowseGroup(groupByLabel.Core!)}
        {renderBrowseGroup(groupByLabel.Gear!)}

        <section
          className="browse-section"
          aria-labelledby="browse-game-tools-heading"
        >
          <header className="browse-section-header">
            <div className="browse-section-heading">
              <h2 id="browse-game-tools-heading">
                {HOME_GAME_TOOLS_SECTION.label}
              </h2>
              <p className="browse-section-desc">
                {HOME_GAME_TOOLS_SECTION.description}
              </p>
            </div>
            <span className="browse-section-count">
              {TOOLS.length} {TOOLS.length === 1 ? "tool" : "tools"}
            </span>
          </header>
          <div className="category-grid">
            {TOOLS.map((tool) => (
              <Link
                key={tool.key}
                href={tool.href}
                className="category-card"
                aria-label={tool.label}
              >
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
            ))}
          </div>
        </section>

        {renderBrowseGroup(groupByLabel.World!)}
      </div>
    </>
  );
}
