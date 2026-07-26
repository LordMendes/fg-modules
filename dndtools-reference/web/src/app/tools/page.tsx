import Link from "next/link";
import { TOOLS } from "@/lib/tools";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Tools",
  description:
    "Interactive D&D 3.5 Edition utilities — stronghold building, and more.",
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <>
      <JsonLd
        data={absoluteBreadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
          ],
          absoluteUrl,
        )}
      />
      <div className="page-header">
        <h1>Tools</h1>
        <p>
          Interactive utilities for D&amp;D 3.5 Edition — calculators and
          builders based on official rulebooks.
        </p>
      </div>

      <section className="category-grid" aria-labelledby="tools-list-heading">
        <h2 id="tools-list-heading" className="sr-only">
          Available tools
        </h2>
        {TOOLS.map((tool) => (
          <Link key={tool.key} href={tool.href} className="category-card">
            <div className="icon">{tool.icon}</div>
            <h3>{tool.label}</h3>
            <span className="count">{tool.source}</span>
            <p className="tool-card-desc">{tool.description}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
