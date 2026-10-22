import Link from "next/link";
import { Suspense } from "react";
import { EncounterGenerator } from "@/components/tools/encounter-generator";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("encounter-generator");

const TOOL_PATH = "/tools/encounter-generator";
const TOOL_NAME = "Encounter Generator";
const TOOL_DESCRIPTION =
  "Pick a wilderness or planar encounter by level, climate, and terrain, then see its EL and XP.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function EncounterGeneratorPage() {
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
          faqs,
        )}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/tools">Tools</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Encounter Generator</span>
      </nav>

      <div className="page-header">
        <h1>Encounter Generator</h1>
        <p>
          Build a random encounter for a target encounter level using locale
          filters from the <em>Dungeon Master&apos;s Guide</em>. Set party size
          and level to see XP awards without changing the selected monsters.
        </p>
      </div>

      <Suspense fallback={null}>
        <EncounterGenerator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
