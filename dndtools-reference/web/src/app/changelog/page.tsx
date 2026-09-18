import Link from "next/link";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { CHANGELOG } from "@/lib/changelog";
import { absoluteUrl, buildPageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Changelog",
  description: `Release history and notable updates to ${SITE_NAME}.`,
  path: "/changelog",
});

export default function ChangelogPage() {
  return (
    <>
      <JsonLd
        data={absoluteBreadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Changelog", path: "/changelog" },
          ],
          absoluteUrl,
        )}
      />
      <article className="privacy-page">
        <header className="page-header">
          <h1>Changelog</h1>
          <p>Notable site releases and feature updates for {SITE_NAME}.</p>
        </header>

        <section className="privacy-section">
          <ol className="changelog-list">
            {CHANGELOG.map((entry) => (
              <li key={entry.date + entry.title}>
                <time dateTime={entry.date}>{entry.date}</time>
                <h2>{entry.title}</h2>
                <p>{entry.summary}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="privacy-section">
          <p>
            Data imports from sourcebooks are not listed here. See{" "}
            <Link href="/about">About</Link> for how entries are sourced.
          </p>
        </section>
      </article>
    </>
  );
}
