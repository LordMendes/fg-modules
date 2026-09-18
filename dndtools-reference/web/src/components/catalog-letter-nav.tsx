import Link from "next/link";
import type { CategoryKey } from "@/lib/categories";
import {
  CATALOG_LETTERS,
  catalogLetterHref,
  catalogLetterLabel,
} from "@/lib/catalog";

export function CatalogLetterNav({
  category,
  activeLetter,
}: {
  category: CategoryKey;
  activeLetter?: string;
}) {
  return (
    <nav className="catalog-letter-nav" aria-label="A-Z catalog index">
      {CATALOG_LETTERS.map((letter) => {
        const href = catalogLetterHref(category, letter);
        const isActive = activeLetter === letter;
        return (
          <Link
            key={letter}
            href={href}
            className={`catalog-letter-link${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {catalogLetterLabel(letter)}
          </Link>
        );
      })}
    </nav>
  );
}
