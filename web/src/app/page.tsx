import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { HomeSearch } from "@/components/home-search";
import { buildPageMetadata, DEFAULT_DESCRIPTION } from "@/lib/seo";

export const metadata = buildPageMetadata({
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <h1>Arcane Archives</h1>
        <p>
          Your gateway to D&D 3.5 Edition — browse spells, feats, monsters,
          classes, and thousands more entries from across the multiverse.
        </p>
        <HomeSearch />
      </section>

      <section className="category-grid">
        {CATEGORIES.map((cat) => (
          <Link key={cat.key} href={`/${cat.key}`} className="category-card">
            <div className="icon">{cat.icon}</div>
            <h3>{cat.label}</h3>
            <span className="count">{cat.count.toLocaleString()} entries</span>
          </Link>
        ))}
      </section>
    </>
  );
}
