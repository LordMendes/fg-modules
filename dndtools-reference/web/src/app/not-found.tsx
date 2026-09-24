import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import {
  ErrorPageLayout,
  NOT_FOUND_ILLUSTRATION,
} from "@/components/error-page-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <ErrorPageLayout
      code="404"
      title="Page not found"
      description="The page you requested does not exist or may have been moved."
      illustration={NOT_FOUND_ILLUSTRATION}
    >
      <Link href="/" className="btn-primary">
        Return home
      </Link>
      <Link href="/search" className="btn-ghost">
        Search
      </Link>
      <nav aria-label="Helpful links" className="error-page-categories">
        <ul className="category-grid">
          {CATEGORIES.slice(0, 6).map((cat) => (
            <li key={cat.key}>
              <Link href={`/${cat.key}`}>{cat.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </ErrorPageLayout>
  );
}
