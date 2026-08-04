import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="page-header">
      <h1>Page not found</h1>
      <p>The page you requested does not exist or may have been moved.</p>
      <nav aria-label="Helpful links">
        <p>
          <Link href="/">Return home</Link>
          {" · "}
          <Link href="/search">Search</Link>
        </p>
        <ul className="category-grid" style={{ marginTop: "1.5rem" }}>
          {CATEGORIES.slice(0, 6).map((cat) => (
            <li key={cat.key}>
              <Link href={`/${cat.key}`}>{cat.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
