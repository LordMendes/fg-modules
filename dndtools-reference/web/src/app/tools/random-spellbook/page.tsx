import Link from "next/link";
import { Suspense } from "react";
import { RandomSpellbook } from "@/components/tools/random-spellbook";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { listWizardSpellSources } from "@/lib/entities";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

const TOOL_PATH = "/tools/random-spellbook";
const TOOL_NAME = "Random Spellbook";
const TOOL_DESCRIPTION =
  "Generate a D&D 3.5 wizard spellbook and a level-proportional wishlist from selected compendium sources, with optional specialization and prohibited schools.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default async function RandomSpellbookPage() {
  const sourceOptions = await listWizardSpellSources();
  const defaultSources = sourceOptions.some((source) => source.abbrev === "PH")
    ? ["PH"]
    : sourceOptions[0]
      ? [sourceOptions[0].abbrev]
      : [];

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
        <span aria-current="page">{TOOL_NAME}</span>
      </nav>

      <div className="page-header">
        <h1>{TOOL_NAME}</h1>
        <p>
          Invent the contents of a wizard&apos;s spellbook for D&amp;D 3.5. Choose level, Intelligence
          modifier, and sources to get a spellbook plus spells of interest for scrolls, teachers, or
          looted towers.
        </p>
      </div>

      <Suspense fallback={null}>
        <RandomSpellbook sourceOptions={sourceOptions} defaultSources={defaultSources} />
      </Suspense>
    </>
  );
}
