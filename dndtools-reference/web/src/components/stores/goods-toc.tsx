"use client";

type TocSection = {
  slug: string;
  label: string;
  itemCount?: number;
};

function TocList({
  sections,
  activeSection,
}: {
  sections: TocSection[];
  activeSection?: string | null;
}) {
  return (
    <ul>
      {sections.map((section) => (
        <li key={section.slug}>
          <a
            href={`#${section.slug}`}
            className={activeSection === section.slug ? "active" : undefined}
          >
            <span className="goods-toc-label">{section.label}</span>
            {section.itemCount !== undefined && section.itemCount > 0 && (
              <span className="goods-toc-count">{section.itemCount}</span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function GoodsToc({
  sections,
  activeSection,
}: {
  sections: TocSection[];
  activeSection?: string | null;
}) {
  return (
    <>
      <nav className="goods-toc goods-toc--desktop" aria-label="Goods sections">
        <h2 className="goods-toc-title">Sections</h2>
        <TocList sections={sections} activeSection={activeSection} />
      </nav>

      <details className="goods-toc-mobile">
        <summary>Jump to section</summary>
        <nav aria-label="Goods sections">
          <TocList sections={sections} activeSection={activeSection} />
        </nav>
      </details>
    </>
  );
}
