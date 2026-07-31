import Link from "next/link";
import { EncounterSavedList } from "@/components/encounter/encounter-saved-list";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Encounter Builder",
  description:
    "Build D&D 3.5 encounters from the monster compendium, calculate Encounter Level (EL), and save encounters for later.",
  path: "/tools/encounter-builder",
});

export default function EncounterBuilderPage() {
  return (
    <>
      <JsonLd
        data={absoluteBreadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
            { name: "Encounter Builder", path: "/tools/encounter-builder" },
          ],
          absoluteUrl,
        )}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/tools">Tools</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Encounter Builder</span>
      </nav>

      <div className="page-header">
        <h1>Encounter Builder</h1>
        <p>
          Browse the monster compendium, add creatures to an encounter, and see
          the calculated Encounter Level (EL). Saved encounters are stored in
          your browser.
        </p>
        <p>
          <Link href="/monsters" className="tool-btn-primary">
            Build encounter
          </Link>
        </p>
      </div>

      <EncounterSavedList />
    </>
  );
}
