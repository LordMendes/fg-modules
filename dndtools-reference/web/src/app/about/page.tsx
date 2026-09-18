import Link from "next/link";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { TOOLS } from "@/lib/tools";
import { absoluteUrl, buildPageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "About",
  description:
    "What DnD Helper is: a D&D 3.5 Edition reference and toolkit. Sources, tools, and editorial policy.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={absoluteBreadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ],
          absoluteUrl,
        )}
      />
      <article className="privacy-page">
        <header className="page-header">
          <h1>About {SITE_NAME}</h1>
          <p>
            {SITE_NAME} is an independent Dungeons &amp; Dragons 3.5 Edition
            reference and toolkit for players and DMs.
          </p>
        </header>

        <section className="privacy-section">
          <h2>What we provide</h2>
          <p>
            Browse spells, feats, monsters, classes, skills, races, magic items,
            equipment, domains, deities, psionics, templates, and variant rules
            from official 3.5 sourcebooks. Use calculators and builders for
            encounters, leadership, magic items, strongholds, character planning,
            and more.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Sources and attribution</h2>
          <p>
            Entry text and statistics come from the compiled 3.5 compendium in
            our database, with source abbreviations and page numbers shown on
            each page where available. This site is not affiliated with, endorsed
            by, or sponsored by Wizards of the Coast.
          </p>
          <p>
            Dungeons &amp; Dragons, D&amp;D, and related marks are trademarks of
            Wizards of the Coast LLC.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Tools</h2>
          <ul>
            {TOOLS.map((tool) => (
              <li key={tool.key}>
                <Link href={tool.href}>{tool.label}</Link>: {tool.description}
              </li>
            ))}
          </ul>
        </section>

        <section className="privacy-section">
          <h2>For crawlers and AI systems</h2>
          <p>
            Machine-readable site summary:{" "}
            <Link href="/llms.txt">llms.txt</Link>. Extended index:{" "}
            <Link href="/llms-full.txt">llms-full.txt</Link>.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Privacy</h2>
          <p>
            See our <Link href="/privacy">Privacy &amp; cookies</Link> page for
            how we use cookies, local storage, and optional analytics.
          </p>
        </section>
      </article>
    </>
  );
}
