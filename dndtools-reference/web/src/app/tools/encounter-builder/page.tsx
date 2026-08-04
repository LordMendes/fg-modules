import Link from "next/link";
import { EncounterBuilderContent } from "@/components/encounter/encounter-builder-content";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

const TOOL_PATH = "/tools/encounter-builder";
const TOOL_NAME = "Encounter Builder";
const TOOL_DESCRIPTION =
  "Build D&D 3.5 encounters from the monster compendium, calculate Encounter Level (EL), and save encounters for later.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function EncounterBuilderPage() {
  return (
    <>
      <JsonLd
        data={toolPageJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
            { name: TOOL_NAME, path: TOOL_PATH },
          ],
          {
            name: TOOL_NAME,
            description: TOOL_DESCRIPTION,
            url: absoluteUrl(TOOL_PATH),
          },
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
          the calculated Encounter Level (EL) against your target difficulty.
          Saved encounters are stored in your browser.
        </p>
        <p>
          <Link href="/monsters" className="tool-btn-primary">
            Build encounter
          </Link>
        </p>
      </div>

      <EncounterBuilderContent />
    </>
  );
}
